# Sistema Bolzoni - Management Platform

## Overview

Sistema Bolzoni is a comprehensive business management platform developed by HAVR Tecnologia for Bolzoni Produções, a company specializing in children's recreation and entertainment events. The system centralizes administrative and operational management across multiple domains including financial control, inventory management, client relationships, employee scheduling, event coordination, and procurement tracking.

The application is built as a full-stack TypeScript monorepo with a React frontend and Express backend, designed to run on VPS infrastructure (specifically Contabo Ubuntu 22.04 LTS servers).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for lightweight client-side routing (no React Router dependency)

**UI Design System:**
- Shadcn/UI component library with Radix UI primitives
- TailwindCSS for styling with custom design tokens
- Enterprise design approach inspired by Carbon Design System and Ant Design
- Custom color system with CSS variables supporting light/dark modes
- Typography hierarchy using Inter (primary) and JetBrains Mono (monospace for data)

**State Management:**
- TanStack Query (React Query) for server state management and caching
- Local component state with React hooks
- No global state management library (Redux/Zustand) - server state is the primary source of truth

**Form Handling:**
- React Hook Form for form state and validation
- Zod schemas for runtime type validation
- Integration with Drizzle schema validators via `drizzle-zod`

**Data Visualization:**
- Recharts library for charts and graphs on the dashboard

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript
- Modular route registration pattern
- Custom logging middleware for API requests

**Authentication & Security:**
- JWT (JSON Web Tokens) for stateless authentication
- bcryptjs for password hashing
- Token stored in localStorage on client, sent via Authorization header
- Authentication middleware protecting all API routes except login/register

**API Design:**
- RESTful endpoints under `/api` namespace
- Consistent response patterns with proper HTTP status codes
- Error handling with automatic 401 redirects on authentication failure

**Build Process:**
- Backend bundled using esbuild for production deployment
- ESM module format throughout the application
- Separate build outputs: frontend to `dist/public`, backend to `dist`

### Data Storage

**Database:**
- PostgreSQL as the primary relational database
- Neon Serverless PostgreSQL driver with WebSocket support
- Connection pooling via `@neondatabase/serverless`

**ORM & Migrations:**
- Drizzle ORM for type-safe database queries
- Schema-first approach with TypeScript definitions in `shared/schema.ts`
- Drizzle Kit for migration management (`db:push` command)
- Shared schema types between frontend and backend

**Data Model:**
The system manages nine core entities:
- **Users** - Admin and employee authentication with role-based access
- **Clients** - Customer contact information and relationship tracking
- **Employees** - Staff management with availability tracking
- **Events** - Event scheduling with client and contract associations
- **Inventory Items** - Stock management for consumables and character costumes
- **Financial Transactions** - Accounts payable/receivable with payment tracking
- **Purchases** - Procurement records with supplier information
- **Event Categories** - System configuration for event classification
- **Employee Roles** - System configuration for employee function definitions

**Relationships:**
- Events linked to clients and can have multiple employees and characters assigned
- Events can optionally be associated with an event category
- Financial transactions can be associated with events
- Purchases can reference inventory items
- Stock movements track inventory changes

**Recent Changes (November 2025):**
- **Database Connection:** Successfully configured external Neon PostgreSQL database connection. The system is now connected to the production Neon database instance hosted at sa-east-1 (South America region) via secure SSL connection with channel binding.
- **Agenda Module:** Implemented comprehensive agenda/calendar module with three visualization modes:
  - Monthly view: Full calendar grid showing all events for the month with event counts per day
  - Weekly view: Detailed hour-by-hour schedule showing events organized by day and time
  - Yearly view: Overview of all 12 months with event indicators and counts
  - Automatic integration with events - new events appear in agenda automatically based on their date/time
  - Navigation controls to move between periods (prev/next) and quick "Today" button
  - Event search improvements: Added real-time search with autocomplete for character selection in event forms to handle large inventories efficiently
- Added event category field to events table - events can now be categorized using categories configured in the settings module
- Database schema updated with categoryId field (nullable) in events table referencing event_categories
- Event creation/edit form enhanced with category selector pulling from settings
- Updated color scheme: Primary button color changed to match sidebar color (#6C5584), background color changed to white (#FFFFFF) for a cleaner, more cohesive design

### External Dependencies

**Core Infrastructure:**
- Neon PostgreSQL database (serverless PostgreSQL hosting)
- Deployment target: Contabo VPS servers running Ubuntu 22.04 LTS

**Third-Party UI Libraries:**
- Radix UI - Comprehensive set of unstyled, accessible UI primitives
- Lucide React - Icon library
- date-fns - Date formatting and manipulation with Portuguese (Brazil) locale support
- Recharts - Chart components for data visualization

**Development Tools:**
- Replit-specific plugins for development environment integration
- TypeScript for static type checking across the stack
- PostCSS with Autoprefixer for CSS processing

**Authentication:**
- JWT tokens with configurable secret (SESSION_SECRET environment variable)
- No third-party authentication service - custom implementation

**Deployment Configuration:**
- Environment variables required: `DATABASE_URL` (configured with Neon PostgreSQL connection), `SESSION_SECRET`
- DATABASE_URL is configured as a Replit secret for secure credential management
- Production build creates static assets and bundled server
- Single process Node.js server serves both API and static files in production
- Database connection uses SSL with channel binding for enhanced security