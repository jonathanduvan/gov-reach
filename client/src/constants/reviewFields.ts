import { FieldDef } from "../types/review";


export const FIELDS: FieldDef[] = [
  { key: "fullName",            label: "Full name",     type: "text" },
  { key: "role",                label: "Role/Title",    type: "text" },
  { key: "email",               label: "Email",         type: "text" },
  { key: "state",               label: "State",         type: "text" },
  { key: "category",            label: "Category",      type: "text" },
  { key: "level",               label: "Level",         type: "text" },
  { key: "jurisdiction.city",   label: "City",          type: "text" },
  { key: "jurisdiction.county", label: "County",        type: "text" },
  { key: "issues",              label: "Issues",        type: "array" },
  { key: "phoneNumbers",        label: "Phone numbers", type: "array" },
];
