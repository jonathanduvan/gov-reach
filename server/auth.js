import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => {
    const user = {
        name: profile.displayName,
        email: profile.emails?.[0]?.value || null // Ensure email exists
    };
    return done(null, user);
}));

// Microsoft OAuth Strategy
passport.use(new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: "/auth/microsoft/callback"
}, (accessToken, refreshToken, profile, done) => {
    const user = {
        name: profile.displayName,
        email: profile.emails?.[0]?.value || null // Ensure email exists
    };
    return done(null, user);
}));

// Serialize user to store in session
passport.serializeUser((user, done) => done(null, user));

// Deserialize user from session
passport.deserializeUser((obj, done) => done(null, obj));
