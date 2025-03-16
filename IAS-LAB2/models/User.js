const db = require('../config/database');
const Encryption = require('../utils/encryption');

class User {
    static async createUser(email, name) {
        const [result] = await db.execute(
            'INSERT INTO users (email, name) VALUES (?, ?)',
            [email, name]
        );
        return result.insertId;
    }

    static async findByEmail(email) {
        const [rows] = await db.execute(
            'SELECT id, email, name FROM users WHERE email = ?', 
            [email]
        );
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await db.execute(
            'SELECT id, email, name FROM users WHERE id = ?', 
            [id]
        );
        return rows[0];
    }

    static async saveOTP(userId, otp, expiry) {
        await db.execute(
            'UPDATE users SET otp = ?, otp_expiry = ? WHERE id = ?',
            [otp, expiry, userId]
        );
    }

    static async verifyOTP(userId, otp) {
        const [rows] = await db.execute(
            'SELECT otp, otp_expiry FROM users WHERE id = ?',
            [userId]
        );
        
        if (!rows[0] || !rows[0].otp || !rows[0].otp_expiry) {
            return false;
        }
        
        const isExpired = new Date() > new Date(rows[0].otp_expiry);
        return !isExpired && rows[0].otp === otp;
    }

    static async clearOTP(userId) {
        await db.execute(
            'UPDATE users SET otp = NULL, otp_expiry = NULL WHERE id = ?',
            [userId]
        );
    }

    static async updateBackupEmail(userId, backupEmail, verificationCode) {
        await db.execute(
            'UPDATE users SET backup_email = ?, backup_email_verified = FALSE WHERE id = ?',
            [backupEmail, userId]
        );
        // Store verification code temporarily
        await db.execute(
            'UPDATE users SET backup_email_verification_code = ? WHERE id = ?',
            [verificationCode, userId]
        );
    }

    static async verifyBackupEmail(userId, verificationCode) {
        const [rows] = await db.execute(
            'SELECT backup_email_verification_code FROM users WHERE id = ?',
            [userId]
        );

        if (!rows[0] || rows[0].backup_email_verification_code !== verificationCode) {
            return false;
        }

        // Mark backup email as verified and clear verification code
        await db.execute(
            'UPDATE users SET backup_email_verified = TRUE, backup_email_verification_code = NULL WHERE id = ?',
            [userId]
        );
        return true;
    }

    static async updateSensitiveData(userId, data) {
        const { phone, address } = data;
        
        let updates = [];
        let values = [];
        
        if (phone) {
            const encrypted = Encryption.encrypt(phone);
            updates.push('phone = ?, phone_encrypted = TRUE, encryption_iv = ?');
            values.push(encrypted.encrypted, encrypted.iv);
        }
        
        if (address) {
            const encrypted = Encryption.encrypt(address);
            updates.push('address = ?, address_encrypted = TRUE');
            values.push(encrypted.encrypted);
        }
        
        if (updates.length > 0) {
            const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
            values.push(userId);
            await db.execute(query, values);
        }
    }

    static async getSensitiveData(userId) {
        try {
            const [rows] = await db.execute(
                'SELECT phone, address, phone_encrypted, address_encrypted, encryption_iv, phone_auth_tag, address_auth_tag FROM users WHERE id = ?',
                [userId]
            );
            
            if (!rows[0]) return null;
            
            const data = rows[0];
            return {
                phone: data.phone,
                address: data.address,
                hasEncryptedPhone: !!data.phone && data.phone_encrypted,
                hasEncryptedAddress: !!data.address && data.address_encrypted
            };
        } catch (error) {
            console.error('Get sensitive data error:', error);
            return null;
        }
    }

    static async lockAccount(email) {
        const now = new Date();
        const unlockTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now
        
        await db.execute(
            'UPDATE users SET account_locked = TRUE, lock_expires = ? WHERE email = ?',
            [unlockTime, email]
        );
    }

    static async isAccountLocked(email) {
        const [rows] = await db.execute(
            'SELECT account_locked, lock_expires FROM users WHERE email = ?',
            [email]
        );
        
        if (!rows[0] || !rows[0].account_locked) return false;
        
        const now = new Date();
        const lockExpires = new Date(rows[0].lock_expires);
        
        if (now > lockExpires) {
            // Unlock the account if lock has expired
            await db.execute(
                'UPDATE users SET account_locked = FALSE, lock_expires = NULL WHERE email = ?',
                [email]
            );
            return false;
        }
        
        return true;
    }

    static async recordLoginAttempt(email, success) {
        await db.execute(
            'INSERT INTO login_attempts (email, success) VALUES (?, ?)',
            [email, success]
        );
    }
}

module.exports = User; 