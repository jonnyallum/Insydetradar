import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

/**
 * Hash a password with a random salt
 */
export function hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const hashed = scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hashed}`;
}

/**
 * Verify a password against a stored hash
 */
export function verifyPassword(password: string, stored: string): boolean {
    try {
        const [salt, hashed] = stored.split(":");
        if (!salt || !hashed) return false;

        const key = scryptSync(password, salt, 64);
        const keyToVerify = Buffer.from(hashed, "hex");

        return timingSafeEqual(key, keyToVerify);
    } catch (error) {
        console.error("[AuthUtils] Password verification error:", error);
        return false;
    }
}

/**
 * Generate a random 6-digit numeric verification code
 */
export function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
