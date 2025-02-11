import { headers } from 'next/headers';

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
} 