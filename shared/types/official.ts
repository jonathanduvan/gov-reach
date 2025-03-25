export interface Official {
    _id?: string;
    fullName: string;
    role: string;
    email: string;
    state: string;
    category: string;
    level: "federal" | "state" | "municipal" | "regional" | "tribal";
    issues: string[];
    partners: string[];
    verified: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
