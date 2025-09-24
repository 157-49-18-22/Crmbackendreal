# CRM Backend

A Node.js/Express backend for the CRM application with MongoDB database.

## Features

- User authentication with JWT
- Lead management (CRUD operations)
- User management
- Role-based access control
- RESTful API endpoints

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the backend directory:
```
MONGODB_URI=mongodb://localhost:27017/crm
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=5000
```

3. Make sure MongoDB is running on your system

4. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Leads
- `GET /api/leads` - Get all leads
- `GET /api/leads/:id` - Get lead by ID
- `POST /api/leads` - Create new lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead
- `POST /api/leads/:id/notes` - Add note to lead
- `GET /api/leads/stats/overview` - Get lead statistics

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)

## Database Models

### User
- name, email, password
- role (admin, user, manager)
- avatar, isActive
- timestamps

### Lead
- name, amount, stage, pipeline
- contact (name, phone, email, position)
- company (name, address)
- assignedTo, createdBy
- status, notes, tags
- source, priority, expectedCloseDate
- timestamps 