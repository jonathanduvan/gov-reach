import nodemailer from "nodemailer";
import { google } from "googleapis";
import { ConfidentialClientApplication } from "@azure/msal-node";

// Google OAuth2 Setup
const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);
// Microsoft OAuth2 Setup
const msalClient = new ConfidentialClientApplication({
    auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        authority: "https://login.microsoftonline.com/common"
    }
});


/**
 * Refresh the access token using refresh token
 */
async function refreshAccessToken(req) {
    if (!req.session.user || !req.session.user.refreshToken) {
        throw new Error("❌ Refresh token missing or user not authenticated.");
    }

    try {
        oAuth2Client.setCredentials({ refresh_token: req.session.user.refreshToken });
        const { credentials } = await oAuth2Client.refreshAccessToken();

        req.session.user.accessToken = credentials.access_token;  // ✅ Update session with new token
        console.log("✅ New Access Token:", credentials.access_token);

        return credentials.access_token;
    } catch (error) {
        console.error("❌ Error refreshing access token:", error.response?.data || error);
        throw new Error("Failed to refresh access token.");
    }
}

/**
 * Send an email via Gmail OAuth2
 */
export async function sendEmailGmail(req, to, subject, text) {
    try {
        if (!req.session.user || !req.session.user.email) {
            throw new Error("User is not authenticated.");
        }

        let accessToken = req.session.user.accessToken;

        // ✅ If accessToken is missing/expired, refresh it
        if (!accessToken) {
            console.log("🔹 Access token missing, refreshing...");
            accessToken = await refreshAccessToken(req);
        }

        console.log(`🔹 Sending email as: ${req.session.user.email}`);

        const transport = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: req.session.user.email,
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                refreshToken: req.session.user.refreshToken,
                accessToken
            }
        });

        const mailOptions = {
            from: req.session.user.email,
            to,
            subject,
            text
        };

        await transport.sendMail(mailOptions);
        console.log(`✅ Email sent successfully from ${req.session.user.email}`);
        return { success: true, message: `Email sent successfully via ${req.session.user.email}` };
    } catch (error) {
        console.error("❌ Error sending email via Gmail:", error.response?.data || error);
        return { success: false, message: `Failed to send email via Gmail: ${error.message}` };
    }
}

// Function to send email via Outlook
export async function sendEmailOutlook(to, subject, text) {
    try {
        const tokenResponse = await msalClient.acquireTokenByClientCredential({
            scopes: ["https://graph.microsoft.com/.default"]
        });

        const transport = nodemailer.createTransport({
            service: "hotmail",
            auth: {
                user: process.env.OUTLOOK_USER,
                pass: process.env.OUTLOOK_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.OUTLOOK_USER,
            to,
            subject,
            text
        };

        await transport.sendMail(mailOptions);
        return { success: true, message: "Email sent successfully via Outlook" };
    } catch (error) {
        console.error("Error sending email via Outlook:", error);
        return { success: false, message: "Failed to send email via Outlook" };
    }
}
