# LocalPick Market - Replit Configuration

## Overview
LocalPick Market is a comprehensive multi-role marketplace application that connects local shops with customers in the Mariposa/Yosemite area. The application supports three distinct user roles: customers, merchants, and administrators, each with their own specialized interfaces and capabilities.

## System Architecture

### Technology Stack
- **Frontend**: React 18 with TypeScript
- **Backend**: Express.js with TypeScript
- **Database**: SQLite (local development) / PostgreSQL (production via Neon)
- **ORM**: Drizzle ORM
- **Authentication**: Supabase Auth
- **UI Framework**: shadcn/ui with Tailwind CSS
- **Build Tool**: Vite
- **WebSocket**: Native WebSocket implementation for real-time features

### Architecture Pattern
The application follows a modern monorepo structure with clear separation between client and server:
- **Shared**: Common types and database schema
- **Client**: React frontend with role-based routing
- **Server**: Express API with modular route handlers

## Key Components

### Database Layer
- **Schema Definition**: Centralized in `shared/schema.ts` using Drizzle ORM
- **Tables**: users, shops, products, orders, order_messages, direct_messages, reservations, operating_hours
- **Database Adapters**: Both SQLite (development) and PostgreSQL (production) support
- **Migration System**: Drizzle Kit for schema migrations

### Authentication System
- **Provider**: Supabase Auth with custom user roles
- **Role Types**: `admin`, `merchant`, `user`
- **JWT Integration**: Server-side token validation
- **Route Protection**: Role-based access control middleware

### Real-time Features
- **WebSocket Server**: Custom implementation for live chat and notifications
- **Message System**: Customer-merchant direct messaging
- **Order Updates**: Real-time order status notifications
- **Product Sync**: Live inventory updates

### API Architecture
- **RESTful Design**: Standard HTTP methods for CRUD operations
- **Modular Routes**: Separate route handlers for shops, products, orders, messages
- **Input Validation**: Zod schema validation with sanitization
- **Rate Limiting**: Protection against abuse
- **Image Proxy**: Server-side image handling for external URLs

## Data Flow

### User Registration & Authentication
1. User registers via Supabase Auth with role selection
2. Email verification required for account activation
3. JWT tokens issued for authenticated sessions
4. Role-based redirection to appropriate dashboards

### Shop Management (Merchants)
1. Merchants create and manage their shop profiles
2. Product inventory management with stock tracking
3. Order processing and customer communication
4. Real-time notifications for new orders/messages

### Customer Experience
1. Browse products across all approved shops
2. Location-based shop discovery
3. Product reservations and order management
4. Direct messaging with merchants

### Admin Operations
1. Shop approval workflow management
2. Comprehensive CRUD operations for all entities
3. Bulk data operations and analytics
4. System-wide monitoring and maintenance

## External Dependencies

### Third-party Services
- **Supabase**: Authentication and user management
- **Neon Database**: Production PostgreSQL hosting
- **Google Maps**: Location services and mapping (configured but optional)
- **Nominatim/OpenStreetMap**: Location search and geocoding

### Image Handling
- **Google Drive**: Support for shared image URLs with automatic conversion
- **Proxy Service**: Server-side image caching and processing
- **Fallback System**: Graceful handling of broken image links

### Development Tools
- **Replit**: Primary development environment
- **Vite**: Fast development server and build tool
- **ESBuild**: Production bundling
- **TypeScript**: Type safety across the entire stack

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20
- **Database**: SQLite for local development
- **Port**: 5000 (mapped to external port 80)
- **Hot Reload**: Vite development server with HMR

### Production Configuration
- **Build Command**: `npm run build` (Vite + ESBuild)
- **Start Command**: `npm run start` (Production server)
- **Database**: PostgreSQL via Neon (configured via DATABASE_URL)
- **Deployment**: Autoscale deployment target

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (Neon)
- `JWT_SECRET`: Token signing secret
- `NODE_ENV`: Environment designation
- `LOG_LEVEL`: Logging verbosity control

## Changelog
- June 26, 2025. Initial setup

## User Preferences
Preferred communication style: Simple, everyday language.