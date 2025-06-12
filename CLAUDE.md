# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ProfitReach V1 (formerly MessageLM, now rebranded as TempShift) is a SaaS application for automated outbound communication management with AI-enhanced capabilities. It integrates with GoHighLevel CRM and provides webhook-based workflow automation, contact management, and multi-channel outreach features.

## Common Development Commands

```bash
# Development
npm run dev          # Starts dev server on port 3000 (ensures admin user exists)

# Building and Production
npm run build        # Builds the Next.js application
npm run start        # Starts production server

# Code Quality
npm run lint         # Runs ESLint

# Database
npm run db:seed      # Seeds database with initial data
npm run create-admin # Creates/ensures admin users exist
npx prisma generate  # Regenerates Prisma client after schema changes
npx prisma migrate dev # Run database migrations in development
npx prisma studio    # Opens Prisma Studio for database inspection

# Testing (limited test coverage - only follow-up-queue.test.tsx exists)
# No test runner configured - would need to add Jest/Vitest if more tests are needed
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14.1.0 with App Router, React 18.2.0, TypeScript
- **UI**: Tailwind CSS, shadcn/ui components, Radix UI primitives
- **Database**: PostgreSQL (Neon) with Prisma ORM
- **Authentication**: NextAuth.js v4 with JWT tokens
- **State Management**: React Context (OrganizationContext)
- **Payments**: Stripe integration
- **Real-time**: Webhook-based integrations

### Key Directory Structure

- `/src/app/` - Next.js App Router pages
  - `(authenticated)/` - Protected routes requiring authentication
  - `admin/` - Admin panel features (analytics, follow-up queue, task management)
  - `api/` - API routes for backend functionality
  - `auth/` - Authentication pages

- `/src/components/` - React components
  - `ui/` - Base UI components from shadcn/ui
  - Feature-specific components organized by domain

- `/src/lib/` - Core utilities and services
  - Database connections, auth helpers, encryption, API clients

- `/prisma/` - Database schema and migrations

### Core Application Flow

1. **Multi-tenant Architecture**: Users belong to organizations with role-based access
2. **Webhook Processing**: Receives webhooks from GoHighLevel, processes contacts based on scenarios
3. **Scenario Management**: Complex conditional filtering with AND/OR logic for workflow automation
4. **Contact Management**: Bulk operations, imports, filtering, and CRM synchronization
5. **AI Features**: AI-powered suggestions and chat functionality
6. **Email/Social Integration**: Email accounts and LinkedIn integration via Unipile

### Important Context from .cursorrules

The project follows a "ship fast" mentality with these principles:
- Avoid overengineering - build simple MVPs
- Keep files under 200 lines (ideally under 150)
- Test after every meaningful change
- Focus on core features before optimization

When fixing errors:
1. Write detailed analysis paragraphs considering multiple causes
2. Explain the error in plain English
3. Fix with minimal code changes
4. Provide clear testing instructions

### Authentication & Security

- Uses NextAuth.js with JWT strategy
- Admin users are created via setup scripts
- Multi-organization support with role-based permissions
- Environment variables for sensitive configuration

### Database Considerations

- Uses Prisma with PostgreSQL (Neon)
- Extensive migration history showing feature evolution
- Complex relationships between users, organizations, scenarios, and webhooks
- JSON fields for flexible data storage (filters, metadata)

### Integration Points

1. **GoHighLevel CRM**: Primary integration for contact management and webhooks
2. **Stripe**: Payment processing and subscription management
3. **Unipile**: Email and LinkedIn integration
4. **Perplexity API**: Research automation capabilities
5. **Various webhook endpoints**: For real-time data synchronization

### Development Notes

- The codebase shows signs of rapid iteration and rebranding (MessageLM → TempShift)
- Limited test coverage - consider adding tests for critical paths
- Uses path aliases (@/, @/components/, @/lib/, @/types/)
- Dark mode support throughout the UI
- Real-time features implemented via webhooks rather than WebSockets