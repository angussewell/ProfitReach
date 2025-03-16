'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDateInCentralTime } from '@/lib/date-utils';

interface CreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    clientName: string;
    appointmentType: string;
    appointmentDateTime: string;
    notes?: string;
    status: string;
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
  const [notes, setNotes] = React.useState('');
  const [status, setStatus] = React.useState('appointment_booked');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !appointmentType || !appointmentDate) {
      return;
    }

    onSubmit({
      clientName,
      appointmentType,
      appointmentDateTime: appointmentDate.toISOString(),
      notes,
      status
    });

    // Reset form
    setClientName('');
    setAppointmentType('sales_appointment');
    setAppointmentDate(undefined);
    setNotes('');
    setStatus('appointment_booked');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Create New Appointment</DialogTitle>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </div>

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
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  {appointmentDate ? (
                    formatDateInCentralTime(appointmentDate)
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
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="appointment_booked">Appointment Booked</SelectItem>
                <SelectItem value="webinar_booked">Webinar Booked</SelectItem>
                <SelectItem value="appointment_no_showed">No Show</SelectItem>
                <SelectItem value="appointment_showed">Showed</SelectItem>
                <SelectItem value="appointment_unqualified">Unqualified</SelectItem>
                <SelectItem value="invoice_sent">Invoice Sent</SelectItem>
                <SelectItem value="invoice_paid">Invoice Paid</SelectItem>
              </SelectContent>
            </Select>
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
