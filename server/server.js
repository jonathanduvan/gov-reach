require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");

require("./auth"); // Loads authentication logic

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// Test Route
app.get("/", (req, res) => {
    res.send("GovReach Backend is Running!");
});

// Google OAuth Routes
app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
        res.redirect("/dashboard"); // Redirect to frontend after login
    }
);

// Microsoft OAuth Routes
app.get("/auth/microsoft",
    passport.authenticate("microsoft", { scope: ["User.Read", "Mail.Send"] })
);

app.get("/auth/microsoft/callback",
    passport.authenticate("microsoft", { failureRedirect: "/" }),
    (req, res) => {
        res.redirect("/dashboard");
    }
);

app.get("/dashboard", (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect("/");
    }

    res.send(`
        <h1>Welcome to GovReach</h1>
        <p>You are logged in as ${req.user.profile.displayName}</p>
        <a href="/logout">Logout</a>
    `);
});



// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
