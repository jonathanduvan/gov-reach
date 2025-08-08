export type PhoneLabel = "office" | "district" | "capitol" | "scheduler" | "press" | "other";

export type JurisdictionLevels = "federal" | "state" | "county" | "municipal" | "regional" | "tribal";

export interface Jurisdiction {
  city?: string;
  county?: string;
  congressionalDistrict?: string; // e.g., "FL-22"
  stateLegislativeDistrict?: string;
}

export interface PhoneNumber {
  number: string;         // raw or E.164, backend will normalize
  label?: PhoneLabel;
  priority?: number;      // lower = shown first (default 100)
  verified?: boolean;
  source?: string;        // e.g. URL or "org submitted"
  notes?: string;
}

export interface CrowdVotes {
  up: number;
  down: number;
}

export interface SourceAttributionEntry {
  sourceType?: string;
  submittedBy?: string;
  submittedAt?: Date;
  changes?: Record<string, any>;
}

export interface Official {
  _id?: string;
  fullName: string;
  role: string;
  email: string;
  state: string;
  category: string;
  level: JurisdictionLevels;
  issues?: string[]; // Issue _id refs
  partners: string[];
  verified: boolean;

  // crowdsource / trust metadata
  crowdVotes?: CrowdVotes;
  confidenceScore?: number;
  sourceAttributions?: SourceAttributionEntry[];
  jurisdiction?: Jurisdiction;
  phoneNumbers?: PhoneNumber[];
  createdAt?: Date;
  updatedAt?: Date;
}
