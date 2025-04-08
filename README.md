# Vendr - Social Media Application

A modern, secure, and feature-rich social media application built with React, TypeScript, Node.js, and MySQL.

## Features

### User Interface
- **Responsive Design**
  - Adaptive sidebar that collapses to icons on smaller screens
  - Mobile-friendly layout across all pages
  - Smooth transitions and animations
  - Coming soon pages for features under development

### Authentication & Security
- Secure user authentication with JWT
- Protected routes and middleware
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting for API endpoints
- CORS protection
- File upload security measures
- Device fingerprinting for session management
- Message encryption for private communications
- Security headers (HSTS, CSP, etc.)
- Brute force protection with account lockout
- Two-factor authentication support

### Core Features
- **Dark Mode**
  - System-wide dark mode toggle
  - Persistent theme preference
  - Smooth theme transitions

- **Messaging System**
  - End-to-end encrypted messaging
  - Real-time chat functionality
  - Message history
  - User-to-user private messaging
  - Chat list with recent conversations
  - Message search functionality

- **User Management**
  - User profiles with customizable information
  - Profile picture upload
  - User search functionality with real-time results
  - Role-based access control (User/Moderator/Admin)
  - Account security settings

### Technical Implementation
- **Frontend**
  - React with TypeScript
  - Context API for state management
  - Lazy loading for optimized performance
  - Error boundaries for graceful error handling
  - Tailwind CSS for styling
  - Responsive component architecture
  - Framer Motion for animations

- **Backend**
  - Node.js with Express
  - MySQL database with Prisma ORM
  - RESTful API architecture
  - JWT authentication
  - Middleware for security and validation
  - File upload handling
  - Error handling middleware
  - Rate limiting and security measures

## Project Structure

```
project/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── context/      # React Context providers
│   │   ├── assets/       # Static assets
│   │   └── routes.tsx    # Application routing
│   ├── certificates/     # SSL/TLS certificates for HTTPS
│   └── ...
│
├── backend/               # Node.js server
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── middleware/   # Custom middleware
│   │   ├── routes/       # API routes
│   │   ├── utils/        # Helper functions
│   │   └── config/       # Configuration files
│   ├── certificates/     # SSL/TLS certificates for HTTPS
│   └── ...
```

## Setup and Installation

### Prerequisites

- Node.js
- MySQL
- npm or yarn
- PowerShell (for Windows users)

### Automatic Setup

1. Clone the Repository
```bash
git clone [your-repo-url]
cd [repo-name]
```

2. Run the Setup Script
   
For Windows:
```powershell
.\setup.ps1
```

For Unix-based systems:
```bash
chmod +x setup.sh
./setup.sh
```

The setup script will:
- Check for required dependencies
- Create necessary .env files
- Install dependencies for both frontend and backend
- Generate SSL certificates
- Set up the database and run migrations
- Configure everything needed to run the application

3. Start the Application

Backend:
```bash
cd backend
npm run dev
```
The backend server will run on https://localhost:3000

Frontend:
```bash
cd frontend
npm run dev
```
The frontend server will run on https://localhost:5173

### Manual Setup

1. Clone the Repository
```bash
git clone [your-repo-url]
cd [repo-name]
```

2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:
```env
# Database Configuration
DATABASE_URL="mysql://[username]:[password]@localhost:3306/[database-name]"

# Authentication
JWT_SECRET="your-secret-key-here"
SESSION_TIMEOUT="3600"  # Session timeout in seconds

# Encryption Keys
ENCRYPTION_KEY="32_byte_random_hex_string_please_change_in_production"
MESSAGE_ENCRYPTION_KEY="your-encryption-key-here-make-it-long-and-random"

```

Initialize the database:
```bash
npm run prisma:generate
npm run prisma:migrate

# Start the backend server
npm run dev
```
The backend server will run on https://localhost:3000

3. Frontend Setup
```bash
cd client
npm install

# Start the frontend server
npm run dev
```
The frontend server will run on https://localhost:5173

### SSL Configuration

The application uses HTTPS for secure communication. SSL certificates are stored in:
- `client/certificates/` - For frontend HTTPS (Port 5173)
- `backend/certificates/` - For backend HTTPS (Port 3000)

Make sure to import the certificates into your browser's trusted certificates for local development.

### Available Scripts

#### Backend
- `npm run dev`: Start development server with hot reload
- `npm run build`: Build for production
- `npm start`: Start production server
- `npm run prisma:generate`: Generate Prisma client
- `npm run prisma:migrate`: Run database migrations

#### Frontend
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint

### Starting and Stopping the Application

1. Start both servers:
```powershell
./start-servers.ps1
```

2. Stop all servers:
```powershell
./stop-servers.ps1
```

### Default Admin Account
- Email: admin@vendr.com
- Password: Admin@123

**Important:** Change these credentials immediately in production.

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong, random keys for all secrets
   - Rotate keys periodically in production

2. **Authentication**
   - Enable 2FA for sensitive accounts
   - Use strong password policies
   - Implement account lockout after failed attempts

3. **Message Security**
   - All messages are end-to-end encrypted
   - Uses AES-256-GCM for message encryption
   - HMAC verification for message integrity

4. **API Security**
   - Rate limiting on all endpoints
   - Input validation and sanitization
   - Security headers implementation
   - CORS configuration

## Development Guidelines

1. **Code Style**
   - Use TypeScript for type safety
   - Follow ESLint configuration
   - Write meaningful commit messages
   - Document complex functions

2. **Testing**
   - Write unit tests for critical functions
   - Test security measures thoroughly
   - Validate input sanitization
   - Check error handling

3. **Security**
   - Review dependencies regularly
   - Keep packages updated
   - Follow security best practices
   - Implement proper error handling

## Troubleshooting

1. **Database Connection Issues**
   - Verify MySQL service is running
   - Check credentials in `.env`
   - Ensure correct port (3306) is open
   - Run `prisma:generate` after schema changes

2. **Authentication Problems**
   - Clear browser cache and cookies
   - Check JWT token expiration
   - Verify correct environment variables
   - Check for account lockout

3. **Build Issues**
   - Clear node_modules and reinstall
   - Update dependencies
   - Check TypeScript errors
   - Verify correct Node.js version
