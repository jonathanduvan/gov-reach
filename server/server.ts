// 1. Imports
import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import dotenv from "dotenv";

import { SERVER_CONFIG } from "./config.js";
import { connectToDatabase } from "./db.js";
import { sendEmailGmail, sendEmailOutlook } from "./email.js";
import officialsRouter from "./routes/officials.js";
import emailGroupsRouter from "./routes/emailGroups.js";

import "./auth.js";

// 2. Connect to DB
await connectToDatabase();

// 3. App & Middleware
const app = express();
app.use(cors({ origin: SERVER_CONFIG.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, sameSite: "lax" }
}));
app.use(passport.initialize());
app.use(passport.session());

// 4. Routes (Auth, Email, Data)
app.use("/api/officials", officialsRouter);
app.use("/api/email-groups", emailGroupsRouter);

// OAuth Routes (Google)
app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
        req.session.user = req.user;
        res.redirect(`${SERVER_CONFIG.CLIENT_URL}/dashboard`);
    }
);

// OAuth Routes (Microsoft)
app.get("/auth/microsoft",
    passport.authenticate("microsoft", { scope: ["User.Read", "Mail.Send"] })
);

app.get("/auth/microsoft/callback",
    passport.authenticate("microsoft", { failureRedirect: "/" }),
    (req, res) => {
        req.session.user = req.user;
        res.redirect(`${SERVER_CONFIG.CLIENT_URL}/dashboard`);
    }
);

// User Info Route
app.get("/user", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Not logged in" });
    }
    res.json({
        name: req.session.user.name,
        email: req.session.user.email,
        provider: req.session.user.provider
    });
});

// Logout Route
app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).json({ message: "Logout failed" });
        }

        res.clearCookie("connect.sid", { path: "/" });

        res.setHeader("Access-Control-Allow-Origin", SERVER_CONFIG.CLIENT_URL);
        res.setHeader("Access-Control-Allow-Credentials", "true");

        res.json({ message: "Logged out successfully" });
    });
});


app.post("/send-email/:provider", async (req, res) => {
    const { provider } = req.params;
    const { to, subject, text } = req.body;

    if (!req.session.user || !req.session.user.email) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    let response;
    try {
        if (provider === "gmail") {
            const response = await sendEmailGmail(req, to, subject, text);
        } else if (provider === "outlook") {
            response = await sendEmailOutlook(to, subject, text);
        } else {
            return res.status(400).json({ message: "Invalid email provider" });
        }
        res.json(response);
    } catch (error) {
        res.status(500).json({ message: "Failed to send email", error: error.message });
    }
});


// Start Server
app.listen(SERVER_CONFIG.PORT, () =>
    console.log(`✅ Server running on http://localhost:${SERVER_CONFIG.PORT}`)
);
