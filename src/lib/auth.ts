import { prisma } from './db';

const GHL_CLIENT_ID = process.env.NEXT_PUBLIC_GHL_CLIENT_ID;
const GHL_REDIRECT_URI = process.env.NEXT_PUBLIC_GHL_REDIRECT_URI;

export async function refreshToken(locationId: string) {
  const account = await prisma.account.findUnique({
    where: { ghl_location_id: locationId },
  });

  if (!account) {
    throw new Error('Account not found');
  }

  const tokenResponse = await fetch('https://services.gohighlevel.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: GHL_CLIENT_ID,
      client_secret: process.env.GHL_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: account.refresh_token,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to refresh token');
  }

  const { access_token, refresh_token, expires_in } = await tokenResponse.json();
  const token_expires_at = new Date(Date.now() + expires_in * 1000);

  return prisma.account.update({
    where: { ghl_location_id: locationId },
    data: {
      access_token,
      refresh_token,
      token_expires_at,
    },
  });
}

export async function getValidToken(locationId: string): Promise<string> {
  const account = await prisma.account.findUnique({
    where: { ghl_location_id: locationId },
  });

  if (!account) {
    throw new Error('Account not found');
  }

  if (account.token_expires_at > new Date()) {
    return account.access_token;
  }

  const refreshedAccount = await refreshToken(locationId);
  return refreshedAccount.access_token;
}

export const initiateGHLAuth = () => {
  const state = Math.random().toString(36).substring(7);
  localStorage.setItem('ghl_auth_state', state);
  
  const authUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&client_id=${GHL_CLIENT_ID}&redirect_uri=${GHL_REDIRECT_URI}&scope=businesses.readonly businesses.write&state=${state}`;
  
  window.location.href = authUrl;
}; 