// 1. Imports
import express, { Request, Response } from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import dotenv from "dotenv";
import "./auth.js"; // Must come after dotenv

import { SERVER_CONFIG } from "./config.js";
import { connectToDatabase } from "./db.js";
import { sendEmailGmail, sendEmailOutlook } from "./email.js";
import officialsRouter from "./routes/officials.js";
import issuesRouter from "./routes/issues.js"
import contactGroupsRouter from "./routes/contactGroups.js";
import partnerRequestRouter from "./routes/partnerRequest.js";
import officialSubmissionsRouter from "./routes/officialSubmissions.js";
import batchSubmissionsRouter from "./routes/batchSubmissions.js";
import ThreadLockRouter from "./routes/threadLock.js"


// 2. Load env and connect DB
dotenv.config();
await connectToDatabase();

// 3. App & Middleware
const app = express();
app.use(cors({ origin: SERVER_CONFIG.CLIENT_URL, credentials: true }));
app.use(express.json());

app.use(session({
    secret: SERVER_CONFIG.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, sameSite: "lax" }
}));

app.use(passport.initialize());
app.use(passport.session());

// 4. Routes
app.use("/api/officials", officialsRouter);
app.use("/api/issues", issuesRouter);
app.use("/api/contact-groups", contactGroupsRouter);
app.use("/api/partner-requests", partnerRequestRouter);
app.use("/api/officials/submissions", officialSubmissionsRouter);
app.use("/api/officials/submissions", batchSubmissionsRouter);
app.use("/api/officials/submissions", ThreadLockRouter);


// 5. OAuth Routes

app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req: Request, res: Response) => {
    req.session.user = req.user as any;
    res.redirect(`${SERVER_CONFIG.CLIENT_URL}/dashboard`);
  }
);

app.get("/auth/microsoft",
    passport.authenticate("microsoft", { scope: ["User.Read", "Mail.Send"] })
);

app.get("/auth/microsoft/callback",
  passport.authenticate("microsoft", { failureRedirect: "/" }),
  (req: Request, res: Response) => {
    req.session.user = req.user as any;
    res.redirect(`${SERVER_CONFIG.CLIENT_URL}/dashboard`);
  }
);

// 6. Session: Get user
app.get("/user", (req: Request, res: Response) => {
  if (!req.session.user) return res.status(401).json({ message: "Not logged in" });

  const { id, name, email, provider, role } = req.session.user;
  res.json({ id, name, email, provider, role });
});

// 7. Logout
app.get("/logout", (req: Request, res: Response) => {
    req.session.destroy(err => {
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

// 8. Send Email
app.post("/send-email/:provider", async (req: Request, res: Response) => {
    const { provider } = req.params;
    const { to, subject, text } = req.body;

    if (!req.session.user?.email) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    try {
        let response;
        if (provider === "gmail") {
            response = await sendEmailGmail(req, to, subject, text);
        } else if (provider === "outlook") {
            response = await sendEmailOutlook(to, subject, text);
        } else {
            return res.status(400).json({ message: "Invalid email provider" });
        }

        res.json(response);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to send email", error: error.message });
    }
});

// 9. Start Server
app.listen(SERVER_CONFIG.PORT, () =>
    console.log(`✅ Server running on http://localhost:${SERVER_CONFIG.PORT}`)
);
