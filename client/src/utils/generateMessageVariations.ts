// src/utils/generateMessageVariations.ts
import { Official } from "../../../shared/types/official";

interface VariationOptions {
    template: string;
    user: {
        name?: string;
        city?: string;
        zip?: string;
    };
    issue?: string;
    officials: Official[];
}

const greetings = ["Dear", "Hello", "Hi"];
const closings = ["Sincerely", "All the best", "Thank you", "Yours truly"];

const transitions = [
    "I urge you to take immediate action.",
    "This issue cannot wait.",
    "Please act now.",
    "Your leadership on this would be appreciated.",
    "I'm counting on your voice."
];

const synonymSwaps = [
    { from: "support", to: ["back", "advocate for", "promote"] },
    { from: "important", to: ["crucial", "urgent", "essential"] },
    { from: "protect", to: ["defend", "safeguard", "preserve"] }
];

function replacePlaceholders(text: string, official: Official, user: VariationOptions["user"], issue?: string) {
    return text
        .replace(/\[Official Name\]/gi, official.fullName)
        .replace(/\[Official Role\]/gi, official.role)
        .replace(/\[State\]/gi, official.state)
        .replace(/\[Your Name\]/gi, user.name || "")
        .replace(/\[Your City\]/gi, user.city || "")
        .replace(/\[Your Zip\]/gi, user.zip || "")
        .replace(/\[Issue\]/gi, issue || "");
}

function swapSynonyms(text: string, index: number) {
    let modified = text;
    synonymSwaps.forEach(({ from, to }) => {
        const word = to[index % to.length];
        const regex = new RegExp(`\\b${from}\\b`, "gi");
        modified = modified.replace(regex, word);
    });
    return modified;
}

export function generateMessageVariations({
    template,
    user,
    issue,
    officials
}: VariationOptions): string[] {
    return officials.map((official, i) => {
        const greeting = greetings[i % greetings.length];
        const closing = closings[i % closings.length];
        const transition = transitions[i % transitions.length];

        let base = `${greeting} [Official Name],\n\n${template}\n\n${transition}\n\n${closing},\n[Your Name]`;

        // Replace placeholders + synonyms
        const filled = replacePlaceholders(base, official, user, issue);
        const varied = swapSynonyms(filled, i);

        return varied.trim();
    });
}
