'use client';

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Loader2, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Define the Task type again or import if shared
interface Task {
  "Client Name": string;
  "Task Name": string;
  Status: string;
  Description: string;
  "Assigned To": string;
  Order?: string;
  "Due Date": string;
}

interface OrganizationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  // Task-related props passed down
  tasks: Task[];
  tasksLoading: boolean;
  taskError: string | null;
  triggerAndPollForTasks: (orgName: string) => Promise<void>;
  receivedTaskData: any[]; // Keep type flexible for raw data display
  showReceivedData: boolean;
  setShowReceivedData: React.Dispatch<React.SetStateAction<boolean>>;
  getStatusBadgeClasses: (status: string) => string; // Helper function
  getTaskField: (task: any, camelCaseField: string, titleCaseField: string) => any; // Helper function
}

export function OrganizationSettingsModal({
  isOpen,
  onClose,
  organizationId,
  organizationName,
  tasks,
  tasksLoading,
  taskError,
  triggerAndPollForTasks,
  receivedTaskData,
  showReceivedData,
  setShowReceivedData,
  getStatusBadgeClasses,
  getTaskField
}: OrganizationSettingsModalProps) {

  // Effect to trigger task fetch when modal opens, if needed initially
  // Or rely solely on the button click
  // useEffect(() => {
  //   if (isOpen) {
  //     // Optionally trigger fetch immediately, or wait for button click
  //     // triggerAndPollForTasks(organizationName); 
  //   }
  // }, [isOpen, organizationName, triggerAndPollForTasks]);

  const handleViewTasksClick = () => {
    triggerAndPollForTasks(organizationName);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Settings for: {organizationName}</DialogTitle>
          <DialogDescription>
            Manage settings and view tasks for this organization.
          </DialogDescription>
        </DialogHeader>

        {/* Placeholder for future settings */}
        <div className="my-4 p-4 border rounded-md bg-muted/40">
          <p className="text-sm text-muted-foreground text-center">
            (Future organization-specific settings will appear here)
          </p>
        </div>

        {/* Task Section */}
        <div className="mt-4 space-y-4">
          <Button 
            variant="secondary"
            onClick={handleViewTasksClick}
            disabled={tasksLoading}
            className="w-full sm:w-auto"
          >
            {tasksLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
            {tasksLoading ? 'Loading Tasks...' : 'View/Refresh Tasks'}
          </Button>

          <div className="mt-4 max-h-[40vh] overflow-y-auto pr-2 border rounded-md p-4">
            {tasksLoading && !tasks.length ? ( // Show loader only if no tasks are displayed yet
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="ml-3 text-slate-600">Loading tasks...</p>
              </div>
            ) : taskError ? (
              <div className="text-center py-6 text-red-600 bg-red-50 border border-red-200 rounded-md px-4">
                <p><strong>Error:</strong> {taskError}</p>
                {(taskError.includes("No real tasks found") || taskError.includes("No tasks found") || taskError.includes("Polling timed out")) && (
                  <p className="text-sm mt-2">If you just triggered the webhook, try refreshing again in a few seconds.</p>
                )}
              </div>
            ) : tasks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {getTaskField(task, 'taskName', 'Task Name')}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn("border", getStatusBadgeClasses(getTaskField(task, 'status', 'Status')))}
                        >
                          {getTaskField(task, 'status', 'Status')}
                        </Badge>
                      </TableCell>
                      <TableCell>{getTaskField(task, 'assignedTo', 'Assigned To')}</TableCell>
                      <TableCell>
                        {getTaskField(task, 'dueDate', 'Due Date') ? 
                          new Date(getTaskField(task, 'dueDate', 'Due Date')).toLocaleDateString() : 
                          'No date'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
               !tasksLoading && // Only show "No tasks" if not actively loading
               <div className="text-center py-10 text-slate-500 bg-slate-50 border border-slate-100 rounded-md">
                 Click "View/Refresh Tasks" to load tasks for this organization.
               </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
