'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Search, RefreshCw, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface WebhookLog {
  id: string;
  status: string;
  scenarioName: string;
  contactEmail: string;
  contactName: string;
  createdAt: string;
  emailSubject?: string;
  emailHtmlBody?: string;
}

interface WebhookLogsResponse {
  logs: WebhookLog[];
  total: number;
  page: number;
  totalPages: number;
  scenarios: string[];
}

export default function WebhookLogsPage() {
  const [data, setData] = React.useState<WebhookLogsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selectedStatus, setSelectedStatus] = React.useState('');
  const [selectedScenario, setSelectedScenario] = React.useState('');
  const [showMessageOnly, setShowMessageOnly] = React.useState(false);
  const isClient = React.useRef(false);
  const { toast } = useToast();

  React.useEffect(() => {
    isClient.current = true;
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchQuery && { search: searchQuery }),
        ...(selectedStatus && selectedStatus !== 'all' && { status: selectedStatus }),
        ...(selectedScenario && selectedScenario !== 'all' && { scenario: selectedScenario }),
        ...(showMessageOnly && { hasMessage: 'true' })
      });

      const response = await fetch(`/api/webhook-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch webhook logs');
      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Error fetching webhook logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load webhook logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchLogs();
  }, [currentPage, searchQuery, selectedStatus, selectedScenario, showMessageOnly]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success': return 'text-green-600';
      case 'blocked': return 'text-yellow-600';
      case 'testing': return 'text-blue-600';
      default: return 'text-red-600';
    }
  };

  const formatDate = (date: string) => {
    if (!isClient.current) return ''; // Return empty on server
    return new Date(date).toLocaleString();
  };

  const hasMessageContent = (log: WebhookLog) => {
    return Boolean(log.emailSubject?.trim()) || Boolean(log.emailHtmlBody?.trim());
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 mx-0 px-8 py-8 rounded-xl shadow-lg">
          <h1 className="text-3xl font-bold text-white mb-2">Message Logs</h1>
          <p className="text-slate-300">Monitor and debug message activity</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 h-12 border-2 border-slate-200 focus:border-red-500 focus:ring-red-100 transition-all duration-200 shadow-sm hover:shadow-md bg-white rounded-xl"
            />
          </div>

          <Button
            onClick={() => {
              setCurrentPage(1);
              fetchLogs();
            }}
            className="bg-red-500 hover:bg-red-600 text-white transition-all duration-200 shadow-sm hover:shadow-md rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            onClick={() => {
              setShowMessageOnly(!showMessageOnly);
              setCurrentPage(1);
            }}
            variant={showMessageOnly ? "default" : "outline"}
            className={showMessageOnly ? "bg-blue-500 hover:bg-blue-600" : ""}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            {showMessageOnly ? "All Logs" : "Message Only"}
          </Button>

          <Select
            value={selectedStatus}
            onValueChange={(value) => {
              setSelectedStatus(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="testing">Testing</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={selectedScenario}
            onValueChange={(value) => {
              setSelectedScenario(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Scenario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scenarios</SelectItem>
              {data?.scenarios.map((scenario) => (
                <SelectItem key={scenario} value={scenario}>
                  {scenario}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Time</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Scenario</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Contact</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Message</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-40" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                      </tr>
                    ))
                  ) : data?.logs.map((log) => (
                    <tr key={log.id} className={`hover:bg-gray-50 ${hasMessageContent(log) ? 'bg-blue-50' : ''}`}>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${getStatusColor(log.status)}`}>
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{log.scenarioName}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">{log.contactName}</div>
                        <div className="text-sm text-gray-400">{log.contactEmail}</div>
                      </td>
                      <td className="px-6 py-4">
                        {hasMessageContent(log) ? (
                          <div className="flex items-center text-blue-500">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            <span className="text-sm font-medium">Yes</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/webhook-logs/${log.id}`}
                          className="text-red-500 hover:text-red-600 text-sm font-medium"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {data && data.totalPages > 1 && (
          <div className="flex justify-center mt-6 gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              title="First Page"
            >
              First
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              title="Previous Page"
            >
              Previous
            </Button>
            <div className="flex items-center gap-2">
              {(() => {
                // Calculate which page numbers to display
                const maxVisiblePages = 5; // Max number of page buttons to show
                let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                let endPage = Math.min(data.totalPages, startPage + maxVisiblePages - 1);
                
                // Adjust if we're near the end
                if (endPage - startPage + 1 < maxVisiblePages) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }
                
                // Create array of pages to display
                const visiblePages = [];
                for (let i = startPage; i <= endPage; i++) {
                  visiblePages.push(i);
                }
                
                // Add ellipsis indicators if needed
                const result = [];
                
                if (startPage > 1) {
                  result.push(
                    <span key="ellipsis-start" className="px-2">...</span>
                  );
                }
                
                visiblePages.forEach(page => {
                  result.push(
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      onClick={() => setCurrentPage(page)}
                      className={currentPage === page ? "bg-red-500 hover:bg-red-600" : ""}
                    >
                      {page}
                    </Button>
                  );
                });
                
                if (endPage < data.totalPages) {
                  result.push(
                    <span key="ellipsis-end" className="px-2">...</span>
                  );
                }
                
                return result;
              })()}
            </div>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(data.totalPages, prev + 1))}
              disabled={currentPage === data.totalPages}
              title="Next Page"
            >
              Next
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(data.totalPages)}
              disabled={currentPage === data.totalPages}
              title="Last Page"
            >
              Last
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 