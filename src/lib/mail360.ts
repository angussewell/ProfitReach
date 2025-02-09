import { z } from 'zod';

const Mail360Config = {
  clientId: process.env.MAIL360_CLIENT_ID,
  clientSecret: process.env.MAIL360_CLIENT_SECRET,
  refreshToken: process.env.MAIL360_REFRESH_TOKEN,
};

const Mail360TokenResponse = z.object({
  status: z.object({
    code: z.number(),
    description: z.string(),
  }),
  data: z.object({
    access_token: z.string(),
    expires_in_sec: z.number().optional().default(3600),
  }),
});

const Mail360AccountResponse = z.object({
  status: z.object({
    code: z.number(),
    description: z.string(),
  }),
  data: z.object({
    account_key: z.string(),
  }),
});

const Mail360MessageResponse = z.object({
  status: z.object({
    code: z.number(),
    description: z.string(),
  }),
  data: z.object({
    summary: z.string().optional(),
    transaction_id: z.string().optional(),
    delivered_to: z.string().optional(),
    subject: z.string().optional(),
    bcc_address: z.string().optional(),
    parent_message_id: z.string().optional(),
    account_key: z.string().optional(),
    read_status: z.number().optional(),
    has_attachment: z.boolean().optional(),
    message_id: z.string(),
    received_time: z.string().optional(),
    to_address: z.string().optional(),
    cc_address: z.string().optional(),
    thread_id: z.string().optional(),
    return_path: z.string().optional(),
    size: z.number().optional(),
    sender: z.string().optional(),
    archived_message: z.number().optional(),
    event: z.string().optional(),
    folder_id: z.string().optional(),
    header_message_id: z.string().optional(),
    from_address: z.string().optional(),
    send_time_in_gmt: z.string().optional(),
    email: z.string().optional(),
  }),
});

const Mail360MessageContentResponse = z.object({
  status: z.object({
    code: z.number(),
    description: z.string(),
  }),
  data: z.object({
    messageId: z.number(),
    content: z.string(),
  }),
});

// Add new response type for reply
const Mail360ReplyResponse = z.object({
  status: z.object({
    code: z.number(),
    description: z.string(),
  }),
  data: z.object({
    messageId: z.string(),
    fromAddress: z.string(),
    toAddress: z.string(),
    subject: z.string(),
  }),
});

export class Mail360Client {
  private accessToken: string | null = null;
  private accessTokenExpiry: number = 0;

  constructor() {
    if (!Mail360Config.clientId || !Mail360Config.clientSecret || !Mail360Config.refreshToken) {
      throw new Error('Mail360 configuration is incomplete. Please check environment variables.');
    }
  }

  private async getAccessToken(retryCount = 0): Promise<string> {
    const maxRetries = 3;
    
    try {
      // Return existing token if it's still valid (with 5 min buffer)
      if (this.accessToken && Date.now() < this.accessTokenExpiry - 300000) {
        console.log('Using existing Mail360 access token');
        return this.accessToken;
      }

      console.log('Attempting to refresh Mail360 access token', {
        clientIdExists: !!Mail360Config.clientId,
        clientSecretExists: !!Mail360Config.clientSecret,
        refreshTokenExists: !!Mail360Config.refreshToken,
        attempt: retryCount + 1,
        clientIdLength: Mail360Config.clientId?.length,
        refreshTokenLength: Mail360Config.refreshToken?.length
      });

      // Prepare request exactly as per Mail360 documentation
      const response = await fetch('https://mail360.zoho.com/api/access-token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: Mail360Config.refreshToken,
          client_id: Mail360Config.clientId,
          client_secret: Mail360Config.clientSecret
        }),
      });

      const responseText = await response.text();
      console.log('Raw token response:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse token response:', {
          responseText,
          error: e instanceof Error ? e.message : String(e)
        });
        throw new Error('Invalid JSON response from Mail360');
      }

      console.log('Token refresh response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        responseData
      });

      if (!response.ok) {
        console.error('Failed to refresh Mail360 access token:', {
          status: response.status,
          statusText: response.statusText,
          responseData,
          attempt: retryCount + 1,
        });
        
        if (retryCount < maxRetries) {
          const delay = (retryCount + 1) * 2000;
          console.log(`Waiting ${delay}ms before retry ${retryCount + 1}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.getAccessToken(retryCount + 1);
        }
        
        throw new Error(`Failed to refresh Mail360 access token: ${responseData?.status?.description || response.statusText}`);
      }

      const validatedData = Mail360TokenResponse.parse(responseData);

      this.accessToken = validatedData.data.access_token;
      this.accessTokenExpiry = Date.now() + ((validatedData.data.expires_in_sec || 3600) * 1000);

      return this.accessToken;
    } catch (error) {
      console.error('Error in getAccessToken:', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        attempt: retryCount + 1,
      });
      
      if (retryCount < maxRetries) {
        const delay = (retryCount + 1) * 2000;
        console.log(`Waiting ${delay}ms before retry ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.getAccessToken(retryCount + 1);
      }
      
      throw error;
    }
  }

  async addSyncAccount(params: {
    emailid: string;
    accountType: number;
    incomingUser: string;
    incomingPasswd: string;
    incomingServer: string;
    incomingServerPort: number;
    isCustomSmtp: boolean;
    outgoingServer: string;
    outgoingServerPort: number;
    smtpConnection: number;
    outgoingAuth: boolean;
    outgoingUser: string;
    outgoingPasswd: string;
    gmailTypeSync: boolean;
  }): Promise<string> {
    const accessToken = await this.getAccessToken();

    // Add delay between requests in bulk operations
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send parameters directly without string conversion
    const apiParams = {
      ...params,
      webhookUrl: 'https://app.messagelm.com/api/webhooks/mail360'
    };

    const response = await fetch('https://mail360.zoho.com/api/accounts', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
      },
      body: JSON.stringify(apiParams),
    });

    const responseText = await response.text();
    console.log('Account creation response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText,
    });

    if (!response.ok) {
      console.error('Failed to create Mail360 account:', {
        status: response.status,
        statusText: response.statusText,
        responseBody: responseText,
        params: { ...params, incomingPasswd: '***', outgoingPasswd: '***' }
      });
      throw new Error(`Failed to create Mail360 account: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    const validatedData = Mail360AccountResponse.parse(data);

    return validatedData.data.account_key;
  }

  async deleteAccount(accountKey: string): Promise<void> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`https://mail360.zoho.com/api/accounts/${accountKey}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
      },
    });

    const responseText = await response.text();
    console.log('Account deletion response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText,
      accountKey,
    });

    if (!response.ok) {
      console.error('Failed to delete Mail360 account:', {
        status: response.status,
        statusText: response.statusText,
        responseBody: responseText,
      });
      throw new Error(`Failed to delete Mail360 account: ${responseText}`);
    }
  }

  async updateAccountSettings(accountKey: string): Promise<void> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`https://mail360.zoho.com/api/accounts/${accountKey}/settings`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
      },
      body: JSON.stringify({
        webhookUrl: 'https://app.messagelm.com/api/webhooks/mail360'
      }),
    });

    const responseText = await response.text();
    console.log('Account settings update response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText,
      accountKey,
    });

    if (!response.ok) {
      console.error('Failed to update Mail360 account settings:', {
        status: response.status,
        statusText: response.statusText,
        responseBody: responseText,
      });
      throw new Error(`Failed to update Mail360 account settings: ${responseText}`);
    }
  }

  async getMessage(accountKey: string, messageId: string) {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`https://mail360.zoho.com/api/accounts/${accountKey}/messages/${messageId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
      },
    });

    const responseText = await response.text();
    console.log('Get message response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText,
    });

    if (!response.ok) {
      console.error('Failed to get Mail360 message:', {
        status: response.status,
        statusText: response.statusText,
        responseBody: responseText,
      });
      throw new Error(`Failed to get Mail360 message: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    const validatedData = Mail360MessageResponse.parse(data);

    return validatedData.data;
  }

  async getMessageContent(accountKey: string, messageId: string) {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`https://mail360.zoho.com/api/accounts/${accountKey}/messages/${messageId}/content`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
      },
    });

    const responseText = await response.text();
    console.log('Get message content response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText,
    });

    if (!response.ok) {
      console.error('Failed to get Mail360 message content:', {
        status: response.status,
        statusText: response.statusText,
        responseBody: responseText,
      });
      throw new Error(`Failed to get Mail360 message content: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    const validatedData = Mail360MessageContentResponse.parse(data);

    return validatedData.data;
  }

  async sendReply(params: {
    accountKey: string,
    messageId: string,
    fromAddress: string,
    content: string,
    subject?: string,
    action?: 'reply' | 'replyall' | 'forward',
    toAddress?: string,
    ccAddress?: string,
    bccAddress?: string,
    mailFormat?: 'html' | 'plaintext',
  }) {
    console.log('Starting Mail360 reply process with params:', {
      accountKey: params.accountKey,
      messageId: params.messageId,
      fromAddress: params.fromAddress,
      toAddress: params.toAddress,
      subject: params.subject,
      action: params.action,
      contentLength: params.content.length
    });

    const accessToken = await this.getAccessToken();

    // Prepare request body exactly as per Mail360 documentation
    const requestBody = {
      fromAddress: params.fromAddress,
      content: params.content,
      subject: params.subject,
      action: params.action || 'reply',
      toAddress: params.toAddress,
      ccAddress: params.ccAddress,
      bccAddress: params.bccAddress,
      mailFormat: params.mailFormat || 'html'
    };

    const url = `https://mail360.zoho.com/api/accounts/${params.accountKey}/messages/${params.messageId}`;
    console.log('Sending Mail360 reply to URL:', url);

    console.log('Mail360 request headers:', {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Zoho-oauthtoken [REDACTED]'
    });

    console.log('Mail360 request body:', {
      ...requestBody,
      content: requestBody.content.slice(0, 100) + '...' // Log first 100 chars of content
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('Raw Mail360 response:', responseText);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Mail360 reply response:', {
        responseText,
        error: e instanceof Error ? {
          message: e.message,
          stack: e.stack,
          name: e.name
        } : e
      });
      throw new Error('Invalid JSON response from Mail360');
    }

    console.log('Mail360 reply response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      responseData
    });

    if (!response.ok) {
      console.error('Failed to send Mail360 reply:', {
        url,
        status: response.status,
        statusText: response.statusText,
        responseData,
        requestBody: {
          ...requestBody,
          content: requestBody.content.slice(0, 100) + '...'
        }
      });
      throw new Error(`Failed to send Mail360 reply: ${responseData?.status?.description || response.statusText}`);
    }

    const validatedData = Mail360ReplyResponse.parse(responseData);
    return validatedData.data;
  }
} 