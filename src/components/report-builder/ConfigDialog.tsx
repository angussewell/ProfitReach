'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReportBuilderConfig, CreateReportBuilderConfigRequest, UpdateReportBuilderConfigRequest } from '@/types/report-builder';

interface ConfigDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateReportBuilderConfigRequest | UpdateReportBuilderConfigRequest) => Promise<void>;
  config?: ReportBuilderConfig;
  isLoading?: boolean;
}

export default function ConfigDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  config,
  isLoading = false
}: ConfigDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    webhookUrl: '',
    notificationEmail: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEditing = Boolean(config);

  // Initialize form data when config changes
  useEffect(() => {
    if (config) {
      setFormData({
        name: config.name,
        webhookUrl: config.webhookUrl,
        notificationEmail: config.notificationEmail
      });
    } else {
      setFormData({
        name: '',
        webhookUrl: '',
        notificationEmail: ''
      });
    }
    setErrors({});
  }, [config, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Configuration name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Configuration name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Configuration name must be less than 100 characters';
    }

    // Webhook URL validation
    if (!formData.webhookUrl.trim()) {
      newErrors.webhookUrl = 'Webhook URL is required';
    } else {
      try {
        const url = new URL(formData.webhookUrl.trim());
        if (!['http:', 'https:'].includes(url.protocol)) {
          newErrors.webhookUrl = 'Webhook URL must use HTTP or HTTPS protocol';
        }
      } catch {
        newErrors.webhookUrl = 'Please enter a valid URL (e.g., https://example.com/webhook)';
      }
    }

    // Email validation
    if (!formData.notificationEmail.trim()) {
      newErrors.notificationEmail = 'Notification email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.notificationEmail.trim())) {
        newErrors.notificationEmail = 'Please enter a valid email address';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const submitData = {
        name: formData.name.trim(),
        webhookUrl: formData.webhookUrl.trim(),
        notificationEmail: formData.notificationEmail.trim()
      };

      await onSubmit(submitData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Report Configuration' : 'Create New Report Configuration'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the configuration details below.'
              : 'Create a new webhook configuration for sending contact reports.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Configuration Name</Label>
            <Input
              id="name"
              placeholder="e.g., Lead Qualification Workflow"
              value={formData.name}
              onChange={handleInputChange('name')}
              disabled={isLoading}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <Input
              id="webhookUrl"
              placeholder="https://example.com/webhook"
              value={formData.webhookUrl}
              onChange={handleInputChange('webhookUrl')}
              disabled={isLoading}
              className={errors.webhookUrl ? 'border-red-500' : ''}
            />
            {errors.webhookUrl && (
              <p className="text-sm text-red-600">{errors.webhookUrl}</p>
            )}
            <p className="text-sm text-gray-500">
              The endpoint where contact data will be sent via POST request
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notificationEmail">Notification Email</Label>
            <Input
              id="notificationEmail"
              type="email"
              placeholder="notifications@example.com"
              value={formData.notificationEmail}
              onChange={handleInputChange('notificationEmail')}
              disabled={isLoading}
              className={errors.notificationEmail ? 'border-red-500' : ''}
            />
            {errors.notificationEmail && (
              <p className="text-sm text-red-600">{errors.notificationEmail}</p>
            )}
            <p className="text-sm text-gray-500">
              Email address to notify when reports are sent
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border border-gray-300 border-t-gray-600 rounded-full mr-2"></div>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Update Configuration' : 'Create Configuration'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}