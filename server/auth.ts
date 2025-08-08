import passport from "passport";
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from "passport-google-oauth20";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";
import { SERVER_CONFIG } from "./config.js";
import { Request } from "express";
import { findOrCreateUserByEmail } from "./services/userService.js";

// Session type: include role/id
declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      name: string;
      email: string | null;
      role: "admin" | "partner" | "contributor" | "user";
      accessToken?: string;
      refreshToken?: string;
      provider: "gmail" | "outlook";
    };
  }
}

// 🟢 Google OAuth Strategy
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
  // Make callback async so we can query Mongo
  async (req: Request, accessToken: string, refreshToken: string, profile: GoogleProfile, done) => {
    try {
      const email = profile.emails?.[0]?.value || null;
      const name = profile.displayName || email || "Unknown";
      if (!email) return done(new Error("Google profile missing email"));

      const dbUser = await findOrCreateUserByEmail(email.toLowerCase(), name);

      const sessUser = {
        id: dbUser._id.toString(),
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        accessToken,
        refreshToken,
        provider: "gmail" as const,
      };

      req.session.user = sessUser;
      return done(null, sessUser);
    } catch (err) {
      return done(err as any);
    }
  }
));

// 🟣 Microsoft OAuth Strategy
passport.use(new MicrosoftStrategy(
  {
    clientID: SERVER_CONFIG.MICROSOFT.CLIENT_ID,
    clientSecret: SERVER_CONFIG.MICROSOFT.CLIENT_SECRET,
    callbackURL: SERVER_CONFIG.MICROSOFT.REDIRECT_URI,
    scope: ["User.Read", "Mail.Send", "email", "openid", "profile"],
  },
  // No req here; we return the session user via done()
  async (accessToken: string, refreshToken: string, profile: any, done) => {
    try {
      const email = profile.emails?.[0]?.value || profile._json?.mail || profile._json?.userPrincipalName || null;
      const name = profile.displayName || email || "Unknown";
      if (!email) return done(new Error("Microsoft profile missing email"));

      const dbUser = await findOrCreateUserByEmail(email.toLowerCase(), name);

      const sessUser = {
        id: dbUser._id.toString(),
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        provider: "outlook" as const,
        accessToken,
        refreshToken,
      };

      return done(null, sessUser);
    } catch (err) {
      return done(err as any);
    }
  }
));

// Session handlers
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj as Express.User));
