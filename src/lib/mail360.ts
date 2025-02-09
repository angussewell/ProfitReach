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
        return this.accessToken;
      }

      console.log('Attempting to refresh Mail360 access token', {
        clientIdExists: !!Mail360Config.clientId,
        clientSecretExists: !!Mail360Config.clientSecret,
        refreshTokenExists: !!Mail360Config.refreshToken,
        attempt: retryCount + 1,
        clientId: Mail360Config.clientId,
        refreshToken: Mail360Config.refreshToken,
      });

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
      console.log('Token refresh response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
        requestBody: {
          refresh_token: Mail360Config.refreshToken,
          client_id: Mail360Config.clientId,
          client_secret: '***'
        }
      });

      if (!response.ok) {
        console.error('Failed to refresh Mail360 access token:', {
          status: response.status,
          statusText: response.statusText,
          responseBody: responseText,
          attempt: retryCount + 1,
        });
        
        if (retryCount < maxRetries) {
          // Increase delay between retries
          const delay = (retryCount + 1) * 2000; // 2s, 4s, 6s
          console.log(`Waiting ${delay}ms before retry ${retryCount + 1}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.getAccessToken(retryCount + 1);
        }
        
        throw new Error(`Failed to refresh Mail360 access token after ${maxRetries} attempts. Last response: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      const validatedData = Mail360TokenResponse.parse(data);

      this.accessToken = validatedData.data.access_token;
      this.accessTokenExpiry = Date.now() + ((validatedData.data.expires_in_sec || 3600) * 1000);

      return this.accessToken;
    } catch (error) {
      console.error('Error in getAccessToken:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
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
      ...params
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
      requestHeaders: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Zoho-oauthtoken [REDACTED]'
      }
    });

    if (!response.ok) {
      console.error('Failed to delete Mail360 account:', {
        status: response.status,
        statusText: response.statusText,
        responseBody: responseText,
        accountKey,
        requestUrl: `https://mail360.zoho.com/api/accounts/${accountKey}`
      });
      throw new Error(`Failed to delete Mail360 account (${response.status}): ${responseText}`);
    }

    try {
      const data = JSON.parse(responseText);
      if (data.status?.code !== 200) {
        throw new Error(`Mail360 API Error: ${data.status?.description || 'Unknown error'}`);
      }
    } catch (parseError) {
      console.error('Error parsing Mail360 response:', parseError);
      // If we can't parse the response but the status was OK, we'll consider it a success
      if (response.ok) return;
      throw new Error('Invalid response from Mail360 API');
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
} 