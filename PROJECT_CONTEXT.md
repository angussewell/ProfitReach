# Project Context

> Auto-generated context file for LLM consumption. Last updated: 2025-07-23

## Project Overview

**Name**: ProfitReach V1 (formerly MessageLM, now TempShift)
**Type**: SaaS Application
**Description**: A multi-tenant SaaS platform for automated outbound communication management with AI-enhanced capabilities. Integrates with GoHighLevel CRM and provides webhook-based workflow automation, contact management, multi-channel outreach features, and real-time analytics.
**Primary Language**: TypeScript/JavaScript
**Status**: Active (based on recent commits)

## Architecture

### Technology Stack
- **Runtime**: Node.js (inferred from package.json)
- **Framework**: Next.js 14.1.0 with App Router
- **Database**: PostgreSQL with Prisma ORM 6.3.0
- **Frontend**: React 18.2.0, TypeScript 5.8.3, Tailwind CSS 3.3.5
- **Authentication**: NextAuth.js v4.24.11 with JWT strategy
- **UI Components**: Radix UI, shadcn/ui, Headless UI
- **Testing**: Limited coverage (only follow-up-queue.test.tsx mentioned)
- **Build Tools**: Next.js build system, PostCSS, ESLint

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── (authenticated)/    # Protected routes requiring auth
│   ├── admin/             # Admin panel features
│   ├── api/               # API routes
│   └── auth/              # Authentication pages
├── components/            # React components
│   ├── ui/                # Base UI components (shadcn/ui)
│   └── [features]/        # Feature-specific components
├── contexts/              # React Context providers
├── lib/                   # Core utilities and services
│   ├── auth/              # Authentication helpers
│   ├── appointments/      # Appointment management
│   └── csv-templates/     # CSV import/export templates
├── types/                 # TypeScript type definitions
└── uuid/                  # UUID generation utilities

prisma/
├── schema.prisma          # Database schema
└── migrations/            # Database migration history
```

### Key Components
1. **Multi-tenant Organization System**: Users belong to organizations with role-based access control
2. **Webhook Processing Engine**: Receives and processes webhooks from GoHighLevel based on scenarios
3. **Scenario Management**: Complex conditional filtering with AND/OR logic for workflow automation
4. **Contact Management System**: Bulk operations, imports, filtering, and CRM synchronization
5. **AI Integration Layer**: AI-powered suggestions and chat functionality with real-time processing

## Core Functionality

### Primary Features
1. **Webhook Automation**: Process incoming webhooks from GoHighLevel and trigger automated workflows based on configurable scenarios with complex filtering logic
2. **Contact Management**: Import, filter, tag, and manage contacts with bulk operations and CRM synchronization capabilities
3. **Multi-channel Outreach**: Email and LinkedIn integration via Unipile, with appointment scheduling and follow-up automation
4. **AI-Enhanced Features**: AI suggestions for communication, chat interface, and research automation via Perplexity API
5. **Admin Dashboard**: Analytics, follow-up queue management, task tracking, and system monitoring

### API/Interface
- RESTful API endpoints under `/api/` for all backend operations
- Webhook endpoints for GoHighLevel integration
- Authentication endpoints via NextAuth.js
- Stripe webhook handlers for payment processing
- Real-time data sync endpoints for CRM integration

### Data Flow
1. Webhooks received from GoHighLevel → Processed by scenario filters → Actions triggered
2. User actions → API requests → Database operations via Prisma → Response to frontend
3. Authentication flow: Login → JWT token generation → Session management → Protected route access
4. Payment flow: Stripe checkout → Webhook processing → Subscription status update

## Development

### Setup Requirements
- Node.js (version not specified, likely 18+)
- PostgreSQL database (using Neon cloud)
- Environment variables for authentication, database, and third-party services
- npm or compatible package manager

### Quick Start
```bash
# Installation
npm install

# Development
npm run dev          # Starts dev server on port 3000 (ensures admin user exists)

# Testing
# No test runner configured - limited test coverage

# Build
npm run build        # Builds the Next.js application
npm run start        # Starts production server
```

### Key Scripts
- `dev`: Start development server with admin user check
- `build`: Build production bundle
- `start`: Start production server
- `lint`: Run ESLint
- `postinstall`: Generate Prisma client
- `db:seed`: Seed database with initial data
- `create-admin`: Create/ensure admin users exist

## Configuration

### Environment Variables
Key environment variables required (based on code analysis):
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Application URL for authentication
- `NEXTAUTH_SECRET`: Secret for JWT signing
- `STRIPE_SECRET_KEY`: Stripe API key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook verification
- Various integration API keys (GoHighLevel, Unipile, Perplexity)

### Important Files
- `next.config.js`: Next.js configuration
- `tailwind.config.js`: Tailwind CSS configuration
- `prisma/schema.prisma`: Database schema definition
- `CLAUDE.md`: AI assistant guidance for codebase

## Architecture Decisions

### Design Patterns
- **Multi-tenant SaaS**: Organization-based data isolation with role-based access
- **App Router Pattern**: Using Next.js 14 App Router for routing and layouts
- **Component-based Architecture**: Reusable UI components with shadcn/ui
- **Context-based State Management**: React Context for organization and auth state
- **Repository Pattern**: Centralized data access through Prisma ORM

### Code Style
- TypeScript for type safety
- Functional React components with hooks
- Tailwind CSS for styling with utility-first approach
- ESLint for code quality
- Path aliases (@/, @/components/, @/lib/, @/types/)

### Dependencies
**Production** (Key ones only):
- `next`: React framework with SSR/SSG capabilities
- `@prisma/client`: Database ORM client
- `next-auth`: Authentication solution
- `stripe`: Payment processing
- `react-hook-form`: Form management with validation
- `zod`: Schema validation
- `axios`: HTTP client for API calls

**Development**:
- `typescript`: Type checking
- `tailwindcss`: Utility-first CSS framework
- `eslint`: Code linting
- `prisma`: Database toolkit

## Domain Context

### Business Logic
- Scenario-based webhook processing with complex AND/OR filter conditions
- Contact qualification and routing based on configurable rules
- Multi-channel communication orchestration
- Subscription-based billing with usage tracking
- Organization-level data isolation and permissions

### Data Models
Key entities and relationships:
- **Organization**: Central tenant entity
- **User**: Belongs to organizations with roles
- **Scenario**: Webhook processing rules with filters
- **Contact**: CRM contact records
- **WebhookLog**: Audit trail of webhook processing
- **EmailAccount**: Integrated email accounts via Unipile
- **BillingEvent**: Stripe payment and subscription events

### External Integrations
- **GoHighLevel CRM**: Primary CRM integration for contacts and webhooks
- **Stripe**: Payment processing and subscription management
- **Unipile**: Email and LinkedIn integration API
- **Perplexity API**: AI-powered research capabilities
- **n8n**: Workflow automation webhooks

## Maintenance Notes

### Known Patterns
- "Ship fast" mentality - MVP-focused development
- Files kept under 200 lines (ideally under 150)
- Test after every meaningful change approach
- Minimal test coverage currently exists

### Areas of Complexity
- **Webhook Processing**: Complex scenario filtering logic with nested conditions
- **Multi-tenant Data Access**: Ensuring proper organization isolation
- **Authentication Flow**: JWT-based auth with NextAuth.js configuration
- **Real-time Integrations**: Managing multiple webhook sources and destinations

### Technical Debt
- Limited test coverage (only one test file found)
- Recent rebranding artifacts (MessageLM → TempShift)
- Multiple authentication bug fixes in recent commits suggest auth complexity
- Database migration history shows rapid feature iteration

## LLM Interaction Guidelines

When working with this codebase:
1. **Follow existing patterns** for file organization under src/app/ for pages and src/components/ for components
2. **Maintain consistency** with TypeScript types and Tailwind CSS utility classes
3. **Test changes** manually as automated test coverage is limited
4. **Update documentation** in CLAUDE.md for significant architectural changes

### Common Tasks
- **Add a new feature**: Create pages under src/app/(authenticated)/, add API routes under src/app/api/, update Prisma schema if needed
- **Fix a bug**: Check recent commits for similar issues, test authentication flows carefully, verify organization data isolation
- **Update dependencies**: Run npm update carefully, check for breaking changes in Next.js, Prisma, and NextAuth.js

## Context Metadata

- **Analysis Date**: 2025-07-23
- **Repository Size**: ~50 source files (excluding node_modules)
- **Folder Count**: Multiple nested directories
- **Commit Count**: Active development (recent auth fixes)
- **Primary Contributors**: Not specified
- **License**: Not specified (private: true in package.json)