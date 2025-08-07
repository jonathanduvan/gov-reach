import passport from "passport";
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from "passport-google-oauth20";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";
import { SERVER_CONFIG } from "./config.js";
import { Request } from "express";

// Extend Express session type to store user
declare module "express-session" {
    interface SessionData {
        user?: {
            name: string;
            email: string | null;
            role: string;
            accessToken?: string;
            refreshToken?: string;
            provider: "gmail" | "outlook";
        };
    }
}

// Google OAuth Strategy
passport.use(new GoogleStrategy(
    {
        clientID: SERVER_CONFIG.GOOGLE.CLIENT_ID,
        clientSecret: SERVER_CONFIG.GOOGLE.CLIENT_SECRET,
        callbackURL: SERVER_CONFIG.GOOGLE.REDIRECT_URI,
        accessType: "offline",
        prompt: "consent",
        passReqToCallback: true,
        scope: ["profile", "email", "https://www.googleapis.com/auth/gmail.send"],

    },
    (req: Request, accessToken: string, refreshToken: string, profile: GoogleProfile, done) => {
        const user = {
            name: profile.displayName,
            email: profile.emails?.[0]?.value || null,
            accessToken,
            refreshToken,
            provider: "gmail"
        };

        req.session.user = user;
        console.log("🔹 Google OAuth Tokens Received:");
        console.log("Access Token:", accessToken);
        console.log("Refresh Token:", refreshToken || "❌ Not Received");
        return done(null, user);
    }
));

// Microsoft OAuth Strategy
passport.use(new MicrosoftStrategy(
    {
        clientID: SERVER_CONFIG.MICROSOFT.CLIENT_ID,
        clientSecret: SERVER_CONFIG.MICROSOFT.CLIENT_SECRET,
        callbackURL: SERVER_CONFIG.MICROSOFT.REDIRECT_URI
    },
    (accessToken: string, refreshToken: string, profile, done) => {
        const user = {
            name: profile.displayName,
            email: profile.emails?.[0]?.value || null,
            provider: "outlook"
        };

        return done(null, user);
    }
));

// Session handlers
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj as Express.User);
});
