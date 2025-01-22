'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { LogDetailsDialog } from '@/components/logs/LogDetailsDialog';

interface WebhookLog {
  id: string;
  scenarioName: string;
  contactEmail: string;
  contactName?: string;
  status: string;
  errorMessage?: string;
  requestBody: string;
  responseBody: string;
  createdAt: string;
}

interface LogsResponse {
  logs: WebhookLog[];
  total: number;
  page: number;
  totalPages: number;
  scenarios: string[];
}

export default function LogsPage() {
  const [data, setData] = React.useState<LogsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [selectedScenario, setSelectedScenario] = React.useState<string>('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const { toast } = useToast();

  const fetchLogs = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchQuery && { search: searchQuery }),
        ...(selectedStatus !== 'all' && { status: selectedStatus }),
        ...(selectedScenario !== 'all' && { scenario: selectedScenario }),
        ...(forceRefresh && { refresh: '1' })
      });

      const response = await fetch(`/api/webhook-logs?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      const newData = await response.json();
      setData(newData);
    } catch (error) {
      console.error('Error fetching logs:', error);
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
  }, [currentPage, searchQuery, selectedStatus, selectedScenario]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading && !data) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#33475b] mb-2">Webhook Logs</h1>
            <p className="text-base text-gray-600">Loading logs...</p>
          </div>
          <Button disabled>
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </Button>
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#33475b] mb-2">Webhook Logs</h1>
          <p className="text-base text-gray-600">
            Track and monitor webhook events
          </p>
        </div>
        <Button
          onClick={() => fetchLogs(true)}
          className="bg-[#ff7a59] hover:bg-[#ff957a] text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-gray-200 focus:border-[#ff7a59] focus:ring-[#ff7a59]"
          />
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        {data?.scenarios && (
          <Select value={selectedScenario} onValueChange={setSelectedScenario}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by scenario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All scenarios</SelectItem>
              {data.scenarios
                .filter(scenario => scenario && scenario.trim() !== '')
                .map((scenario) => (
                <SelectItem key={scenario} value={scenario}>
                  {scenario}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Scenario</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center">
                      {log.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                      ) : log.status === 'blocked' ? (
                        <AlertCircle className="w-4 h-4 text-yellow-500 mr-2" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                      )}
                      <span className={
                        log.status === 'success' ? 'text-green-600' : 
                        log.status === 'blocked' ? 'text-yellow-600' :
                        'text-red-600'
                      }>
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{log.scenarioName}</TableCell>
                  <TableCell>
                    <div>
                      {log.contactName && (
                        <div className="text-sm font-medium">{log.contactName}</div>
                      )}
                      <div className="text-sm text-gray-500">{log.contactEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {formatDate(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <LogDetailsDialog log={log} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div className="flex items-center gap-2">
            {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                onClick={() => setCurrentPage(page)}
                className={currentPage === page ? 'bg-[#ff7a59] text-white' : ''}
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.min(data.totalPages, p + 1))}
            disabled={currentPage === data.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
} 