# Vendr - Social Media Application

A modern, secure, and feature-rich social media application built with React, TypeScript, Node.js, and MySQL.

## Group Information
- **Group Number:** 9
- **Group Members:**
  - 2022076 - Anish Bera
  - 2022142 - Daksh
  - 2022154 - Devesh Hooda
  - 2022239 - Kartik Kumar Ubane

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

- **Marketplace**
  - Product listings
  - Secure payments
  - Product search and filtering
  - Product recommendations

### Technical Implementation
- **Frontend**
  - React with TypeScript
  - Context API for state management
  - Lazy loading for optimized performance
  - Error boundaries for graceful error handling
  - Tailwind CSS for styling
  - Responsive component architecture
  - Framer Motion for animations
  - Material UI components
  - Socket.io client for real-time communication

- **Backend**
  - Node.js with Express
  - MySQL database with Prisma ORM
  - RESTful API architecture
  - JWT authentication
  - Middleware for security and validation
  - File upload handling with Multer
  - Error handling middleware
  - Rate limiting and security measures
  - Socket.io for real-time messaging
  - Twilio for SMS verification and notifications
  - Nodemailer for email services and OTP verification
  - Bcrypt for password hashing
  - Firebase Admin for notifications
  - End-to-end encryption for messages and sensitive data
  - HTTPS/SSL implementation for secure communication
  - Redis for caching and rate limiting

## Project Structure

```
project/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React Context providers
│   │   ├── assets/         # Static assets
│   │   └── routes.tsx      # Application routing
│   ├── certificates/       # SSL/TLS certificates for HTTPS
│   └── ...
│
├── backend/                # Node.js server
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Custom middleware
│   │   ├── routes/         # API routes
│   │   ├── utils/          # Helper functions
│   │   └── config/         # Configuration files
│   ├── certificates/       # SSL/TLS certificates for HTTPS
│   └── ...
│
├── server_scripts/         # Server management scripts
│   ├── start-servers.bat   # Windows script to start servers
│   ├── start-servers.sh    # Unix script to start servers
│   ├── stop-servers.bat    # Windows script to stop servers
│   └── stop-servers.sh     # Unix script to stop servers
│
├── setup/                  # Setup scripts
│   ├── setup.ps1           # Windows setup script
│   └── setup.sh            # Unix setup script
```

## Setup and Installation

### Prerequisites

- Node.js (v18+)
- MySQL (v8+)
- npm or yarn
- Git

### Automatic Setup

1. **Clone the Repository**
```bash
git clone [your-repo-url]
cd [repo-name]
```

2. **Run the Setup Script**
   
For Windows:
```powershell
cd setup
.\setup.ps1
```

For Unix-based systems:
```bash
cd setup
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

### Starting and Stopping the Application

1. **Start both servers:**

For Windows:
```bash
cd server_scripts
.\start-servers.bat
```

For Unix-based systems:
```bash
cd server_scripts
chmod +x start-servers.sh
./start-servers.sh
```

2. **Stop all servers:**

For Windows:
```bash
cd server_scripts
.\stop-servers.bat
```

For Unix-based systems:
```bash
cd server_scripts
chmod +x stop-servers.sh
./stop-servers.sh
```

After starting the servers:
- Backend API: https://localhost:3000
- Frontend: https://localhost:5173

### Default Admin Account
- Email: admin@vendr.com
- Password: Admin@123

## User Manual

### Account Management

#### Sign Up
1. Navigate to the homepage at https://localhost:5173
2. Click on "Sign Up" button
3. Fill in your details:
   - Full Name
   - Email Address
   - Password (must contain at least 8 characters, including uppercase, lowercase, numbers, and special characters)
   - Phone Number (optional)
4. Click "Create Account"
5. Verify your email through the verification code sent to your email

#### Login
1. Navigate to the homepage
2. Enter your registered email and password
3. Click "Login"
4. For enhanced security, you may be prompted for 2FA verification if enabled

### Social Features

#### Profile Management
1. Click on your profile picture in the top-right corner
2. Select "Profile" from the dropdown menu
3. Edit your profile information by clicking "Edit Profile"
4. Upload or change your profile picture
5. Update your personal information
6. Click "Save Changes"

#### Finding Friends
1. Use the search bar at the top to find friends
2. Visit recommended friends section
3. Send friend requests by clicking "Add Friend"
4. Accept or decline friend requests from the notifications panel

### Messaging System

#### Private Messaging
1. Navigate to the Messages tab from the sidebar
2. Select a contact from your list or search for a user
3. Type your message in the text box at the bottom
4. Press Enter or click the send button
5. You can also share media by clicking the attachment icon

#### Group Chats
1. From the Messages tab, click "Create Group Chat"
2. Add participants by searching and selecting users
3. Name your group chat
4. Upload a group avatar (optional)
5. Click "Create Group"
6. Manage group settings by clicking the gear icon within the group chat

### Marketplace

#### Browse Products
1. Navigate to the Marketplace from the sidebar
2. Browse products by category or use the search function
3. Filter products by price, rating, or other attributes

#### List a Product
1. In the Marketplace, click "Sell an Item"
2. Fill in product details:
   - Product name
   - Description
   - Price
   - Category
   - Condition
   - Upload product images
3. Click "List Product"

#### Purchase a Product
1. Browse to the desired product
2. Click "Buy Now" or "Add to Cart"
3. Proceed to checkout
4. Enter shipping details
5. Select payment method
6. Complete purchase

### Payment System
1. Add payment methods in your account settings
2. When purchasing, select your preferred payment method
3. Securely complete your transaction
4. View your purchase history in your account settings

### Security Features

#### Two-Factor Authentication
1. Go to Account Settings > Security
2. Enable Two-Factor Authentication
3. Set up using your preferred method (SMS or Authentication app)
4. Backup recovery codes are provided - store these securely

#### Secure Messaging
All messages are end-to-end encrypted for your privacy. The lock icon indicates a secure conversation.

### Admin Dashboard
1. Log in with admin credentials (admin@vendr.com and Admin@123)
2. Access the Admin Dashboard from the sidebar or navigation menu

#### User Management
1. View all registered users in the system
2. Search for specific users by name, email, or other criteria
3. Edit user information or change user roles
4. Suspend or ban users who violate platform policies
5. Review user activity logs

#### Document Verification
1. Access the Verification Requests section
2. View pending verification document submissions
3. Examine submitted documents (ID cards, licenses, etc.)
4. Approve legitimate documents to grant verified status to users
5. Reject documents that don't meet requirements, with optional reason
6. Track verification history

#### Platform Analytics
1. Monitor user growth and engagement metrics
2. Track messaging and content creation activity
3. View marketplace transaction volumes
4. Analyze user retention and activity patterns

## Troubleshooting

### Common Issues

1. **Connection Issues**
   - Ensure MySQL service is running
   - Verify correct database credentials in .env files
   - Check if ports 3000 and 5173 are available

2. **Login Issues**
   - Clear browser cache and cookies
   - Ensure you're using the correct email and password
   - Check if your account is locked due to too many failed attempts

3. **SSL Certificate Warnings**
   - For local development, you may need to accept self-signed certificates in your browser
   - Go to https://localhost:3000 and https://localhost:5173 and accept the certificates

### Troubleshooting

#### Backend Setup Failure

If you encounter backend setup failure during deployment, here are some steps to fix it:

1. **Missing Directories**: 
   The deployment script now checks if backend and frontend directories exist and creates them if they don't.

2. **Checking Dependencies**:
   ```bash
   cd backend
   npm list --depth=0
   ```
   Make sure all required dependencies are installed.

3. **Manual Setup**:
   If automatic deployment fails, you can set up the backend manually:
   ```bash
   # Create backend directory if it doesn't exist
   mkdir -p backend/src

   # Create a basic server.js file
   echo 'console.log("Server starting..."); require("http").createServer((req, res) => { res.end("Vendr API"); }).listen(3001);' > backend/src/server.js
   
   # Start it manually
   node backend/src/server.js
   ```

4. **Database Issues**:
   - Make sure MySQL is running: `systemctl status mysql`
   - Create the database manually: `mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS vendr;"`

5. **Permission Issues**:
   ```bash
   # Fix permissions on backend directory
   sudo chown -R $(whoami) backend
   sudo chmod -R 755 backend
   ```

## Production Deployment Guide

This guide explains how to deploy the Vendr social media application in a production environment using Nginx as a reverse proxy.

### Prerequisites

- A server with Linux (Ubuntu/Debian recommended)
- Node.js v18 or later
- MySQL 8.0 or later
- Nginx
- Domain name pointing to your server (optional, but recommended)

### Deployment Options

#### Option 1: Automatic Deployment (Recommended)

1. Clone the repository to your server:
   ```bash
   git clone https://github.com/yourusername/vendr.git
   cd vendr
   ```

2. Make the deployment script executable:
   ```bash
   chmod +x deploy.sh
   ```

3. Run the deployment script as root or with sudo:
   ```bash
   sudo ./deploy.sh
   ```

4. The script will:
   - Install all required dependencies
   - Build the backend and frontend
   - Configure Nginx as a reverse proxy
   - Set up SSL certificates
   - Start the application with PM2
   - Configure the app to start on system reboot

#### Option 2: Manual Deployment

If you prefer to manually deploy the application, follow these steps:

1. **Backend Setup:**
   ```bash
   cd backend
   npm install --production
   npm run build
   npx prisma generate
   npx prisma migrate deploy
   ```

2. **Frontend Setup:**
   ```bash
   cd frontend
   npm install --production
   npm run build
   ```

3. **Nginx Configuration:**
   - Copy `nginx.conf` to `/etc/nginx/nginx.conf`
   - Create SSL certificates or use Let's Encrypt
   - Copy frontend build files to `/var/www/vendr/frontend`
   - Restart Nginx: `systemctl restart nginx`

4. **Start the Application:**
   ```bash
   npm install -g pm2
   cd backend
   NODE_ENV=production pm2 start dist/src/server.js --name "vendr-backend" -- --port 3001
   pm2 save
   pm2 startup
   ```

### Configuration

#### Database Configuration

The application uses a MySQL database. Before deployment, ensure:

1. MySQL server is running
2. Create a database named 'vendr':
   ```sql
   CREATE DATABASE IF NOT EXISTS vendr;
   ```
3. Update the `DATABASE_URL` in `backend/.env` if needed

#### Custom Domain Configuration

To use your custom domain (replacing vendr.app in the Nginx configuration):

1. Update the `server_name` directive in the Nginx configuration
2. Obtain SSL certificates for your domain:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

### Security Considerations

1. **Environment Variables**: Ensure production secrets are properly set
2. **Firewall**: Configure firewall to only allow necessary ports (80, 443)
3. **SSL**: Use proper SSL certificates for production
4. **Regular Updates**: Keep dependencies up to date with security patches

### Monitoring & Maintenance

- **Logs**: Check logs in `/var/log/nginx/` and using `pm2 logs`
- **Process Management**: Use PM2 to manage the Node.js process:
  ```bash
  pm2 status
  pm2 restart vendr-backend
  pm2 logs vendr-backend
  ```
- **Database Backups**: Set up regular MySQL backups

### Troubleshooting

- **Nginx Issues**: Check syntax with `nginx -t`
- **Application Errors**: Check logs with `pm2 logs vendr-backend`
- **Permission Issues**: Check file permissions for Nginx and app directories
- **Database Connection**: Verify MySQL is running and accessible

### Support

For additional help or to report issues, please open an issue in the GitHub repository.

### License

[Your License Information]

