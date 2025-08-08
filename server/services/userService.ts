// server/services/userService.ts
import User from "../models/User.js";

function getInitialRole(email: string): "admin" | "partner" | "contributor" | "user" {
  // Optional: bootstrap admins/partners via env
  const admins = (process.env.ADMIN_EMAILS || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  if (admins.includes(email.toLowerCase())) return "admin";

  const partners = (process.env.PARTNER_EMAILS || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  if (partners.includes(email.toLowerCase())) return "partner";

  return "user";
}

export async function findOrCreateUserByEmail(email: string, name: string) {
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name,
      email,
      role: getInitialRole(email),
      approved: true, // or false if you want manual approval
    });
  }
  // If name changed on provider side, keep it fresh (optional)
  if (name && user.name !== name) {
    user.name = name;
    await user.save();
  }
  return user;
}
