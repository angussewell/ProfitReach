'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, PlusCircle, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDateInCentralTime } from '@/lib/date-utils';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';

// Define time zones
const TIME_ZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
];

// Define time options in 30-minute increments
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return {
    value: `${hour.toString().padStart(2, '0')}:${minute}`,
    label: `${displayHour}:${minute} ${period}`
  };
});

interface EmailAccount {
  id: string;
  name: string;
  email: string;
}

interface CreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    clientName: string;
    appointmentType: string;
    appointmentDateTime: string;
    notes?: string;
    status: string;
    timeZone?: string;
    fromEmail?: string;
    recipients?: string[];
  }) => void;
}

export function CreateAppointmentDialog({
  open,
  onOpenChange,
  onSubmit
}: CreateAppointmentDialogProps) {
  const [clientName, setClientName] = React.useState('');
  const [appointmentType, setAppointmentType] = React.useState('sales_appointment');
  const [appointmentDate, setAppointmentDate] = React.useState<Date | undefined>();
  const [appointmentTime, setAppointmentTime] = React.useState('09:00');
  const [timeZone, setTimeZone] = React.useState('America/Chicago');
  const [notes, setNotes] = React.useState('');
  const [status, setStatus] = React.useState('appointment_booked');
  const [emailAccounts, setEmailAccounts] = React.useState<EmailAccount[]>([]);
  const [selectedEmailId, setSelectedEmailId] = React.useState<string>('');
  const [recipients, setRecipients] = React.useState<string[]>([]);
  const [newRecipient, setNewRecipient] = React.useState('');

  // Fetch email accounts when the dialog opens
  useEffect(() => {
    if (open) {
      fetchEmailAccounts();
    }
  }, [open]);

  const fetchEmailAccounts = async () => {
    try {
      const response = await fetch('/api/email-accounts');
      if (response.ok) {
        const data = await response.json();
        setEmailAccounts(data);
        if (data.length > 0) {
          setSelectedEmailId(data[0].id);
        }
      } else {
        console.error('Failed to fetch email accounts');
      }
    } catch (error) {
      console.error('Error fetching email accounts:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !appointmentType || !appointmentDate || !appointmentTime) {
      return;
    }

    // Combine date and time but preserve the selected timezone
    // First format the date and time parts
    const datePart = format(appointmentDate, 'yyyy-MM-dd');
    
    // Create an ISO-8601 datetime string with the selected timezone
    // This format keeps the exact time as specified in the form without any timezone conversions
    const appointmentDateTime = `${datePart}T${appointmentTime}:00`;
    
    // Find the selected email
    const selectedEmail = emailAccounts.find(account => account.id === selectedEmailId);
    
    onSubmit({
      clientName,
      appointmentType,
      appointmentDateTime, // Send as string, not converted to ISO
      notes,
      status,
      timeZone,
      fromEmail: selectedEmail?.email,
      recipients: recipients.length > 0 ? recipients : undefined
    });

    // Reset form
    setClientName('');
    setAppointmentType('sales_appointment');
    setAppointmentDate(undefined);
    setAppointmentTime('09:00');
    setTimeZone('America/Chicago');
    setNotes('');
    setStatus('appointment_booked');
    setRecipients([]);
    setNewRecipient('');
    onOpenChange(false);
  };

  const addRecipient = () => {
    if (newRecipient && !recipients.includes(newRecipient)) {
      setRecipients([...recipients, newRecipient]);
      setNewRecipient('');
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogTitle>Create New Appointment</DialogTitle>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Prospect Name</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="appointmentType">Appointment Type</Label>
              <Select value={appointmentType} onValueChange={setAppointmentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales_appointment">Sales Appointment</SelectItem>
                  <SelectItem value="webinar">Webinar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  <SelectItem value="appointment_booked">Appointment Booked</SelectItem>
                  <SelectItem value="webinar_booked">Webinar Booked</SelectItem>
                  <SelectItem value="appointment_no_showed">No Show</SelectItem>
                  <SelectItem value="appointment_showed">Showed</SelectItem>
                  <SelectItem value="invoice_sent">Invoice Sent</SelectItem>
                  <SelectItem value="invoice_paid">Invoice Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {appointmentDate ? (
                      format(appointmentDate, 'MMM d, yyyy')
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={appointmentDate}
                    onSelect={setAppointmentDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointmentTime">Time</Label>
              <Select value={appointmentTime} onValueChange={setAppointmentTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  {TIME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeZone">Time Zone</Label>
              <Select value={timeZone} onValueChange={setTimeZone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time zone" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  {TIME_ZONES.map((zone) => (
                    <SelectItem key={zone.value} value={zone.value}>
                      {zone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fromEmail">From Email</Label>
            <Select 
              value={selectedEmailId} 
              onValueChange={setSelectedEmailId}
              disabled={emailAccounts.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={emailAccounts.length === 0 ? "No email accounts found" : "Select email"} />
              </SelectTrigger>
              <SelectContent>
                {emailAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.email} ({account.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipients">Recipients</Label>
            <div className="flex space-x-2">
              <Input
                id="newRecipient"
                placeholder="Enter email address"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={addRecipient}
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
            
            {recipients.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {recipients.map(email => (
                  <div key={email} className="flex items-center bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm">
                    {email}
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 ml-1 p-0"
                      onClick={() => removeRecipient(email)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Appointment</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
