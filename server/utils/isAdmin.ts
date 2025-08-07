import { ADMIN_EMAILS } from "../config.js";

export const isAdmin = (email: string | undefined): boolean => {
    return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
};

export const isAdminOrPartner = (email: string | undefined): boolean => {
    return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
};