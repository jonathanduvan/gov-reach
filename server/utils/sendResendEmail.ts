// server/utils/sendResendEmail.ts
import { Resend } from 'resend';
import dotenv from 'dotenv';
import { SERVER_CONFIG } from '../config.js';

dotenv.config();

const resend = new Resend(SERVER_CONFIG.PARTNER_MAILER.API_KEY);

export async function sendPartnerRequestEmail({ name, org, email, website, campaignInfo }: {
    name: string;
    org: string;
    email: string;
    website?: string;
    campaignInfo: string;
}) {
    const text = `
New Partner Request:

- Name: ${name}
- Organization: ${org}
- Email: ${email}
- Website: ${website || "N/A"}
- Campaign Info: ${campaignInfo}
`;

    try {
        await resend.emails.send({
            from: SERVER_CONFIG.PARTNER_MAILER.FROM_EMAIL,
            to: SERVER_CONFIG.PARTNER_MAILER.TO_EMAIL,
            subject: 'New GovReach Partner Request',
            text
        });

        return { success: true };
    } catch (error: any) {
        console.error("❌ Error sending partner request email:", error);
        return { success: false, message: error.message };
    }
}
