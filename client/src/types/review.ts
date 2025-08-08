export type Phone = {
  number: string;
  label?: string;
  priority?: number;
  verified?: boolean;
  source?: string;
  notes?: string;
};

export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "array";
};

export type VariantSource = {
  key: string;
  label: string;
  submission: any;
  proposed: any;
};

export type CandidatesByField = Record<string, Array<{ source: string; value: any }>>;
