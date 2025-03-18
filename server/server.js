require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");

require("./auth"); // Loads authentication logic

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
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());


// Google OAuth Routes
app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
        res.redirect("http://localhost:5173/dashboard"); // Redirect to frontend after login
    }
);

// Microsoft OAuth Routes
app.get("/auth/microsoft",
    passport.authenticate("microsoft", { scope: ["User.Read", "Mail.Send"] })
);

// Microsoft OAuth Callback
app.get("/auth/microsoft/callback",
    passport.authenticate("microsoft", { failureRedirect: "/" }),
    (req, res) => {
        res.redirect("http://localhost:5173/dashboard"); // Redirect to frontend
    }
);

app.get("/user", (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not logged in" });
    }
    res.json({
        name: req.user.profile.displayName,
        email: req.user.profile.emails[0].value
    });
});



// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
