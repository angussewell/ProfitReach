"use server";

import { neon } from "@neondatabase/serverless";
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export async function getData() {
    const sql = neon(process.env.DATABASE_URL!);
    // Your queries here
    return null;
}

// Account actions
export async function createAccount(locationId: string, accessToken: string, refreshToken: string, expiresAt: Date) {
    return prisma.account.create({
        data: {
            ghl_location_id: locationId,
            access_token: accessToken,
            refresh_token: refreshToken,
            token_expires_at: expiresAt
        }
    });
}

export async function getAccount(locationId: string) {
    return prisma.account.findUnique({
        where: {
            ghl_location_id: locationId
        }
    });
}

// Metric actions
export async function updateMetrics(accountId: string, scenarioName: string, enrollments: number, replies: number) {
    return prisma.metric.upsert({
        where: {
            accountId_scenarioName: {
                accountId,
                scenarioName
            }
        },
        update: {
            enrollments,
            replies
        },
        create: {
            accountId,
            scenarioName,
            enrollments,
            replies
        }
    });
}

export async function getMetrics(accountId: string) {
    return prisma.metric.findMany({
        where: {
            accountId
        }
    });
}

// Webhook actions
export async function logWebhook(
    accountId: string,
    status: string,
    scenarioName: string,
    contactEmail: string,
    contactName: string,
    company: string,
    requestBody: Prisma.InputJsonValue,
    responseBody: Prisma.InputJsonValue = {}
) {
    return prisma.webhookLog.create({
        data: {
            accountId,
            status,
            scenarioName,
            contactEmail,
            contactName,
            company,
            requestBody,
            responseBody
        }
    });
}

export async function getWebhookLogs(accountId: string) {
    return prisma.webhookLog.findMany({
        where: {
            accountId
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
} 