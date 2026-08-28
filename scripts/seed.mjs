import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");

let envContent;
try {
  envContent = readFileSync(envPath, "utf8");
} catch {
  console.error("Could not find .env.local in the project root.");
  console.error("Run `npx vercel env pull .env.local` first.");
  process.exit(1);
}

const match = envContent.match(/^CRON_SECRET="?([^"\n]+)"?$/m);
if (!match) {
  console.error("CRON_SECRET not found in .env.local.");
  process.exit(1);
}

const cronSecret = match[1];

let response;
try {
  response = await fetch("http://localhost:3000/api/cron/fetch-plans", {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
} catch (error) {
  console.error(
    "Could not reach http://localhost:3000 — is `npm run dev` running in another terminal?",
  );
  process.exit(1);
}

const body = await response.json().catch(() => null);
if (!response.ok) {
  console.error(`Seed failed (HTTP ${response.status}):`, body);
  process.exit(1);
}

console.log("Done:", body);
