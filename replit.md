# Sistema Bolzoni - Management Platform

## Overview

Sistema Bolzoni is a comprehensive business management platform for Bolzoni Produções, a company specializing in children's recreation and entertainment events. Developed by HAVR Tecnologia, the system centralizes administrative and operational management, covering financial control, inventory, client relationships, employee scheduling, event coordination, and procurement. It aims to streamline operations and enhance efficiency for the client.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React 18 and TypeScript, using Vite for bundling. UI components leverage Shadcn/UI and Radix UI primitives, styled with TailwindCSS following an enterprise design approach. State management primarily uses TanStack Query for server state, avoiding global state libraries. Forms are handled with React Hook Form and Zod for validation, integrated with Drizzle. Recharts is used for data visualization.

### Backend Architecture

The backend is an Express.js application written in TypeScript, featuring a modular route structure and custom logging. Authentication is handled via stateless JWTs with `bcryptjs` for password hashing. The API follows RESTful principles with consistent response patterns and error handling. The backend is bundled with esbuild for production deployment.

### Data Storage

PostgreSQL is the primary relational database, utilized with Neon Serverless PostgreSQL for connectivity. Drizzle ORM provides type-safe query building and schema management, with migrations handled by Drizzle Kit. The system manages ten core entities: Users, Clients, Employees, Events, Inventory Items, Financial Transactions, Purchases, Event Categories, Employee Roles, and Services, with defined relationships between them.

### System Design Choices

The platform includes a comprehensive agenda/calendar module with monthly, weekly, and yearly views, automatically integrating event data. Enhanced address management for events, employees, and clients integrates with the ViaCEP API for automatic completion. Financial features include a two-tier fee calculation system for credit card installments (operator fee and compound interest) and an automatic cachê payment system that generates financial transactions for employees based on event participation. The client and employee modules have been enhanced with detailed personal and address information. A robust reports module allows CSV export of data across all modules. Interactive agenda events provide detailed information via modals.

## External Dependencies

**Core Infrastructure:**
- Neon PostgreSQL database (serverless hosting)
- Contabo VPS servers (Ubuntu 22.04 LTS) for deployment

**Third-Party UI Libraries:**
- Radix UI
- Lucide React
- date-fns
- Recharts

**Third-Party APIs:**
- ViaCEP (Brazilian postal code lookup)

**Development Tools:**
- TypeScript
- PostCSS with Autoprefixer

**Authentication:**
- JWT (custom implementation)