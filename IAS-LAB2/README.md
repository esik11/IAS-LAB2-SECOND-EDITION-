# Secure Authentication System

A secure authentication system with MFA support, backup codes, and Firebase integration.

## Features

- User registration and login
- Multi-Factor Authentication (MFA) using TOTP
- Backup codes for account recovery
- Firebase authentication integration
- MySQL database for user data
- Modern and responsive UI
- Session management
- Security best practices

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server
- Firebase account
- XAMPP (for local development)

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd secure-auth-system
```

2. Install dependencies:
```bash
npm install
```

3. Create MySQL database:
```sql
CREATE DATABASE secure_auth_db;
USE secure_auth_db;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    mfa_secret VARCHAR(255),
    backup_codes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

4. Configure environment variables:
- Copy `.env.example` to `.env`
- Update the values with your Firebase credentials and database configuration

5. Start the server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Security Features

1. **Multi-Factor Authentication (MFA)**
   - TOTP-based authentication using authenticator apps
   - QR code setup for easy configuration

2. **Backup Authentication**
   - One-time use backup codes
   - Secure regeneration of backup codes

3. **Firebase Integration**
   - Email/password authentication
   - Token-based session management

4. **Database Security**
   - Hashed passwords using bcrypt
   - Prepared statements to prevent SQL injection
   - Secure storage of MFA secrets

## Usage

1. **Registration**
   - Fill in the registration form
   - Scan the QR code with your authenticator app
   - Save the backup codes securely

2. **Login**
   - Enter email and password
   - Provide the current OTP from your authenticator app
   - Use backup codes if you can't access your authenticator

3. **Dashboard**
   - View your profile information
   - Generate new backup codes
   - Reset MFA device if needed

## Best Practices

- Always use HTTPS in production
- Regularly update dependencies
- Monitor Firebase Console for authentication issues
- Implement rate limiting for login attempts
- Keep backup codes in a secure location
- Enable database backups

## License

MIT License 