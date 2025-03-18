import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import "./auth.js"; // Loads authentication logic

const app = express();

// Middleware
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // Prevents creating empty sessions
    cookie: {
        httpOnly: true, // Prevents XSS attacks
        secure: false, // Set to true in production (HTTPS)
        sameSite: "lax"
    }
}));
app.use(passport.initialize());
app.use(passport.session());

// Updated Google OAuth Routes
app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
        req.session.user = req.user; // Store user data in session
        res.redirect("http://localhost:5173/dashboard"); // Redirect to frontend
    }
);

// Updated Microsoft OAuth Routes
app.get("/auth/microsoft",
    passport.authenticate("microsoft", { scope: ["User.Read", "Mail.Send"] })
);

app.get("/auth/microsoft/callback",
    passport.authenticate("microsoft", { failureRedirect: "/" }),
    (req, res) => {
        req.session.user = req.user;
        res.redirect("http://localhost:5173/dashboard");
    }
);

// Properly Fetch Authenticated User
app.get("/user", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Not logged in" });
    }
    res.json({
        name: req.session.user.name,
        email: req.session.user.email
    });
});

// Logout Route (Clears Session)
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid"); // Clears session cookie
        res.json({ message: "Logged out successfully" });
    });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
