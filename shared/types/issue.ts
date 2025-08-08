export interface Issue {
  _id?: string;
  name: string;                 // canonical display name, e.g., "Housing"
  slug: string;                 // machine key, e.g., "housing"
  aliases: string[];            // alternative names (lowercased)
  pending: boolean;             // true until curated/approved
  category?: string;            // optional higher-level bucket (e.g., "Local Services")
  createdBy?: string;           // optional: email/id of creator
  updatedBy?: string;           // optional
  usageCount?: number;          // optional: increment when referenced
  createdAt?: Date;
  updatedAt?: Date;
}