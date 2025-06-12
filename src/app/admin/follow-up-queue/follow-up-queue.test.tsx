import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AdminFollowUpQueuePage from './page';
import { ConversationStatus } from '@prisma/client';
import { useSession } from 'next-auth/react';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Mock conversation thread view
vi.mock('@/components/admin/ConversationThreadView', () => ({
  ConversationThreadView: ({ messages, emailAccounts, socialAccounts, className }) => (
    <div data-testid="conversation-thread-view" className={className}>
      <div>Thread with {messages.length} messages</div>
    </div>
  ),
}));

// Mock fetch
global.fetch = vi.fn();

// Test data
const mockQueueItems = [
  {
    id: '1',
    threadId: 'thread-1',
    subject: 'Test Subject 1',
    sender: 'sender@example.com',
    recipientEmail: 'recipient@example.com',
    content: 'Test content 1',
    receivedAt: new Date().toISOString(),
    status: ConversationStatus.FOLLOW_UP_NEEDED,
    organizationId: 'org-1',
    emailAccountId: 'email-1',
  },
  {
    id: '2',
    threadId: 'thread-2',
    subject: 'Test Subject 2',
    sender: 'sender2@example.com',
    recipientEmail: 'recipient2@example.com',
    content: 'Test content 2',
    receivedAt: new Date().toISOString(),
    status: ConversationStatus.FOLLOW_UP_NEEDED,
    organizationId: 'org-1',
    emailAccountId: 'email-1',
  },
];

const mockThreadMessages = [
  {
    id: '1',
    messageId: 'message-1',
    threadId: 'thread-1',
    subject: 'Test Subject 1',
    sender: 'sender@example.com',
    recipientEmail: 'recipient@example.com',
    content: 'Test content 1',
    receivedAt: new Date().toISOString(),
    messageType: 'REAL_REPLY',
    isRead: true,
    status: ConversationStatus.FOLLOW_UP_NEEDED,
    organizationId: 'org-1',
    emailAccountId: 'email-1',
  },
];

const mockEmailAccounts = [
  {
    id: 'email-1',
    email: 'user@example.com',
    name: 'User',
    isHidden: false,
  },
];

describe('AdminFollowUpQueuePage', () => {
  beforeEach(() => {
    // Mock useSession
    (useSession as any).mockReturnValue({
      data: { user: { role: 'admin', organizationId: 'org-1' } },
      status: 'authenticated',
    });

    // Mock fetch for different endpoints
    (global.fetch as any).mockImplementation((url) => {
      if (url === '/api/admin/follow-up-queue') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockQueueItems),
        });
      } else if (url === '/api/email-accounts') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockEmailAccounts),
        });
      } else if (url === '/api/social-accounts') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      } else if (url.includes('/api/messages/thread/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockThreadMessages),
        });
      } else if (url === '/api/messages/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      } else if (url === '/api/messages/reply') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      } else if (url.includes('/api/messages/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });

    // Mock confirm
    global.confirm = vi.fn(() => true);
  });

  it('shows loading state initially', () => {
    render(<AdminFollowUpQueuePage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders the queue with threads', async () => {
    render(<AdminFollowUpQueuePage />);
    await waitFor(() => {
      expect(screen.getByText(/Review threads needing follow-up/)).toBeInTheDocument();
    });
  });

  it('shows thread when loaded', async () => {
    render(<AdminFollowUpQueuePage />);
    await waitFor(() => {
      expect(screen.getByTestId('conversation-thread-view')).toBeInTheDocument();
    });
  });

  it('navigates between threads', async () => {
    render(<AdminFollowUpQueuePage />);
    await waitFor(() => {
      expect(screen.getByText(/1 of 2/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText(/2 of 2/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Previous'));
    await waitFor(() => {
      expect(screen.getByText(/1 of 2/)).toBeInTheDocument();
    });
  });

  it('shows reply form when reply button is clicked', async () => {
    render(<AdminFollowUpQueuePage />);
    await waitFor(() => {
      expect(screen.getByText('Reply')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Reply'));
    await waitFor(() => {
      expect(screen.getByText('Hide Reply')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type your reply here...')).toBeInTheDocument();
    });
  });

  it('handles status updates', async () => {
    render(<AdminFollowUpQueuePage />);
    await waitFor(() => {
      expect(screen.getByText('Booked')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Booked'));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/messages/status', expect.anything());
    });
  });
});
