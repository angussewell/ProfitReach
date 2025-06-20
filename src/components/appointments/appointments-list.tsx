'use client';

import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateInCentralTime } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2, Edit, Calendar, User, FileText, Tag, Mail, PlusCircle, X, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { format, parse } from 'date-fns';

// Define time zones
const TIME_ZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
];

interface EmailAccount {
  id: string;
  name: string;
  email: string;
}

interface Appointment {
  id: string;
  clientName: string;
  appointmentType: string;
  appointmentDateTime: string;
  notes: string | null;
  status: string;
  organizationId: string;
  createdAt: string;
  timeZone?: string;
  fromEmail?: string;
  recipients?: string[];
}

interface AppointmentsListProps {
  appointments: Appointment[];
}

export function AppointmentsList({ appointments }: AppointmentsListProps) {
  const [editingAppointment, setEditingAppointment] = React.useState<Appointment | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editDate, setEditDate] = React.useState('');
  const [editTime, setEditTime] = React.useState('');
  const [emailAccounts, setEmailAccounts] = React.useState<EmailAccount[]>([]);
  const [selectedEmailId, setSelectedEmailId] = React.useState<string>('');
  const [editRecipients, setEditRecipients] = React.useState<string[]>([]);
  const [newRecipient, setNewRecipient] = React.useState('');

  const sortedAppointments = React.useMemo(() => {
    return [...appointments].sort((a, b) => {
      try {
        const dateA = new Date(a.appointmentDateTime);
        const dateB = new Date(b.appointmentDateTime);
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
        return dateB.getTime() - dateA.getTime();
      } catch (error) {
        console.error('Error sorting appointments:', error);
        return 0;
      }
    });
  }, [appointments]);

  // Fetch email accounts when needed
  useEffect(() => {
    if (isEditDialogOpen) {
      fetchEmailAccounts();
    }
  }, [isEditDialogOpen]);

  // Set up the edit form when an appointment is selected for editing
  useEffect(() => {
    if (editingAppointment) {
      try {
        // Parse the date and time from the appointment date
        const appointmentDate = new Date(editingAppointment.appointmentDateTime);
        setEditDate(format(appointmentDate, 'yyyy-MM-dd'));
        setEditTime(format(appointmentDate, 'HH:mm'));
        
        // Set recipients
        setEditRecipients(editingAppointment.recipients || []);
        
        // Find and set the email account
        if (editingAppointment.fromEmail && emailAccounts.length > 0) {
          const account = emailAccounts.find(acc => acc.email === editingAppointment.fromEmail);
          if (account) {
            setSelectedEmailId(account.id);
          }
        }
      } catch (error) {
        console.error('Error setting up edit form:', error);
      }
    }
  }, [editingAppointment, emailAccounts]);

  const fetchEmailAccounts = async () => {
    try {
      const response = await fetch('/api/email-accounts');
      if (response.ok) {
        const data = await response.json();
        setEmailAccounts(data);
      } else {
        console.error('Failed to fetch email accounts');
      }
    } catch (error) {
      console.error('Error fetching email accounts:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/appointments?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete appointment');
      }
      
      toast.success('Appointment deleted successfully');
      window.location.reload();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast.error('Failed to delete appointment');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch('/api/appointments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          id,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update appointment status');
      }

      toast.success('Status updated successfully');
      window.location.reload();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleEdit = async (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsEditDialogOpen(true);
  };

  const addRecipient = () => {
    if (newRecipient && !editRecipients.includes(newRecipient)) {
      setEditRecipients([...editRecipients, newRecipient]);
      setNewRecipient('');
    }
  };

  const removeRecipient = (email: string) => {
    setEditRecipients(editRecipients.filter(r => r !== email));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointment) return;

    try {
      // Combine date and time without timezone conversion
      const appointmentDateTime = `${editDate}T${editTime}:00`;

      // Find the selected email
      const selectedEmail = emailAccounts.find(account => account.id === selectedEmailId);

      // Updated appointment data
      const updatedAppointment = {
        ...editingAppointment,
        appointmentDateTime,
        timeZone: editingAppointment.timeZone || 'America/Chicago',
        fromEmail: selectedEmail?.email,
        recipients: editRecipients.length > 0 ? editRecipients : undefined
      };

      const response = await fetch('/api/appointments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedAppointment),
      });

      if (!response.ok) {
        throw new Error('Failed to update appointment');
      }

      toast.success('Appointment updated successfully');
      setIsEditDialogOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'appointment_showed':
      case 'invoice_paid':
        return 'bg-green-50 text-green-700';
      case 'appointment_no_showed':
      case 'appointment_unqualified':
        return 'bg-red-50 text-red-700';
      case 'invoice_sent':
        return 'bg-purple-50 text-purple-700';
      case 'appointment_booked':
      case 'webinar_booked':
        return 'bg-blue-50 text-blue-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  if (appointments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No appointments found
      </div>
    );
  }

  // Generate time options in 30-minute increments
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  });

  return (
    <>
      <ScrollArea className="h-[500px] rounded-md border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {sortedAppointments.map((appointment) => (
            <Card key={appointment.id} className="bg-white shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex flex-col space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-grow">
                      <h4 className="font-medium text-lg text-slate-800 mb-1 line-clamp-1">{appointment.clientName}</h4>
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Calendar className="h-4 w-4" />
                          <span>Date: {(() => {
                            try {
                              console.log('Raw appointment data:', appointment.appointmentDateTime);
                              
                              if (typeof appointment.appointmentDateTime === 'string') {
                                // First attempt: Check if it's in the format "Mar 14, 2025 at 11:11 AM"
                                if (appointment.appointmentDateTime.includes(' at ')) {
                                  return appointment.appointmentDateTime.split(' at ')[0];
                                }
                                
                                // Second attempt: Check for SQL date format "2025-04-07 20:30:00"
                                const match = appointment.appointmentDateTime.match(/^(\d{4})-(\d{2})-(\d{2})/);
                                if (match) {
                                  // We have [fullMatch, year, month, day]
                                  const year = match[1];
                                  const month = parseInt(match[2], 10);
                                  const day = parseInt(match[3], 10);
                                  
                                  // Create date object and format it
                                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                  return `${months[month-1]} ${day}, ${year}`;
                                }
                              }
                              
                              // For debugging - show the type if it's not a string
                              if (typeof appointment.appointmentDateTime !== 'string') {
                                return `Not a string: ${typeof appointment.appointmentDateTime}`;
                              }
                              
                              // Fallback
                              return 'Invalid date';
                            } catch (error) {
                              console.error('Date parsing error:', error);
                              return 'Error parsing date';
                            }
                          })()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Clock className="h-4 w-4" />
                          <span>Time: {(() => {
                            try {
                              if (typeof appointment.appointmentDateTime === 'string') {
                                // First attempt: Check if it's in the format "Mar 14, 2025 at 11:11 AM"
                                if (appointment.appointmentDateTime.includes(' at ')) {
                                  return appointment.appointmentDateTime.split(' at ')[1];
                                }
                                
                                // Second attempt: Extract time part from SQL format "2025-04-07 20:30:00"
                                const match = appointment.appointmentDateTime.match(/\s(\d{2}):(\d{2}):\d{2}$/);
                                if (match) {
                                  // We have [fullMatch, hours, minutes]
                                  let hours = parseInt(match[1], 10);
                                  const minutes = match[2];
                                  const ampm = hours >= 12 ? 'PM' : 'AM';
                                  
                                  // Convert to 12-hour format
                                  hours = hours % 12;
                                  hours = hours ? hours : 12; // Convert 0 to 12
                                  
                                  return `${hours}:${minutes} ${ampm}`;
                                }
                              }
                              
                              // Fallback
                              return 'Invalid time';
                            } catch (error) {
                              console.error('Time parsing error:', error);
                              return 'Error parsing time';
                            }
                          })()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Clock className="h-4 w-4 opacity-0" />
                          <span>Time Zone: {(() => {
                            if (appointment.timeZone) {
                              // Look up the label for this time zone if available
                              const timeZoneObj = TIME_ZONES.find(tz => tz.value === appointment.timeZone);
                              return timeZoneObj ? timeZoneObj.label : appointment.timeZone;
                            }
                            return 'CT (Default)'; // Default if not specified
                          })()}</span>
                        </div>
                      </div>
                      {(() => {
                        const allEmails = [];
                        if (appointment.fromEmail) {
                          allEmails.push(appointment.fromEmail);
                        }
                        if (appointment.recipients && appointment.recipients.length > 0) {
                          allEmails.push(...appointment.recipients);
                        }
                        
                        if (allEmails.length > 0) {
                          return (
                            <div className="flex items-start gap-2 text-slate-500 mt-1">
                              <Users className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-600 mb-0.5">Recipients:</span>
                                {allEmails.map((email, index) => (
                                  <span key={index} className="text-sm truncate">
                                    {email}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost" // Use ghost for subtle actions
                        size="icon" // Use standard icon size
                        onClick={() => handleEdit(appointment)}
                        title="Edit appointment"
                        className="text-muted-foreground hover:text-foreground" // Standard hover
                      >
                        <Edit className="h-5 w-5" /> {/* Use standard icon size */}
                      </Button>
                      <Button
                        variant="destructive" // Use subtle destructive
                        size="icon" // Use standard icon size
                        onClick={() => handleDelete(appointment.id)}
                        title="Delete appointment"
                        className="text-red-600 hover:bg-red-50" // Add specific destructive styling
                      >
                        <Trash2 className="h-5 w-5" /> {/* Use standard icon size */}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">
                      {appointment.appointmentType.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </span>
                  </div>

                  {appointment.notes && (
                    <div className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-slate-600">Notes</span>
                      </div>
                      <p className="text-slate-600 whitespace-pre-wrap pl-6 line-clamp-2">{appointment.notes}</p>
                    </div>
                  )}

                  <div className="pt-2">
                    <Select
                      value={appointment.status}
                      onValueChange={(value) => handleStatusChange(appointment.id, value)}
                    >
                      <SelectTrigger className={cn(
                        "w-full h-8 text-sm font-medium border-0",
                        getStatusColor(appointment.status)
                      )}>
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
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Prospect Name</Label>
              <Input
                id="clientName"
                value={editingAppointment?.clientName || ''}
                onChange={(e) => setEditingAppointment(prev => prev ? {...prev, clientName: e.target.value} : null)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="appointmentType">Type</Label>
              <Select
                value={editingAppointment?.appointmentType}
                onValueChange={(value) => setEditingAppointment(prev => prev ? {...prev, appointmentType: value} : null)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales_appointment">Sales Appointment</SelectItem>
                  <SelectItem value="webinar">Webinar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editDate">Date</Label>
                <Input
                  id="editDate"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editTime">Time</Label>
                <Select value={editTime} onValueChange={setEditTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {timeOptions.map((time) => {
                      const [hour, minute] = time.split(':').map(Number);
                      const period = hour >= 12 ? 'PM' : 'AM';
                      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                      
                      return (
                        <SelectItem key={time} value={time}>
                          {`${displayHour}:${minute.toString().padStart(2, '0')} ${period}`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timeZone">Time Zone</Label>
              <Select 
                value={editingAppointment?.timeZone || 'America/Chicago'} 
                onValueChange={(value) => setEditingAppointment(prev => prev ? {...prev, timeZone: value} : null)}
              >
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
                <SelectContent className="max-h-[200px] overflow-y-auto">
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
                  variant="secondary" // Use secondary for Add Recipient
                  size="icon"
                  onClick={addRecipient}
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
              
              {editRecipients.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {editRecipients.map(email => (
                    <div key={email} className="flex items-center bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm">
                      {email}
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="ml-1 h-6 w-6 p-1 text-muted-foreground hover:text-foreground" // Adjust size and styling
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
                value={editingAppointment?.notes || ''}
                onChange={(e) => setEditingAppointment(prev => prev ? {...prev, notes: e.target.value} : null)}
                rows={3}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsEditDialogOpen(false)}> {/* Use secondary for Cancel */}
                Cancel
              </Button>
              <Button type="submit" variant="default">Save Changes</Button> {/* Use default for primary action */}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
