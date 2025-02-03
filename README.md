# ProfitReach

Production URL: https://profit-reach.vercel.app

A Next.js application for managing cold outreach campaigns through GoHighLevel integration.

# MessageLM

## Admin Setup

To set up or reset admin users, run:
```bash
npx ts-node src/scripts/setup-admin-users.ts
```

This will:
- Create two admin users with their respective organizations
- Set up proper permissions and roles
- Configure the necessary database relationships

Admin credentials:
- Angus (Alpine Gen): `angus@alpinegen.com`
- Oma (MessageLM): `omanwanyanwu@gmail.com`
