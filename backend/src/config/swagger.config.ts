import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Document Management System API',
    version: '1.0.0',
    description: 'A comprehensive Document Management System with JWT authentication, KYC verification, and secure document storage',
    contact: {
      name: 'DMS API Support',
      email: 'support@dms.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: process.env.NODE_ENV === 'production' 
        ? 'https://api.dms.com' 
        : 'http://localhost:8080',
      description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token obtained from /auth/login',
      },
    },
    schemas: {
      // Auth Schemas
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'admin@dms.com',
            description: 'User email address',
          },
          password: {
            type: 'string',
            minLength: 8,
            example: 'admin123456789',
            description: 'User password (minimum 8 characters)',
          },
          totpCode: {
            type: 'string',
            pattern: '^[0-9]{6}$',
            example: '123456',
            description: 'Optional 2FA TOTP code (6 digits)',
          },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            description: 'JWT access token (expires in 15 minutes)',
          },
          user: {
            $ref: '#/components/schemas/User',
          },
        },
      },
      Setup2FAResponse: {
        type: 'object',
        properties: {
          secret: {
            type: 'string',
            example: 'JBSWY3DPEHPK3PXP',
            description: 'Base32 encoded secret for TOTP setup',
          },
          qrCode: {
            type: 'string',
            example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
            description: 'QR code data URL for easy setup',
          },
        },
      },

      // User Schemas
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'clp123abc456def789',
            description: 'Unique user identifier',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com',
            description: 'User email address',
          },
          name: {
            type: 'string',
            example: 'John Doe',
            description: 'Full name of the user',
          },
          role: {
            type: 'string',
            enum: ['ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_MANAGER', 'MERCHANT_USER', 'READ_ONLY'],
            example: 'MERCHANT_ADMIN',
            description: 'User role determining permissions',
          },
          merchantId: {
            type: 'string',
            nullable: true,
            example: 'clp123merchant456',
            description: 'Associated merchant ID (null for admin users)',
          },
          isActive: {
            type: 'boolean',
            example: true,
            description: 'Whether the user account is active',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:30:00Z',
            description: 'Account creation timestamp',
          },
          merchant: {
            $ref: '#/components/schemas/MerchantSummary',
          },
        },
      },
      CreateUserRequest: {
        type: 'object',
        required: ['email', 'name', 'role', 'merchantId'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'newuser@example.com',
          },
          name: {
            type: 'string',
            minLength: 2,
            example: 'Jane Smith',
          },
          role: {
            type: 'string',
            enum: ['MERCHANT_ADMIN', 'MERCHANT_MANAGER', 'MERCHANT_USER', 'READ_ONLY'],
            example: 'MERCHANT_USER',
          },
          merchantId: {
            type: 'string',
            example: 'clp123merchant456',
          },
        },
      },
      UpdateUserRequest: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 2,
            example: 'Jane Smith Updated',
          },
          role: {
            type: 'string',
            enum: ['MERCHANT_ADMIN', 'MERCHANT_MANAGER', 'MERCHANT_USER', 'READ_ONLY'],
            example: 'MERCHANT_MANAGER',
          },
          isActive: {
            type: 'boolean',
            example: false,
          },
        },
      },

      // Merchant Schemas
      Merchant: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'clp123merchant456',
            description: 'Unique merchant identifier',
          },
          legalName: {
            type: 'string',
            example: 'ACME Corporation Ltd.',
            description: 'Legal business name',
          },
          businessType: {
            type: 'string',
            example: 'Private Limited Company',
            description: 'Type of business entity',
          },
          gstin: {
            type: 'string',
            nullable: true,
            pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
            example: '29ABCDE1234F1Z5',
            description: 'GST Identification Number (India)',
          },
          addressLine1: {
            type: 'string',
            example: '123 Business Street',
            description: 'Primary address line',
          },
          addressLine2: {
            type: 'string',
            nullable: true,
            example: 'Suite 456',
            description: 'Secondary address line',
          },
          city: {
            type: 'string',
            example: 'Mumbai',
            description: 'City name',
          },
          state: {
            type: 'string',
            example: 'Maharashtra',
            description: 'State or province',
          },
          country: {
            type: 'string',
            example: 'India',
            description: 'Country name',
          },
          postalCode: {
            type: 'string',
            example: '400001',
            description: 'Postal or ZIP code',
          },
          contactEmail: {
            type: 'string',
            format: 'email',
            example: 'contact@acmecorp.com',
            description: 'Business contact email',
          },
          contactPhone: {
            type: 'string',
            nullable: true,
            example: '+91-9876543210',
            description: 'Business contact phone',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:30:00Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-20T15:45:00Z',
          },
          kyc: {
            $ref: '#/components/schemas/KycStatus',
          },
          _count: {
            type: 'object',
            properties: {
              users: {
                type: 'integer',
                example: 5,
                description: 'Number of users in this merchant',
              },
              documents: {
                type: 'integer',
                example: 23,
                description: 'Number of documents uploaded',
              },
            },
          },
        },
      },
      MerchantSummary: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'clp123merchant456',
          },
          legalName: {
            type: 'string',
            example: 'ACME Corporation Ltd.',
          },
        },
      },
      CreateMerchantRequest: {
        type: 'object',
        required: ['legalName', 'businessType', 'addressLine1', 'city', 'state', 'country', 'postalCode', 'contactEmail'],
        properties: {
          legalName: {
            type: 'string',
            minLength: 2,
            example: 'ACME Corporation Ltd.',
          },
          businessType: {
            type: 'string',
            example: 'Private Limited Company',
          },
          gstin: {
            type: 'string',
            pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
            example: '29ABCDE1234F1Z5',
          },
          addressLine1: {
            type: 'string',
            minLength: 5,
            example: '123 Business Street',
          },
          addressLine2: {
            type: 'string',
            example: 'Suite 456',
          },
          city: {
            type: 'string',
            minLength: 2,
            example: 'Mumbai',
          },
          state: {
            type: 'string',
            minLength: 2,
            example: 'Maharashtra',
          },
          country: {
            type: 'string',
            minLength: 2,
            example: 'India',
          },
          postalCode: {
            type: 'string',
            minLength: 5,
            example: '400001',
          },
          contactEmail: {
            type: 'string',
            format: 'email',
            example: 'contact@acmecorp.com',
          },
          contactPhone: {
            type: 'string',
            example: '+91-9876543210',
          },
        },
      },

      // Document Schemas
      Document: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'clp123doc456',
            description: 'Unique document identifier',
          },
          merchantId: {
            type: 'string',
            example: 'clp123merchant456',
            description: 'Associated merchant ID',
          },
          uploadedById: {
            type: 'string',
            example: 'clp123user456',
            description: 'ID of user who uploaded the document',
          },
          category: {
            type: 'string',
            enum: ['KYC', 'CONTRACT', 'INVOICE', 'BANK', 'MISC'],
            example: 'KYC',
            description: 'Document category',
          },
          filename: {
            type: 'string',
            example: 'pan_card.pdf',
            description: 'Original filename',
          },
          storageKey: {
            type: 'string',
            example: 'merchants/clp123merchant456/kyc/1642234567890-abc123.pdf',
            description: 'S3 storage key',
          },
          version: {
            type: 'integer',
            example: 1,
            description: 'Document version number',
          },
          mimeType: {
            type: 'string',
            example: 'application/pdf',
            description: 'MIME type of the document',
          },
          sizeBytes: {
            type: 'integer',
            example: 1048576,
            description: 'File size in bytes',
          },
          checksumSha256: {
            type: 'string',
            example: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
            description: 'SHA-256 checksum for integrity verification',
          },
          isDeleted: {
            type: 'boolean',
            example: false,
            description: 'Soft delete flag',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:30:00Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:30:00Z',
          },
          uploadedBy: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                example: 'John Doe',
              },
              email: {
                type: 'string',
                example: 'john@example.com',
              },
            },
          },
        },
      },
      PresignRequest: {
        type: 'object',
        required: ['category', 'mimeType', 'sizeBytes', 'filename', 'checksumSha256'],
        properties: {
          category: {
            type: 'string',
            enum: ['KYC', 'CONTRACT', 'INVOICE', 'BANK', 'MISC'],
            example: 'KYC',
          },
          mimeType: {
            type: 'string',
            example: 'application/pdf',
          },
          sizeBytes: {
            type: 'integer',
            maximum: 20000000,
            example: 1048576,
            description: 'File size in bytes (max 20MB)',
          },
          filename: {
            type: 'string',
            minLength: 1,
            example: 'pan_card.pdf',
          },
          checksumSha256: {
            type: 'string',
            pattern: '^[a-f0-9]{64}$',
            example: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
          },
        },
      },
      PresignResponse: {
        type: 'object',
        properties: {
          uploadUrl: {
            type: 'string',
            format: 'uri',
            example: 'https://s3.amazonaws.com/bucket/key?X-Amz-Algorithm=...',
            description: 'Presigned URL for direct S3 upload',
          },
          storageKey: {
            type: 'string',
            example: 'merchants/clp123merchant456/kyc/1642234567890-abc123.pdf',
            description: 'S3 storage key for the document',
          },
          expiresIn: {
            type: 'integer',
            example: 300,
            description: 'URL expiration time in seconds',
          },
        },
      },

      // KYC Schemas
      KycStatus: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'clp123kyc456',
          },
          merchantId: {
            type: 'string',
            example: 'clp123merchant456',
          },
          panNumber: {
            type: 'string',
            nullable: true,
            example: 'ABCXX1234XX5',
            description: 'Masked PAN number',
          },
          panStatus: {
            type: 'string',
            enum: ['PENDING', 'VERIFIED', 'FAILED'],
            example: 'VERIFIED',
            description: 'PAN verification status',
          },
          aadhaarLast4: {
            type: 'string',
            nullable: true,
            example: '1234',
            description: 'Last 4 digits of Aadhaar',
          },
          aadhaarStatus: {
            type: 'string',
            enum: ['PENDING', 'VERIFIED', 'FAILED'],
            example: 'VERIFIED',
            description: 'Aadhaar verification status',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:30:00Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-20T15:45:00Z',
          },
        },
      },
      PanVerifyRequest: {
        type: 'object',
        required: ['panNumber', 'name', 'merchantId'],
        properties: {
          panNumber: {
            type: 'string',
            pattern: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$',
            example: 'ABCDE1234F',
            description: '10-character PAN number',
          },
          name: {
            type: 'string',
            minLength: 2,
            example: 'John Doe',
            description: 'Name as per PAN card',
          },
          dob: {
            type: 'string',
            format: 'date',
            example: '1990-01-15',
            description: 'Date of birth (optional)',
          },
          merchantId: {
            type: 'string',
            example: 'clp123merchant456',
          },
        },
      },
      AadhaarInitRequest: {
        type: 'object',
        required: ['aadhaarNumber', 'merchantId'],
        properties: {
          aadhaarNumber: {
            type: 'string',
            pattern: '^[0-9]{12}$',
            example: '123456789012',
            description: '12-digit Aadhaar number',
          },
          merchantId: {
            type: 'string',
            example: 'clp123merchant456',
          },
        },
      },
      AadhaarVerifyRequest: {
        type: 'object',
        required: ['txnId', 'otp', 'merchantId'],
        properties: {
          txnId: {
            type: 'string',
            example: 'TXN_1642234567890_abc123',
            description: 'Transaction ID from OTP init',
          },
          otp: {
            type: 'string',
            pattern: '^[0-9]{6}$',
            example: '123456',
            description: '6-digit OTP',
          },
          merchantId: {
            type: 'string',
            example: 'clp123merchant456',
          },
        },
      },

      // Common Response Schemas
      MessageResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Operation completed successfully',
            description: 'Success or informational message',
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            example: 'Invalid credentials',
            description: 'Error message describing what went wrong',
          },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  example: 'email',
                },
                message: {
                  type: 'string',
                  example: 'Invalid email format',
                },
              },
            },
            description: 'Detailed validation errors (for 400 responses)',
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            example: 1,
            description: 'Current page number',
          },
          limit: {
            type: 'integer',
            example: 10,
            description: 'Items per page',
          },
          total: {
            type: 'integer',
            example: 50,
            description: 'Total number of items',
          },
          pages: {
            type: 'integer',
            example: 5,
            description: 'Total number of pages',
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication required or token invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              error: 'Invalid or expired token',
            },
          },
        },
      },
      ForbiddenError: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              error: 'Insufficient permissions',
            },
          },
        },
      },
      ValidationError: {
        description: 'Request validation failed',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              error: 'Validation failed',
              details: [
                {
                  field: 'email',
                  message: 'Invalid email format',
                },
              ],
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              error: 'Resource not found',
            },
          },
        },
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              error: 'Internal server error',
            },
          },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and session management',
    },
    {
      name: 'Users',
      description: 'User management operations',
    },
    {
      name: 'Merchants',
      description: 'Merchant profile and business information',
    },
    {
      name: 'Documents',
      description: 'Document upload, storage, and management',
    },
    {
      name: 'KYC',
      description: 'Know Your Customer verification processes',
    },
    {
      name: 'Admin',
      description: 'Administrative operations and system management',
    },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts', // Path to the API routes
    './src/server.ts',   // Main server file
  ],
};

export const swaggerSpec = swaggerJsdoc(options);