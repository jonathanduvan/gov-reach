import { Types } from "mongoose";

export interface ContactGroup {
    _id?: string;
    title: string;
    description?: string;
    issues: string[];
    partner: string;
    messageTemplate: string;
    status: "pending" | "approved";
    officials: Types.ObjectId[] | string[];
    createdAt?: Date;
    updatedAt?: Date;
}
