# HubSpot Dashboard

A modern dashboard for tracking HubSpot scenarios and contact engagement metrics.

## Features

- View current active scenarios and contact counts
- Track past scenarios with response rates
- Monitor lifecycle stages of contacts
- Real-time connection with HubSpot API
- Responsive design with HubSpot styling

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   HUBSPOT_CLIENT_ID=your_client_id
   HUBSPOT_CLIENT_SECRET=your_client_secret
   HUBSPOT_REDIRECT_URI=your_redirect_uri
   NEXTAUTH_URL=your_app_url
   NEXTAUTH_SECRET=your_nextauth_secret
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

- `HUBSPOT_CLIENT_ID`: Your HubSpot app's client ID
- `HUBSPOT_CLIENT_SECRET`: Your HubSpot app's client secret
- `HUBSPOT_REDIRECT_URI`: OAuth redirect URI (e.g., http://localhost:3000/api/auth/callback/hubspot for local development)
- `NEXTAUTH_URL`: Your application's base URL
- `NEXTAUTH_SECRET`: A secret string for NextAuth.js (generate one with `openssl rand -base64 32`)

## Deployment

This application is configured for deployment on Vercel. Simply connect your GitHub repository to Vercel and add the required environment variables in the Vercel dashboard.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- NextAuth.js
- HubSpot API
