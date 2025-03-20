import dotenv from "dotenv";

dotenv.config();

export const SERVER_CONFIG = {
    PORT: process.env.PORT || 4000,
    CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
    GOOGLE: {
        CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || `http://localhost:${process.env.PORT || 4000}/auth/google/callback`,
        GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN
    },
    MICROSOFT: {
        CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
        CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET,
        REDIRECT_URI: process.env.MICROSOFT_REDIRECT_URI || `http://localhost:${process.env.PORT || 4000}/auth/microsoft/callback`
    }
};
