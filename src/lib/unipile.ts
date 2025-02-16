export class UnipileClient {
  private apiKey: string;
  private dsn: string;

  constructor() {
    const apiKey = process.env.UNIPILE_API_KEY;
    const dsn = process.env.UNIPILE_DSN || 'api4.unipile.com:13465';

    if (!apiKey) {
      throw new Error('Missing UNIPILE_API_KEY environment variable');
    }

    this.apiKey = apiKey;
    this.dsn = dsn;
  }

  async deleteAccount(accountId: string): Promise<void> {
    const response = await fetch(`https://${this.dsn}/api/v1/accounts/${accountId}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete Unipile account: ${errorText}`);
    }

    const data = await response.json();
    if (data.object !== 'AccountDeleted') {
      throw new Error('Unexpected response from Unipile delete account endpoint');
    }
  }

  async setWebhookUrl(accountId: string, webhookUrl: string): Promise<void> {
    const response = await fetch(`https://${this.dsn}/api/v1/accounts/${accountId}/webhook`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey,
      },
      body: JSON.stringify({ webhookUrl })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to set Unipile webhook URL: ${errorText}`);
    }

    const data = await response.json();
    if (data.object !== 'WebhookUpdated') {
      throw new Error('Unexpected response from Unipile webhook update endpoint');
    }
  }

  async sendReply(params: {
    accountId: string;
    messageId: string;
    from: string;
    content: string;
    subject: string;
    replyType: 'reply' | 'replyall' | 'forward';
    to: string;
    cc?: string;
    bcc?: string;
    format?: 'html' | 'text';
  }): Promise<{
    messageId: string;
    subject: string;
    to: string;
  }> {
    const response = await fetch(`https://${this.dsn}/api/v1/accounts/${params.accountId}/messages/${params.messageId}/reply`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey,
      },
      body: JSON.stringify({
        from: params.from,
        content: params.content,
        subject: params.subject,
        replyType: params.replyType,
        to: params.to,
        cc: params.cc,
        bcc: params.bcc,
        format: params.format || 'html'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send reply via Unipile: ${errorText}`);
    }

    const data = await response.json();
    if (data.object !== 'MessageSent') {
      throw new Error('Unexpected response from Unipile reply endpoint');
    }

    return {
      messageId: data.messageId,
      subject: data.subject,
      to: data.to
    };
  }
} 