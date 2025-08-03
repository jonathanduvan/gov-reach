export interface Jurisdiction {
  city?: string;
  county?: string;
  congressionalDistrict?: string; // e.g., "FL-22"
  stateLegislativeDistrict?: string;
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
  level: "federal" | "state" | "municipal" | "regional" | "tribal";
  issues?: string[]; // Issue _id refs
  partners: string[];
  verified: boolean;

  // crowdsource / trust metadata
  crowdVotes?: CrowdVotes;
  confidenceScore?: number;
  sourceAttributions?: SourceAttributionEntry[];
  location?: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  jurisdiction?: Jurisdiction;
  createdAt?: Date;
  updatedAt?: Date;
}
