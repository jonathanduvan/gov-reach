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
  crowdVotes?: {
    up: number;
    down: number;
  };
  confidenceScore?: number;
  sourceAttributions?: Array<{
    sourceType: string; // e.g., "user_submission", "scraped"
    submittedBy: string;
    submittedAt: Date;
    changes?: Record<string, any>;
  }>;

  // optional geo (for lookup)
  location?: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  jurisdiction?: {
    city?: string;
    county?: string;
    congressionalDistrict?: string;
    stateLegislativeDistrict?: string;
  };

  createdAt?: Date;
  updatedAt?: Date;
}
