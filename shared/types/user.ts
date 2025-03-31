export type UserRole = "admin" | "partner" | "contributor";

export interface User {
    _id?: string;
    name: string;
    email: string;
    role: UserRole;
    approved: boolean;
    partnerId?: string; // optional: link to a partner org
    createdAt?: string;
    updatedAt?: string;
}
