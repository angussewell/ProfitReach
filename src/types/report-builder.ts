export interface ReportBuilderConfig {
  id: string;
  name: string;
  webhookUrl: string;
  notificationEmail: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReportBuilderConfigRequest {
  name: string;
  webhookUrl: string;
  notificationEmail: string;
}

export interface UpdateReportBuilderConfigRequest {
  name?: string;
  webhookUrl?: string;
  notificationEmail?: string;
}

export interface ContactOption {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  currentCompanyName: string | null;
  fullName: string | null;
}

export interface ContactSearchResponse {
  contacts: ContactOption[];
}

export interface SendReportRequest {
  reportConfigId: string;
  contactId: string;
  customNotes: string;
}

export interface WebhookPayload {
  reportConfigId: string;
  organizationId: string;
  userId: string;
  customNotes: string;
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    currentCompanyName: string | null;
    fullName: string | null;
    title: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    phoneNumbers: any;
    additionalData: any;
  };
  timestamp: string;
}

export interface SendReportResponse {
  success: boolean;
  message: string;
  webhookResponse?: {
    status: number;
    statusText: string;
  };
}

export interface ReportHistory {
  id: string;
  reportBuilderConfigId: string;
  contactId: string;
  userId: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  customNotes: string | null;
  reportUrl: string | null;
  createdAt: Date;
}

export interface ReportHistoryWithRelations {
  id: string;
  reportBuilderConfigId: string;
  contactId: string;
  userId: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  customNotes: string | null;
  reportUrl: string | null;
  createdAt: Date;
  ReportBuilderConfig: {
    id: string;
    name: string;
    webhookUrl: string;
  };
  Contacts: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    fullName: string | null;
    currentCompanyName: string | null;
  };
  User: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

export interface ReportHistoryResponse {
  history: ReportHistoryWithRelations[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}