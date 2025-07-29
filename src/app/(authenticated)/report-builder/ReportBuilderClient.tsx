'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Plus, Edit2, Trash2, Send, ExternalLink, Clock, CheckCircle, XCircle, History } from 'lucide-react';
import { 
  ReportBuilderConfig, 
  CreateReportBuilderConfigRequest, 
  UpdateReportBuilderConfigRequest,
  SendReportRequest,
  ReportHistoryWithRelations,
  ReportHistoryResponse
} from '@/types/report-builder';
import ConfigDialog from '@/components/report-builder/ConfigDialog';
import ContactSelector from '@/components/report-builder/ContactSelector';
import { useToast } from '@/components/ui/use-toast';

export default function ReportBuilderClient() {
  const { toast } = useToast();
  
  // State for configurations
  const [configs, setConfigs] = useState<ReportBuilderConfig[]>([]);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);
  
  // State for dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ReportBuilderConfig | undefined>();
  const [isSubmittingConfig, setIsSubmittingConfig] = useState(false);
  
  // State for report generation
  const [selectedConfigId, setSelectedConfigId] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [isSendingReport, setIsSendingReport] = useState(false);

  // State for report history
  const [history, setHistory] = useState<ReportHistoryWithRelations[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  // Fetch configurations
  const fetchConfigs = useCallback(async () => {
    try {
      setIsLoadingConfigs(true);
      const response = await fetch('/api/report-builder/configs');
      if (response.ok) {
        const data = await response.json();
        setConfigs(data);
      } else {
        throw new Error('Failed to fetch configurations');
      }
    } catch (error) {
      console.error('Error fetching configs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report configurations',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingConfigs(false);
    }
  }, [toast]);

  // Fetch report history
  const fetchHistory = useCallback(async (page = 1) => {
    try {
      setIsLoadingHistory(true);
      const response = await fetch(`/api/report-builder/history?page=${page}&limit=10`);
      if (response.ok) {
        const data: ReportHistoryResponse = await response.json();
        setHistory(data.history);
        setHistoryPage(data.pagination.currentPage);
        setHistoryTotalPages(data.pagination.totalPages);
      } else {
        throw new Error('Failed to fetch report history');
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report history',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingHistory(false);
    }
  }, [toast]);

  // Load configurations and history on mount
  useEffect(() => {
    fetchConfigs();
    fetchHistory();
  }, [fetchConfigs, fetchHistory]);

  // Handle create/update config
  const handleConfigSubmit = async (data: CreateReportBuilderConfigRequest | UpdateReportBuilderConfigRequest) => {
    try {
      setIsSubmittingConfig(true);
      
      const url = editingConfig 
        ? `/api/report-builder/configs/${editingConfig.id}`
        : '/api/report-builder/configs';
      
      const method = editingConfig ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Configuration ${editingConfig ? 'updated' : 'created'} successfully`,
        });
        await fetchConfigs();
        setEditingConfig(undefined);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingConfig(false);
    }
  };

  // Handle delete config
  const handleDeleteConfig = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/report-builder/configs/${configId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Configuration deleted successfully',
        });
        await fetchConfigs();
        
        // Clear selection if deleted config was selected
        if (selectedConfigId === configId) {
          setSelectedConfigId('');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete configuration');
      }
    } catch (error) {
      console.error('Error deleting config:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete configuration',
        variant: 'destructive',
      });
    }
  };

  // Handle send report
  const handleSendReport = async () => {
    if (!selectedConfigId || !selectedContactId) {
      toast({
        title: 'Error',
        description: 'Please select both a configuration and a contact',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSendingReport(true);
      
      const payload: SendReportRequest = {
        reportConfigId: selectedConfigId,
        contactId: selectedContactId,
        customNotes: customNotes.trim(),
      };

      const response = await fetch('/api/report-builder/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: 'Report Sent Successfully',
          description: 'The contact data has been sent to the configured webhook',
        });
        
        // Clear the form and refresh history
        setSelectedContactId('');
        setCustomNotes('');
        await fetchHistory(1); // Refresh history to show the new report
      } else {
        throw new Error(result.message || 'Failed to send report');
      }
    } catch (error) {
      console.error('Error sending report:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send report',
        variant: 'destructive',
      });
    } finally {
      setIsSendingReport(false);
    }
  };

  // Open dialog for create
  const handleCreateConfig = () => {
    setEditingConfig(undefined);
    setIsDialogOpen(true);
  };

  // Open dialog for edit
  const handleEditConfig = (config: ReportBuilderConfig) => {
    setEditingConfig(config);
    setIsDialogOpen(true);
  };

  // Convert configs to options for SearchableSelect
  const configOptions = configs.map(config => ({
    value: config.id,
    label: config.name
  }));

  const selectedConfig = configs.find(c => c.id === selectedConfigId);

  // Helper function to get status badge
  const getStatusBadge = (status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED') => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'PROCESSING':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            Processing
          </Badge>
        );
      case 'SUCCESS':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Report Builder</h1>
            <p className="text-muted-foreground">
              Create and manage webhook configurations for automated contact reporting
            </p>
          </div>
          <Button onClick={handleCreateConfig}>
            <Plus className="mr-2 h-4 w-4" />
            Create Configuration
          </Button>
        </div>

        {/* Configurations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Report Configurations</CardTitle>
            <CardDescription>
              Manage your webhook configurations for sending contact data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingConfigs ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border border-gray-300 border-t-gray-600 rounded-full"></div>
                <span className="ml-2">Loading configurations...</span>
              </div>
            ) : configs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No configurations found</p>
                <p className="text-sm">Create your first configuration to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Webhook URL</TableHead>
                    <TableHead>Notification Email</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{config.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded truncate max-w-[200px]">
                            {config.webhookUrl}
                          </code>
                          <ExternalLink className="h-3 w-3 text-gray-400" />
                        </div>
                      </TableCell>
                      <TableCell>{config.notificationEmail}</TableCell>
                      <TableCell>
                        {new Date(config.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditConfig(config)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteConfig(config.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Report Generation */}
        <Card>
          <CardHeader>
            <CardTitle>Send Report</CardTitle>
            <CardDescription>
              Select a configuration and contact to send a report via webhook
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="config-select">Report Configuration</Label>
                <SearchableSelect
                  options={configOptions}
                  value={selectedConfigId}
                  onChange={setSelectedConfigId}
                  placeholder="Select a configuration..."
                  emptyMessage="No configurations available"
                />
                {selectedConfig && (
                  <div className="text-sm text-muted-foreground">
                    Will send to: <code className="bg-gray-100 px-1 rounded">{selectedConfig.webhookUrl}</code>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-select">Contact</Label>
                <ContactSelector
                  value={selectedContactId}
                  onChange={setSelectedContactId}
                  placeholder="Search and select a contact..."
                  disabled={!selectedConfigId}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-notes">Custom Notes</Label>
              <Textarea
                id="custom-notes"
                placeholder="Add any custom notes or context for this report..."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                rows={3}
                disabled={!selectedConfigId || !selectedContactId}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSendReport}
                disabled={!selectedConfigId || !selectedContactId || isSendingReport}
                size="lg"
              >
                {isSendingReport ? (
                  <>
                    <div className="animate-spin h-4 w-4 border border-gray-300 border-t-gray-600 rounded-full mr-2"></div>
                    Sending Report...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Report
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Report History
            </CardTitle>
            <CardDescription>
              View all sent reports and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border border-gray-300 border-t-gray-600 rounded-full"></div>
                <span className="ml-2">Loading history...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p>No reports sent yet</p>
                <p className="text-sm">Send your first report to see it appear here</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Configuration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Sent By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Report Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {record.Contacts.fullName || 
                               `${record.Contacts.firstName || ''} ${record.Contacts.lastName || ''}`.trim() ||
                               'Unknown Contact'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {record.Contacts.email || 'No email'}
                            </div>
                            {record.Contacts.currentCompanyName && (
                              <div className="text-sm text-muted-foreground">
                                {record.Contacts.currentCompanyName}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{record.ReportBuilderConfig.name}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {record.ReportBuilderConfig.webhookUrl}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(record.status)}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            {record.customNotes ? (
                              <p className="text-sm truncate" title={record.customNotes}>
                                {record.customNotes}
                              </p>
                            ) : (
                              <span className="text-sm text-muted-foreground">No notes</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {record.User.name || record.User.email || 'Unknown User'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(record.createdAt).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.reportUrl ? (
                            <Button size="sm" asChild>
                              <a href={record.reportUrl} target="_blank" rel="noopener noreferrer">
                                View Report
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </Button>
                          ) : (
                            <Button size="sm" disabled variant="outline">
                              View Report
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {historyTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Page {historyPage} of {historyTotalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchHistory(historyPage - 1)}
                        disabled={historyPage <= 1 || isLoadingHistory}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchHistory(historyPage + 1)}
                        disabled={historyPage >= historyTotalPages || isLoadingHistory}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Config Dialog */}
      <ConfigDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleConfigSubmit}
        config={editingConfig}
        isLoading={isSubmittingConfig}
      />
    </PageContainer>
  );
}