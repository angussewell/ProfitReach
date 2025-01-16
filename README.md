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
   HUBSPOT_PRIVATE_APP_TOKEN=your_private_app_token
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

- `HUBSPOT_PRIVATE_APP_TOKEN`: Your HubSpot private app token (generate one in your HubSpot developer account)

## Deployment

This application is configured for deployment on Vercel. Simply connect your GitHub repository to Vercel and add the required environment variables in the Vercel dashboard.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- HubSpot API
