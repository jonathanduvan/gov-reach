// tailwind.config.js
import colors from "tailwindcss/colors";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // App theme
        brand: colors.teal,       // brand-50..900
        accent: colors.indigo,    // accent-50..900

        // Status
        info: colors.sky,
        success: colors.emerald,
        warning: colors.amber,
        danger: colors.rose,

        // Neutrals
        neutral: colors.slate,

        // Role hues (non-danger/warning; calm & civic)
        role: {
          admin: colors.violet,       // authority, not alarm
          partner: colors.cyan,       // collaboration
          contributor: colors.emerald,// growth/grassroots
          user: colors.slate,         // neutral
          guest: colors.zinc,         // lighter neutral
        },
      },
      fontFamily: {
        sans: [
          '"Public Sans"',
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "Apple Color Emoji",
          "Segoe UI Emoji",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.10)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
