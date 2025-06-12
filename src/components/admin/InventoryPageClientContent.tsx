'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, AlertTriangle, RotateCcw } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from 'react-hot-toast';
import { EmailInventoryStats } from '@/components/admin/EmailInventoryStats';
import { ElvCreditsWidget } from '@/components/admin/ElvCreditsWidget';
import { purgeStaleWorkflowStates, reactivateStaleWorkflowStates } from '@/lib/server-actions';
import { WorkflowStatusDashboard } from '@/components/admin/WorkflowStatusDashboard';
// Removed: import { ContactsPerOrgStats } from '@/components/admin/ContactsPerOrgStats';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Renamed function to reflect its role
export default function InventoryPageClientContent() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // --- State & Transitions for Workflow Maintenance ---
  const [isPurgePending, startPurgeTransition] = useTransition();
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
  const [isReactivatePending, startReactivateTransition] = useTransition();
  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false);

  // --- Handlers for Workflow Maintenance ---
  const handlePurgeStaleWorkflows = async () => {
    startPurgeTransition(async () => {
      const toastId = toast.loading('Purging stale workflow states...');
      try {
        const result = await purgeStaleWorkflowStates();
        if (result.success) {
          toast.success(`Successfully purged ${result.deletedCount ?? 0} stale workflow states.`, { id: toastId });
        } else {
          throw new Error(result.error || 'Unknown error occurred during purge.');
        }
      } catch (error) {
        console.error('Error purging stale workflows:', error);
        toast.error(`Failed to purge: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
      } finally {
        setIsPurgeDialogOpen(false);
      }
    });
  };

  const handleReactivateStaleWorkflows = async () => {
    startReactivateTransition(async () => {
      const toastId = toast.loading('Reactivating stale workflow states...');
      try {
        const result = await reactivateStaleWorkflowStates();
        if (result.success) {
          toast.success(`Successfully reactivated ${result.updatedCount ?? 0} stale workflow states to 'active'.`, { id: toastId });
        } else {
          throw new Error(result.error || 'Unknown error occurred during reactivation.');
        }
      } catch (error) {
        console.error('Error reactivating stale workflows:', error);
        toast.error(`Failed to reactivate: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
      } finally {
        setIsReactivateDialogOpen(false);
      }
    });
  };

  // --- Auth Check ---
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }
    // Note: Role check might be better handled server-side in the parent page component
    // but keeping it here for now as it was in the original client component.
    if (session?.user?.role !== 'admin') {
      router.push('/scenarios');
    }
  }, [session, status, router]);

  // Note: Loading/Access Denied states might also be handled in the parent server component
  if (status === 'loading') {
    return <div className="flex items-center justify-center h-full"><p className="text-gray-500">Loading Inventory...</p></div>;
  }
  if (session?.user?.role !== 'admin') {
     return <div className="flex items-center justify-center h-full"><p className="text-red-500">Access Denied</p></div>;
  }

  // --- Render Logic (Client-side parts only) ---
  // Removed the outer div wrapper and page title, as those belong in the parent server page component
  return (
    <>
      {/* Email Account Inventory Section */}
      <div className="mt-8">
        <EmailInventoryStats />
      </div>

      {/* EmailListVerify Credits Widget Section */}
      <div className="mt-8">
        <ElvCreditsWidget />
      </div>

      {/* Workflow Status Dashboard Section */}
      <div className="mt-8">
        <WorkflowStatusDashboard />
      </div>

      {/* Workflow Maintenance Section */}
      <div className="mt-8">
        <div className="flex items-center mb-4">
          <div className="h-10 w-1 bg-gradient-to-b from-red-600 to-orange-600 rounded mr-3"></div>
          <h2 className="text-xl font-semibold text-slate-800">Workflow Maintenance</h2>
        </div>
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 pb-2">
            <CardTitle className="text-base font-medium">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                  <span>Purge/Reactivate Stale Workflow States</span>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <p className="text-sm text-slate-600">
              Use these actions to manage Contact Workflow State records globally where the status is 'waiting_scenario'.
              Purging deletes them permanently. Reactivating sets their status back to 'active'. Use with caution.
            </p>
            <div className="flex gap-4">
              {/* Purge Button and Dialog */}
              <AlertDialog open={isPurgeDialogOpen} onOpenChange={setIsPurgeDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isPurgePending || isReactivatePending}>
                    {isPurgePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Purge Stale States
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center"><AlertTriangle className="text-red-500 mr-2 h-5 w-5" />Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone. This will permanently delete all workflow states globally with the status 'waiting_scenario'.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPurgePending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePurgeStaleWorkflows} disabled={isPurgePending} className="bg-red-600 hover:bg-red-700">
                      {isPurgePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Confirm Purge
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Reactivate Button and Dialog */}
              <AlertDialog open={isReactivateDialogOpen} onOpenChange={setIsReactivateDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={isReactivatePending || isPurgePending}>
                    {isReactivatePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                    Reactivate Stale States
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center"><AlertTriangle className="text-orange-500 mr-2 h-5 w-5" />Confirm Reactivation</AlertDialogTitle>
                    <AlertDialogDescription>This action will update the status of all workflow states globally from 'waiting_scenario' to 'active'. This may cause workflows to resume unexpectedly.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isReactivatePending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReactivateStaleWorkflows} disabled={isReactivatePending} className="bg-blue-600 hover:bg-blue-700">
                      {isReactivatePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Confirm Reactivate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>

       {/* Placeholder for Contact Storage Widget */}
       <div className="mt-8 p-6 border border-dashed border-slate-300 rounded-md text-center text-slate-500">
         <p className="font-medium">Contact Storage Widget</p>
         <p className="text-sm">(Placeholder for future implementation)</p>
       </div>
    </> // Use Fragment as root element
  );
}
