import { useState } from "react";
import { API_BASE_URL } from "../config";

const SendEmail = ({ provider }: { provider: "gmail" | "outlook" }) => {
    const [emailData, setEmailData] = useState({
        to: "",
        subject: "",
        text: "",
    });
    const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setEmailData({ ...emailData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus(null);

        try {
            const response = await fetch(`${API_BASE_URL}/send-email/${provider}`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(emailData),
            });

            const result = await response.json();
            setStatus({ success: result.success, message: result.message });
        } catch (error) {
            setStatus({ success: false, message: "Failed to send email. Please try again." });
        }
    };

    return (
        <div>
            <h2>Send an Email via {provider.toUpperCase()}</h2>
            <form onSubmit={handleSubmit}>

                <label>
                    Recipient Email:
                    <input type="email" name="to" value={emailData.to} onChange={handleChange} required />
                </label>

                <label>
                    Subject:
                    <input type="text" name="subject" value={emailData.subject} onChange={handleChange} required />
                </label>

                <label>
                    Message:
                    <textarea name="text" value={emailData.text} onChange={handleChange} required />
                </label>

                <button type="submit">Send Email</button>
            </form>

            {status && (
                <p style={{ color: status.success ? "green" : "red" }}>
                    {status.message}
                </p>
            )}
        </div>
    );
};

export default SendEmail;
