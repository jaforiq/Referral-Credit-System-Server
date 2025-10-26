# Referral System Backend

A robust Node.js + Express + TypeScript backend for a referral program with MongoDB.

## Features

- ✅ User authentication (register, login, JWT)
- ✅ Unique referral codes generation
- ✅ Referral tracking and management
- ✅ Purchase simulation with credit rewards
- ✅ Dashboard statistics
- ✅ Transaction safety with MongoDB sessions
- ✅ Double-crediting prevention
- ✅ Rate limiting and security
- ✅ Input validation

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, bcryptjs, CORS, Rate Limiting
- **Validation**: express-validator

## Project Structure

```
src/
├── config/
│   └── database.ts          # MongoDB connection
├── controllers/
│   ├── authController.ts    # Authentication logic
│   ├── referralController.ts # Referral management
│   └── purchaseController.ts # Purchase handling
├── middleware/
│   ├── auth.ts              # JWT authentication
│   ├── validators.ts        # Request validation
│   └── errorHandler.ts      # Error handling
├── models/
│   ├── User.ts              # User schema
│   ├── Referral.ts          # Referral schema
│   └── Purchase.ts          # Purchase schema
├── routes/
│   ├── authRoutes.ts        # Auth endpoints
│   ├── referralRoutes.ts    # Referral endpoints
│   └── purchaseRoutes.ts    # Purchase endpoints
├── types/
│   └── index.ts             # TypeScript definitions
├── utils/
│   └── jwt.ts               # JWT utilities
└── server.ts                # Main application
```

## Installation

1. **Install dependencies**:

```bash
npm install
```

2. **Set up environment variables**:
   Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/referral-system
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
REFERRAL_CREDITS=2
BASE_URL=http://localhost:3000
```

3. **Make sure MongoDB is running**:

```bash
# For local MongoDB
mongod

# Or use MongoDB Atlas connection string in .env
```

## Running the Application

### Development Mode

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

## API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "referralCode": ""  // optional
}

Response:
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "John Doe",
      "referralCode": "ABC12345",
      "credits": 0
    },
    "token": "jwt_token_here"
  }
}
```

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "jwt_token_here"
  }
}
```

#### Get Profile

```http
GET /auth/profile
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "John Doe",
      "referralCode": "ABC12345",
      "credits": 4,
      "hasPurchased": true,
      "createdAt": "2025-01-15T10:00:00.000Z"
    }
  }
}
```

### Referral Endpoints

#### Get Dashboard Stats

```http
GET /referrals/dashboard
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "totalReferrals": 5,
    "convertedReferrals": 3,
    "totalCredits": 6,
    "referralLink": "http://localhost:3000/register?r=ABC12345",
    "referralCode": "ABC12345"
  }
}
```

#### Get All Referrals

```http
GET /referrals
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "referrals": [
      {
        "_id": "...",
        "referrerId": "...",
        "referredId": {
          "name": "Jane Doe",
          "email": "jane@example.com",
          "hasPurchased": true
        },
        "status": "converted",
        "creditsAwarded": true,
        "createdAt": "2025-01-15T10:00:00.000Z"
      }
    ],
    "count": 1
  }
}
```

#### Validate Referral Code

```http
GET /referrals/validate/ABC12345

Response:
{
  "success": true,
  "message": "Valid referral code",
  "data": {
    "referrerName": "John Doe"
  }
}
```

### Purchase Endpoints

#### Create Purchase

```http
POST /purchases
Authorization: Bearer <token>
Content-Type: application/json

{
  "productName": "Premium Plan",
  "amount": 99.99
}

Response:
{
  "success": true,
  "message": "Purchase successful! Credits awarded.",
  "data": {
    "purchase": {
      "id": "...",
      "productName": "Premium Plan",
      "amount": 99.99,
      "isFirstPurchase": true,
      "createdAt": "2025-01-15T10:00:00.000Z"
    },
    "creditsAwarded": true,
    "currentCredits": 2
  }
}
```

#### Get User Purchases

```http
GET /purchases
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "purchases": [
      {
        "_id": "...",
        "userId": "...",
        "productName": "Premium Plan",
        "amount": 99.99,
        "isFirstPurchase": true,
        "createdAt": "2025-01-15T10:00:00.000Z"
      }
    ],
    "count": 1
  }
}
```

## Key Features Implementation

### 1. **Referral Code Generation**

- Uses `nanoid` to generate unique 8-character alphanumeric codes
- Checks for uniqueness in the database before saving

### 2. **Double-Crediting Prevention**

- Uses MongoDB transactions for atomic operations
- `creditsAwarded` flag in Referral model prevents duplicate rewards
- `hasPurchased` flag in User model ensures only first purchase counts

### 3. **Transaction Safety**

- All credit-awarding operations use MongoDB sessions
- Automatic rollback on errors
- Prevents race conditions with concurrent requests

### 4. **Security**

- Passwords hashed with bcryptjs (12 rounds)
- JWT tokens for authentication
- Rate limiting on all routes
- Helmet for security headers
- Input validation with express-validator

### 5. **Credit System**

- Both referrer and referred user get 2 credits on first purchase
- Credits only awarded once per referral
- Configurable via environment variable

## Business Logic Flow

### Registration with Referral

1. User registers with optional referral code
2. System validates referral code (if provided)
3. Creates user account with unique referral code
4. Creates referral relationship in database
5. Returns JWT token

### First Purchase

1. User makes first purchase
2. System checks if it's truly the first purchase
3. Updates user's `hasPurchased` flag
4. Finds referral relationship
5. Awards 2 credits to both referrer and referred user (in transaction)
6. Marks referral as 'converted' and `creditsAwarded = true`

### Subsequent Purchases

1. User makes another purchase
2. Purchase recorded but no credits awarded
3. `isFirstPurchase` flag set to false
