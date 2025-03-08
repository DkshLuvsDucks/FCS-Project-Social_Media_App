# Social Media App

A full-stack social media application built with React, TypeScript, Node.js, and MySQL.

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8 or higher)
- npm or yarn

## Setup Instructions

### 1. Clone the Repository
```bash
git clone [your-repo-url]
cd [repo-name]
```

### 2. Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory with the following content:
```env
DATABASE_URL="mysql://[username]:[password]@localhost:3306/[database-name]"
JWT_SECRET="your-secret-key"
PORT=5000
```
Replace `[username]`, `[password]`, and `[database-name]` with your MySQL credentials.

4. Set up the database:
```bash
npx prisma generate
npx prisma migrate dev
```

5. Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup

1. Open a new terminal and navigate to client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the frontend development server:
```bash
npm run dev
```

The application should now be running at `http://localhost:5173`

### 4. Admin Access

To access the admin dashboard, you can use these default credentials:
```
Email: admin@admin.com
Password: admin123
```

To create a new admin account:
1. First register a normal user account
2. Access your MySQL database:
```sql
UPDATE Users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

**Note**: For security in production, please change the default admin password immediately after first login.

## Features

- User authentication (login/register)
- Role-based access control (Admin/User)
- Dark mode support
- User profile management
- Admin dashboard for user management

## Tech Stack

- Frontend:
  - React
  - TypeScript
  - Vite
  - Tailwind CSS
  - Lucide Icons

- Backend:
  - Node.js
  - Express
  - TypeScript
  - Prisma ORM
  - MySQL
  - JWT Authentication

## Common Issues & Troubleshooting

1. If you get database connection errors:
   - Make sure MySQL service is running
   - Verify your database credentials in `.env`
   - Ensure the database exists
   - Check if MySQL port 3306 is accessible

2. If packages are missing:
   - Run `npm install` in both frontend and backend directories

3. If TypeScript errors occur:
   - Run `npm install @types/[package-name]` for missing type definitions

## Security Notes

- Never commit your `.env` file
- Keep your JWT_SECRET secure
- Regularly update dependencies for security patches
- Change default admin credentials in production
- Use strong passwords for all admin accounts

## Development Guidelines

1. Always create new branches for features
2. Follow the existing code style
3. Write meaningful commit messages
4. Test thoroughly before submitting PRs
