const crypto = require('crypto');
require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // We'll generate this
const ALGORITHM = 'aes-256-gcm';

class Encryption {
    static generateKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    static encrypt(text) {
        if (!text) return null;
        
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        
        return {
            encrypted: encrypted,
            iv: iv.toString('hex'),
            authTag: authTag
        };
    }

    static decrypt(encrypted, iv, authTag) {
        if (!encrypted || !iv || !authTag) return null;
        
        const decipher = crypto.createDecipheriv(
            ALGORITHM, 
            Buffer.from(ENCRYPTION_KEY, 'hex'),
            Buffer.from(iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }
}

module.exports = Encryption; 