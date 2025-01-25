export interface GHLContact {
  id: string;
  locationId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  companyName?: string;
  tags?: string[];
  customField?: Record<string, string>;
  dateAdded: string;
  dateUpdated: string;
}

export interface GHLTask {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  completed: boolean;
  assignedTo?: string;
  contactId?: string;
  dateAdded: string;
  dateUpdated: string;
}

export interface GHLConversation {
  id: string;
  contactId: string;
  type: string;
  status: string;
  lastMessage?: string;
  lastMessageDate?: string;
  dateAdded: string;
  dateUpdated: string;
}

export interface GHLMessage {
  id: string;
  conversationId: string;
  type: string;
  body: string;
  direction: 'inbound' | 'outbound';
  status: string;
  dateAdded: string;
}

export interface GHLCustomValue {
  id: string;
  name: string;
  value: string;
  dateAdded: string;
  dateUpdated: string;
} 