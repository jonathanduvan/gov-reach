import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";
import { SERVER_CONFIG } from "./config.js";

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: SERVER_CONFIG.GOOGLE.CLIENT_ID,
    clientSecret: SERVER_CONFIG.GOOGLE.CLIENT_SECRET,
    callbackURL: SERVER_CONFIG.GOOGLE.REDIRECT_URI,
    passReqToCallback: true,
    scope: ["profile", "email", "https://www.googleapis.com/auth/gmail.send"],
    accessType: "offline", // ✅ Request refresh token
    prompt: "consent" // ✅ Force user to reauthorize & get refresh token
}, (req, accessToken, refreshToken, profile, done) => {
    console.log("🔹 Google OAuth Tokens Received:");
    console.log(req.session.user);
    console.log("Access Token:", accessToken);
    console.log("Refresh Token:", refreshToken || "❌ Not Received");
    const user = {
        name: profile.displayName,
        email: profile.emails?.[0]?.value || null,
        accessToken,
        refreshToken,
        provider: "gmail"
    };
    req.session.user = user; // ✅ Store the user in session
    return done(null, user);
}));

// Microsoft OAuth Strategy
passport.use(new MicrosoftStrategy({
    clientID: SERVER_CONFIG.MICROSOFT.CLIENT_ID,
    clientSecret: SERVER_CONFIG.MICROSOFT.CLIENT_SECRET,
    callbackURL: SERVER_CONFIG.MICROSOFT.REDIRECT_URI
}, (accessToken, refreshToken, profile, done) => {
    const user = {
        name: profile.displayName,
        email: profile.emails?.[0]?.value || null,
        provider: "outlook"
    };
    return done(null, user);
}));

//  Session Serialization
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));
