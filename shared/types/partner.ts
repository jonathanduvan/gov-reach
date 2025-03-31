export interface Partner {
    _id?: string;
    name: string;
    contactEmail: string;
    website?: string;
    approved: boolean;
    approvedBy?: string; // email of the admin user who approved
    createdAt?: string;
    updatedAt?: string;
}
