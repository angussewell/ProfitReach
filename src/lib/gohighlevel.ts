import { prisma } from '@/lib/prisma';
import {
  GHLContact,
  GHLTask,
  GHLConversation,
  GHLMessage,
  GHLCustomValue,
} from '../types/gohighlevel';
import { cookies } from 'next/headers';

export class GoHighLevelClient {
  private baseUrl = 'https://services.leadconnectorhq.com/v2';
  private locationId: string;
  private organizationId: string;

  constructor(locationId: string, organizationId: string) {
    this.locationId = locationId;
    this.organizationId = organizationId;
  }

  private async refreshToken(integration: any): Promise<string> {
    const clientId = process.env.NEXT_PUBLIC_GHL_CLIENT_ID;
    const clientSecret = process.env.GHL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Missing GoHighLevel client credentials');
    }

    const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: integration.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const { access_token, refresh_token, expires_in } = await response.json();

    // Update tokens in database
    await prisma.gHLIntegration.update({
      where: {
        organizationId_locationId: {
          organizationId: this.organizationId,
          locationId: this.locationId
        }
      },
      data: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000)
      }
    });

    return access_token;
  }

  private async getValidToken(): Promise<string> {
    const integration = await prisma.gHLIntegration.findUnique({
      where: {
        organizationId_locationId: {
          organizationId: this.organizationId,
          locationId: this.locationId
        }
      }
    });

    if (!integration) {
      throw new Error('No GoHighLevel integration found');
    }

    // Check if token is expired or will expire in the next minute
    if (integration.expiresAt.getTime() <= Date.now() + 60000) {
      return this.refreshToken(integration);
    }

    return integration.accessToken;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const token = await this.getValidToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`GoHighLevel API error: ${response.status} ${error.message || response.statusText}`);
    }

    return response.json();
  }

  // Contacts API
  async getContact(contactId: string): Promise<GHLContact> {
    return this.request<GHLContact>('GET', `/contacts/${contactId}`);
  }

  async createContact(data: Partial<GHLContact>): Promise<GHLContact> {
    return this.request<GHLContact>('POST', '/contacts', data);
  }

  async updateContact(contactId: string, data: Partial<GHLContact>): Promise<GHLContact> {
    return this.request<GHLContact>('PUT', `/contacts/${contactId}`, data);
  }

  // Tasks API
  async createTask(data: Partial<GHLTask>): Promise<GHLTask> {
    return this.request<GHLTask>('POST', '/tasks', data);
  }

  // Conversations API
  async getConversations(contactId: string): Promise<GHLConversation[]> {
    return this.request<GHLConversation[]>('GET', `/conversations/contact/${contactId}`);
  }

  async sendMessage(conversationId: string, data: Partial<GHLMessage>): Promise<GHLMessage> {
    return this.request<GHLMessage>('POST', `/conversations/${conversationId}/messages`, data);
  }

  // Custom Value API
  async getCustomValues(contactId: string): Promise<GHLCustomValue[]> {
    return this.request<GHLCustomValue[]>('GET', `/contacts/${contactId}/custom-values`);
  }

  async updateCustomValues(contactId: string, data: Partial<GHLCustomValue>[]): Promise<GHLCustomValue[]> {
    return this.request<GHLCustomValue[]>('PUT', `/contacts/${contactId}/custom-values`, data);
  }
}

// Singleton instance cache
const clientInstances: Record<string, GoHighLevelClient> = {};

export async function getGoHighLevelClient(organizationId: string): Promise<GoHighLevelClient> {
  const cookieStore = await cookies();
  const locationId = cookieStore.get('ghl_auth')?.value;
  if (!locationId) {
    throw new Error('No GoHighLevel location ID found');
  }

  const key = `${organizationId}:${locationId}`;
  if (!clientInstances[key]) {
    clientInstances[key] = new GoHighLevelClient(locationId, organizationId);
  }

  return clientInstances[key];
} 