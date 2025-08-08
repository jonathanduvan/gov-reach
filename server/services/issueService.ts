// server/services/issueService.ts
import Issue from "../models/Issue.js";

export function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * Ensure issues exist for the given list of names.
 * Returns array of ObjectId strings and the canonical names.
 */
export async function ensureIssuesByNames(names: string[]) {
  const unique = Array.from(new Set(names.map(n => n.trim()).filter(Boolean)));
  const ids: string[] = [];
  const canonicalNames: string[] = [];

  for (const name of unique) {
    const slug = toSlug(name);
    let issue = await Issue.findOne({ slug });
    if (!issue) {
      issue = await Issue.create({
        name,
        slug,
        pending: true, // new issues start as pending until curated
      });
    }
    ids.push(issue._id.toString());
    canonicalNames.push(issue.name);
  }

  return { ids, names: canonicalNames };
}
