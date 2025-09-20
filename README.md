# Document Management System (DMS)

A production-ready Document Management System for merchants with secure JWT authentication, role-based authorization, KYC verification, and comprehensive audit logging.

## Features

### 🔐 Authentication & Authorization
- JWT-based authentication with access + refresh tokens
- Role-based access control (RBAC)
- Optional TOTP 2FA support
- Secure password hashing with Argon2id

### 👥 User Management
- Multi-tenant architecture with merchant isolation
- User invitation system
- Role assignment and management
- Account activation/deactivation

### 📄 Document Management
- Secure document upload via presigned URLs
- Document categorization (KYC, Contracts, Invoices, etc.)
- Version control and metadata tracking
- Soft delete with retention policies

### 🏢 Merchant Onboarding
- Business registration and profile management
- KYC verification (PAN & Aadhaar)
- Merchant dashboard with status overview

### 📊 Admin Features
- System-wide merchant management
- Verification queue monitoring
- Comprehensive audit logging
- System statistics and health monitoring

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **TanStack Query** for data fetching
- **React Router** for navigation
- **Tailwind CSS** + **Radix UI** for styling
- **Zod** for validation

### Backend
- **Node.js 20+** with TypeScript
- **Express 4+** web framework
- **Prisma ORM** with PostgreSQL
- **JWT** for authentication
- **Argon2** for password hashing
- **AWS S3** compatible storage

### Database
- **PostgreSQL 15+**
- Comprehensive schema with audit trails
- Row-level security considerations

### DevOps
- **Docker Compose** for local development
- **MinIO** for S3-compatible storage
- Health checks and monitoring

## Quick Start

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- PostgreSQL (or use Docker)

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start services with Docker:**
```bash
docker-compose up -d db minio
```

4. **Set up database:**
```bash
npm run db:push
npm run db:seed
```

5. **Start development servers:**
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- MinIO Console: http://localhost:9001

### Test Credentials

After seeding, you can use these credentials:

- **Admin:** admin@dms.com / admin123456789
- **Merchant Admin:** admin@acmecorp.com / merchant123456789

## API Documentation

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout`- User logout
- `POST /api/auth/2fa/setup` - Setup 2FA
- `POST /api/auth/2fa/verify` - Verify 2FA

### Merchant Endpoints

- `GET /api/merchants/:id` - Get merchant details
- `PATCH /api/merchants/:id` - Update merchant
- `GET /api/merchants/:id/summary` - Dashboard summary

### Document Endpoints

- `POST /api/docs/presign` - Get upload URL
- `POST /api/docs` - Save document metadata
- `GET /api/docs` - List documents
- `GET /api/docs/:id/download` - Get download URL
- `DELETE /api/docs/:id` - Delete document

### KYC Endpoints

- `POST /api/kyc/pan/verify` - Verify PAN
- `POST /api/kyc/aadhaar/otp/init` - Send Aadhaar OTP
- `POST /api/kyc/aadhaar/otp/verify` - Verify Aadhaar OTP
- `GET /api/kyc/status` - Get KYC status

## Security Features

### Data Protection
- All sensitive data encrypted in transit (TLS)
- Password hashing with Argon2id
- Secure token storage (HttpOnly cookies)
- Input validation with Zod schemas

### Access Control
- Role-based permissions system
- Merchant data isolation
- API rate limiting
- CSRF protection

### Audit & Compliance
- Comprehensive audit logging
- PII masking in logs
- Secure document storage
- Data retention policies

## Development

### Project Structure
```
├── backend/                 # Express API server
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── middleware/     # Auth & validation middleware
│   │   ├── services/       # Business logic
│   │   └── types/          # TypeScript definitions
│   └── prisma/             # Database schema & migrations
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── pages/             # Page components
│   ├── contexts/          # React contexts
│   ├── services/          # API client
│   └── hooks/             # Custom hooks
└── docker-compose.yml     # Local development setup
```

### Available Scripts

- `npm run dev` - Start both frontend and backend
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with test data
- minio.exe server C:\minio-data - Rn minio server

### Testing

Run the test suite:
```bash
npm run test
npm run test:api
```

### Database Management

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Create and run migrations
npm run db:migrate

# Seed with test data
npm run db:seed
```

## Production Deployment

### Environment Variables

Ensure these are set in production:

```bash
NODE_ENV=production
DATABASE_URL="postgresql://..."
JWT_ACCESS_SECRET="very-long-random-secret"
S3_ENDPOINT="https://s3.amazonaws.com"
S3_BUCKET="your-production-bucket"
S3_ACCESS_KEY="your-access-key"
S3_SECRET_KEY="your-secret-key"
```

### Security Checklist

- [ ] Use strong JWT secrets (256+ bits)
- [ ] Enable HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Enable audit logging
- [ ] Configure S3 bucket policies
- [ ] Set up database backups
- [ ] Monitor system health

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.