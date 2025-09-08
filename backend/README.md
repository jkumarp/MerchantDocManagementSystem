# Document Management System (DMS) Backend

A production-ready Document Management System backend with secure JWT authentication, role-based authorization, KYC verification, and comprehensive audit logging.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Docker and Docker Compose (optional)

### Installation

1. **Install dependencies:**
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

5. **Start development server:**
```bash
npm run dev:api
```

The API will be available at:
- **API Server:** http://localhost:8080
- **API Documentation:** http://localhost:8080/api-docs
- **Swagger JSON:** http://localhost:8080/swagger.json

## 📚 API Documentation

### Swagger UI
The API is fully documented using OpenAPI 3.0 specification. Access the interactive documentation at:

**http://localhost:8080/api-docs**

### Key Features:
- 🔐 **JWT Authentication** - Bearer token authentication with automatic token refresh
- 📋 **Complete API Coverage** - All endpoints documented with request/response schemas
- 🧪 **Interactive Testing** - Test API endpoints directly from the documentation
- 📄 **Exportable Spec** - Download OpenAPI spec as JSON from `/swagger.json`
- 🔒 **Security Schemas** - Proper authentication documentation for protected endpoints

### Authentication in Swagger
1. Click the **"Authorize"** button in Swagger UI
2. Enter your JWT token in the format: `Bearer your-jwt-token-here`
3. All authenticated endpoints will now include the authorization header

### Test Credentials
After running `npm run db:seed`:
- **Admin:** `admin@dms.com` / `admin123456789`
- **Merchant Admin:** `admin@acmecorp.com` / `merchant123456789`

## 🏗️ API Architecture

### Core Endpoints

#### Authentication (`/api/auth`)
- `POST /login` - User authentication with optional 2FA
- `POST /refresh` - Refresh access tokens
- `POST /logout` - Secure logout with token revocation
- `POST /2fa/setup` - Setup TOTP 2FA
- `POST /2fa/verify` - Verify and enable 2FA

#### Users (`/api/users`)
- `POST /` - Create/invite new users
- `GET /merchant/{id}` - List merchant users
- `PATCH /{id}` - Update user details
- `POST /accept-invite` - Accept user invitation

#### Merchants (`/api/merchants`)
- `POST /` - Create merchant (Admin only)
- `GET /{id}` - Get merchant details
- `PATCH /{id}` - Update merchant information
- `GET /{id}/summary` - Dashboard summary data
- `GET /` - List all merchants (Admin only)

#### Documents (`/api/docs`)
- `POST /presign` - Get S3 upload URL
- `POST /` - Save document metadata
- `GET /` - List documents with filtering
- `GET /{id}/download` - Get download URL
- `DELETE /{id}` - Soft delete document

#### KYC (`/api/kyc`)
- `POST /pan/verify` - Verify PAN card
- `POST /aadhaar/otp/init` - Send Aadhaar OTP
- `POST /aadhaar/otp/verify` - Verify Aadhaar OTP
- `GET /status` - Get KYC status

#### Admin (`/api/admin`)
- `GET /merchants` - List all merchants
- `GET /verifications/queue` - Pending verifications
- `GET /audit` - Audit logs
- `GET /stats` - System statistics

### Security Features

#### JWT Authentication
- **Access Tokens:** Short-lived (15 minutes) for API access
- **Refresh Tokens:** Long-lived (30 days) HTTP-only cookies
- **Token Rotation:** Automatic refresh token rotation for security
- **2FA Support:** Optional TOTP-based two-factor authentication

#### Role-Based Access Control (RBAC)
- **ADMIN:** Full system access
- **MERCHANT_ADMIN:** Full merchant access + user management
- **MERCHANT_MANAGER:** Merchant access + limited user management
- **MERCHANT_USER:** Basic merchant access
- **READ_ONLY:** View-only access

#### Data Protection
- **Encryption:** All data encrypted in transit (TLS)
- **Password Security:** Argon2id hashing
- **Input Validation:** Zod schema validation
- **Rate Limiting:** API rate limiting and auth attempt limiting
- **Audit Logging:** Comprehensive activity logging

## 🛠️ Development

### Project Structure
```
backend/
├── src/
│   ├── config/
│   │   └── swagger.config.ts    # OpenAPI specification
│   ├── middleware/
│   │   ├── auth.ts              # Authentication middleware
│   │   └── errorHandler.ts      # Global error handling
│   ├── routes/
│   │   ├── auth.ts              # Authentication routes
│   │   ├── users.ts             # User management
│   │   ├── merchants.ts         # Merchant operations
│   │   ├── documents.ts         # Document management
│   │   ├── kyc.ts               # KYC verification
│   │   └── admin.ts             # Admin operations
│   ├── services/
│   │   └── kycProvider.ts       # KYC service integration
│   ├── types/
│   │   └── auth.ts              # TypeScript definitions
│   └── server.ts                # Main server file
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── seed.ts                  # Database seeding
└── package.json
```

### Available Scripts
- `npm run dev:api` - Start development server with hot reload
- `npm run build:api` - Build for production
- `npm run test:api` - Run test suite
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with test data

### Environment Variables
Required environment variables (see `.env.example`):

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dms"

# JWT Secrets
JWT_ACCESS_SECRET="your-super-secret-jwt-access-key-here"

# S3 Configuration
S3_ENDPOINT="http://localhost:9000"
S3_BUCKET="dms-docs"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_REGION="us-east-1"

# Application
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"
```

## 🧪 Testing

### API Testing
Use the Swagger UI for interactive testing:
1. Navigate to http://localhost:8080/api-docs
2. Authenticate using the "Authorize" button
3. Test endpoints directly from the documentation

### Automated Tests
```bash
npm run test:api
```

## 🚀 Production Deployment

### Build Process
```bash
npm run build:api
```

### Environment Setup
Ensure these environment variables are set in production:
- Use strong JWT secrets (256+ bits)
- Configure production database URL
- Set up proper S3 credentials and bucket
- Enable HTTPS and proper CORS settings

### Security Checklist
- [ ] Strong JWT secrets configured
- [ ] HTTPS enabled
- [ ] Database connection secured
- [ ] S3 bucket policies configured
- [ ] Rate limiting enabled
- [ ] Audit logging active
- [ ] Error handling configured
- [ ] Health checks working

## 📖 API Examples

### Authentication Flow
```bash
# 1. Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dms.com","password":"admin123456789"}'

# 2. Use the returned access token
curl -X GET http://localhost:8080/api/merchants/123 \
  -H "Authorization: Bearer your-jwt-token-here"

# 3. Refresh token (automatic via cookie)
curl -X POST http://localhost:8080/api/auth/refresh \
  --cookie "rt=refresh-token-from-login"
```

### Document Upload Flow
```bash
# 1. Get presigned URL
curl -X POST http://localhost:8080/api/docs/presign \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "KYC",
    "mimeType": "application/pdf",
    "sizeBytes": 1048576,
    "filename": "pan_card.pdf",
    "checksumSha256": "abc123..."
  }'

# 2. Upload to S3 using presigned URL
curl -X PUT "presigned-url-from-step-1" \
  -H "Content-Type: application/pdf" \
  --data-binary @pan_card.pdf

# 3. Save metadata
curl -X POST http://localhost:8080/api/docs \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "storageKey": "merchants/123/kyc/1642234567890-abc123.pdf",
    "category": "KYC",
    "filename": "pan_card.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 1048576,
    "checksumSha256": "abc123..."
  }'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests
5. Update API documentation if needed
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.