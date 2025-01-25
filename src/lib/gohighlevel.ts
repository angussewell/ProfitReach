import { getValidToken } from './auth';
import {
  GHLContact,
  GHLTask,
  GHLConversation,
  GHLMessage,
  GHLCustomValue,
} from '../types/gohighlevel';
import { cookies } from 'next/headers';

export class GoHighLevelClient {
  private baseUrl = 'https://services.gohighlevel.com/v1';
  private locationId: string;

  constructor(locationId: string) {
    this.locationId = locationId;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const token = await getValidToken(this.locationId);
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

export function getGoHighLevelClient(): GoHighLevelClient {
  const locationId = cookies().get('ghl_auth')?.value;
  if (!locationId) {
    throw new Error('No GoHighLevel location ID found');
  }

  if (!clientInstances[locationId]) {
    clientInstances[locationId] = new GoHighLevelClient(locationId);
  }

  return clientInstances[locationId];
} 