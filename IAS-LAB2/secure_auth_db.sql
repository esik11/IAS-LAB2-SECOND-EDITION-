CREATE DATABASE IF NOT EXISTS secure_auth_db;
USE secure_auth_db;

DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NULL,
    otp_expiry TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    backup_email VARCHAR(255),
    backup_email_verified BOOLEAN DEFAULT FALSE,
    backup_email_verification_code VARCHAR(6),
    phone VARCHAR(255),
    address TEXT,
    phone_encrypted BOOLEAN DEFAULT FALSE,
    address_encrypted BOOLEAN DEFAULT FALSE,
    encryption_iv VARCHAR(32),
    account_locked BOOLEAN DEFAULT FALSE,
    lock_expires TIMESTAMP NULL
);

CREATE TABLE login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    success BOOLEAN DEFAULT FALSE,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (email, attempt_time)
);