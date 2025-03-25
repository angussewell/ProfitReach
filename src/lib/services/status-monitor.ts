import { ConversationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type StatusChangeLogWithMessage = {
    id: string;
    messageId: string;
    threadId: string;
    organizationId: string;
    oldStatus: ConversationStatus;
    newStatus: ConversationStatus;
    changedAt: Date;
    scheduledChange: boolean;
    successful: boolean;
    errorMessage: string | null;
    message: {
        subject: string;
        sender: string;
    };
};

export class StatusMonitor {
    /**
     * Logs a status change in the StatusChangeLog table
     */
    static async logStatusChange({
        messageId,
        threadId,
        organizationId,
        oldStatus,
        newStatus,
        scheduledChange = false,
        successful = true,
        errorMessage = null
    }: {
        messageId: string;
        threadId: string;
        organizationId: string;
        oldStatus: ConversationStatus;
        newStatus: ConversationStatus;
        scheduledChange?: boolean;
        successful?: boolean;
        errorMessage?: string | null;
    }) {
        return await prisma.statusChangeLog.create({
            data: {
                messageId,
                threadId,
                organizationId,
                oldStatus,
                newStatus,
                scheduledChange,
                successful,
                errorMessage
            }
        });
    }

    /**
     * Gets recent status changes for an organization
     */
    static async getRecentStatusChanges({
        organizationId,
        hours = 24
    }: {
        organizationId: string;
        hours?: number;
    }): Promise<StatusChangeLogWithMessage[]> {
        const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
        
        return await prisma.statusChangeLog.findMany({
            where: {
                organizationId,
                changedAt: {
                    gte: cutoffTime
                }
            },
            orderBy: {
                changedAt: 'desc'
            },
            include: {
                message: {
                    select: {
                        subject: true,
                        sender: true
                    }
                }
            }
        });
    }

    /**
     * Gets failed status changes for an organization
     */
    static async getFailedStatusChanges({
        organizationId,
        hours = 24
    }: {
        organizationId: string;
        hours?: number;
    }): Promise<StatusChangeLogWithMessage[]> {
        const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
        
        return await prisma.statusChangeLog.findMany({
            where: {
                organizationId,
                successful: false,
                changedAt: {
                    gte: cutoffTime
                }
            },
            orderBy: {
                changedAt: 'desc'
            },
            include: {
                message: {
                    select: {
                        subject: true,
                        sender: true
                    }
                }
            }
        });
    }

    /**
     * Gets metrics for scheduled status changes
     */
    static async getScheduledChangesMetrics({
        organizationId,
        hours = 24
    }: {
        organizationId: string;
        hours?: number;
    }): Promise<{
        totalChanges: number;
        failedChanges: number;
        successRate: number;
        changes: StatusChangeLogWithMessage[];
    }> {
        const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
        
        const changes = await prisma.statusChangeLog.findMany({
            where: {
                organizationId,
                scheduledChange: true,
                changedAt: {
                    gte: cutoffTime
                }
            },
            include: {
                message: {
                    select: {
                        subject: true,
                        sender: true
                    }
                }
            }
        });

        const totalChanges = changes.length;
        const failedChanges = changes.filter((change: StatusChangeLogWithMessage) => !change.successful).length;
        const successRate = totalChanges > 0 ? ((totalChanges - failedChanges) / totalChanges) * 100 : 100;

        return {
            totalChanges,
            failedChanges,
            successRate,
            changes
        };
    }
} 