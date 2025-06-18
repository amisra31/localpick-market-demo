# LocalPick Marketplace

## Overview

LocalPick is a full-stack web application that serves as a marketplace platform connecting local shops with customers. The application allows customers to browse products from local businesses and make reservations, while shop owners can manage their inventory and track customer reservations. The system also includes administrative functionality for platform oversight.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Query (TanStack Query) for server state management
- **Routing**: React Router for client-side navigation
- **Authentication**: Context-based authentication system with Supabase integration

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple
- **Development**: Hot module replacement with Vite middleware integration

### Build and Development
- **Development Server**: Concurrent frontend (Vite) and backend (Express) serving
- **Production Build**: Vite builds frontend assets, esbuild bundles backend
- **TypeScript**: Shared types between frontend and backend via shared directory

## Key Components

### Database Schema
- **Users Table**: Core user authentication with username/password
- **Schema Location**: `shared/schema.ts` using Drizzle ORM
- **Type Safety**: Zod validation schemas generated from database schema

### Authentication System
- **Multi-role Support**: User, Merchant, and Admin roles
- **Supabase Integration**: Ready for production authentication
- **Development Mode**: Mock authentication for development/testing
- **Protected Routes**: Role-based route protection

### Data Management
- **Development Storage**: In-memory storage with mock data service
- **Production Ready**: Drizzle ORM configured for PostgreSQL
- **Mock Data**: Comprehensive test data for development

### UI Components
- **Design System**: Consistent component library with theming
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Accessibility**: Radix UI primitives ensure accessibility compliance
- **Form Handling**: React Hook Form with Zod validation

## Data Flow

1. **Client Requests**: React Router handles navigation
2. **API Calls**: React Query manages HTTP requests to Express backend
3. **Authentication**: Context provider manages user state across application
4. **Data Storage**: Drizzle ORM interfaces with PostgreSQL database
5. **State Updates**: React Query cache invalidation triggers UI updates

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **@supabase/supabase-js**: Authentication and user management
- **@tanstack/react-query**: Server state management
- **drizzle-orm**: Type-safe database ORM
- **express**: Web application framework

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **class-variance-authority**: Component variant management

### Development Dependencies
- **vite**: Build tool and development server
- **tsx**: TypeScript execution for development
- **esbuild**: JavaScript bundler for production

## Deployment Strategy

### Replit Configuration
- **Modules**: Node.js 20, Web, PostgreSQL 16
- **Development**: `npm run dev` starts both frontend and backend
- **Production**: `npm run build` creates optimized bundles
- **Port Configuration**: Express serves on port 5000, exposed as port 80

### Build Process
1. **Frontend Build**: Vite builds React application to `dist/public`
2. **Backend Build**: esbuild bundles Express server to `dist/index.js`
3. **Static Serving**: Express serves frontend assets in production

### Environment Requirements
- **DATABASE_URL**: PostgreSQL connection string (required)
- **NODE_ENV**: Environment mode (development/production)
- **Supabase Credentials**: For production authentication

## Changelog

```
Changelog:
- June 18, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```