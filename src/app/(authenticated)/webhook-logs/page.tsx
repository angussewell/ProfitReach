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
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState('all');
  const [selectedScenario, setSelectedScenario] = React.useState('all');
  const [showMessageOnly, setShowMessageOnly] = React.useState(false);
  const { toast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });

      if (searchQuery) {
        searchParams.append('search', searchQuery);
      }

      if (selectedStatus && selectedStatus !== 'all') {
        searchParams.append('status', selectedStatus);
      }

      if (selectedScenario && selectedScenario !== 'all') {
        searchParams.append('scenario', selectedScenario);
      }

      if (showMessageOnly) {
        searchParams.append('hasMessage', 'true');
      }

      const response = await fetch(`/api/webhook-logs?${searchParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      const newData = await response.json();
      setData(newData);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch logs. Please try again.",
        variant: "destructive"
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
            variant="outline"
            className="h-12 px-6 border-2 border-slate-200 hover:border-red-500 hover:text-red-500 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Select
            value={selectedStatus}
            onValueChange={(value) => {
              setSelectedStatus(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-12 px-6 border-2 border-slate-200 hover:border-red-500 focus:border-red-500 focus:ring-red-100 transition-all duration-200 shadow-sm hover:shadow-md bg-white rounded-xl min-w-[150px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="testing">Testing</SelectItem>
            </SelectContent>
          </Select>

          {data?.scenarios && data.scenarios.length > 0 && (
            <Select
              value={selectedScenario}
              onValueChange={(value) => {
                setSelectedScenario(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-12 px-6 border-2 border-slate-200 hover:border-red-500 focus:border-red-500 focus:ring-red-100 transition-all duration-200 shadow-sm hover:shadow-md bg-white rounded-xl min-w-[150px]">
                <SelectValue placeholder="Filter by scenario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scenarios</SelectItem>
                {data.scenarios.map((scenario) => (
                  <SelectItem key={scenario} value={scenario}>
                    {scenario}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            onClick={() => {
              setShowMessageOnly(!showMessageOnly);
              setCurrentPage(1);
            }}
            variant={showMessageOnly ? "default" : "outline"}
            className={`h-12 px-6 border-2 transition-all duration-200 shadow-sm hover:shadow-md ${
              showMessageOnly
                ? 'border-red-500 bg-red-500 text-white hover:bg-red-600 hover:border-red-600'
                : 'border-slate-200 hover:border-red-500 hover:text-red-500'
            }`}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Show Messages Only
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scenario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-40" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    </tr>
                  ))
                ) : data?.logs.map((log) => (
                  <tr key={log.id} className={`hover:bg-gray-50 ${hasMessageContent(log) ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.createdAt}
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

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  className="h-9 px-4"
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {data.totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(data.totalPages, prev + 1))}
                  disabled={currentPage === data.totalPages}
                  variant="outline"
                  className="h-9 px-4"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}