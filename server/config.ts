import dotenv from "dotenv";
import { get } from "http";

dotenv.config();

// Utility function to ensure required env vars are present
function getEnv(name: string, fallback?: string): string {
    const value = process.env[name];
    if (value) return value;
    if (fallback !== undefined) return fallback;
    throw new Error(`❌ Missing environment variable: ${name}`);
}

export const SERVER_CONFIG = {
    PORT: parseInt(getEnv("PORT", "4000"), 10),
    CLIENT_URL: getEnv("CLIENT_URL", "http://localhost:5173"),
    SESSION_SECRET: getEnv("SESSION_SECRET"),
    GOOGLE: {
        CLIENT_ID: getEnv("GOOGLE_CLIENT_ID"),
        CLIENT_SECRET: getEnv("GOOGLE_CLIENT_SECRET"),
        REDIRECT_URI: getEnv("GOOGLE_REDIRECT_URI", `http://localhost:${getEnv("PORT", "4000")}/auth/google/callback`),
        REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN // Optional (used only if present)
    },

    MICROSOFT: {
        CLIENT_ID: getEnv("MICROSOFT_CLIENT_ID"),
        CLIENT_SECRET: getEnv("MICROSOFT_CLIENT_SECRET"),
        REDIRECT_URI: getEnv("MICROSOFT_REDIRECT_URI", `http://localhost:${getEnv("PORT", "4000")}/auth/microsoft/callback`),

    },
    FLASH_MAILER: {
        ADMIN_USER_ID: getEnv("FLASH_MAILER_USER_ID"),
        CLIENT_ID: getEnv("FLASH_MAILER_CLIENT_ID"),
        CLIENT_SECRET: getEnv("FLASH_MAILER_CLIENT_SECRET"),
        TENANT_ID: getEnv("FLASH_MAILER_TENANT_ID")
    },
    PARTNER_MAILER: {
        API_KEY: getEnv("RESEND_API_KEY"),
        FROM_EMAIL: getEnv("RESEND_FROM"),
        TO_EMAIL: getEnv("PRIMARY_ADMIN")
    }
};

export const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(",") || [];
export const PRIMARY_ADMIN_EMAIL = ADMIN_EMAILS[0];