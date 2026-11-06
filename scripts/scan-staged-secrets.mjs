import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
if (existsSync(".env.local")) loadEnvFile(".env.local");
const configuredSecrets = Object.entries(process.env)
  .filter(
    ([name, value]) =>
      /(?:API_KEY|ACCESS_TOKEN|AUTH_TOKEN|SECRET|PASSWORD)$/.test(name) &&
      value &&
      value.length >= 8,
  )
  .map(([, value]) => value);
const paths = execFileSync(
  "git",
  ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
if (!paths.length) throw Error("No staged files to scan");
const patterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  [
    "GitHub token",
    /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/,
  ],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["Hindsight key", /\bhsk_[A-Za-z0-9_-]{12,}\b/],
  ["OpenAI-style key", /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/],
  ["credential-bearing URL", /https?:\/\/[^\s\/"']+:[^\s\/@]+@/],
];
const findings = [];
for (const path of paths) {
  if (
    (/(^|\/)\.env(?:\.|$)/.test(path) && path !== ".env.example") ||
    /^(?:data|node_modules|\.next|coverage|out|dist|build)\//.test(path) ||
    /\.(?:sqlite\d*|db|pem|key|p12|pfx)(?:-|$)/i.test(path) ||
    /\.tsbuildinfo$/.test(path) ||
    /^docs\/.*results\.json$/.test(path)
  )
    findings.push({ path, reason: "excluded/private artifact" });
  const bytes = execFileSync("git", ["show", ":" + path], {
    maxBuffer: 20 * 1024 * 1024,
  });
  if (configuredSecrets.some((secret) => bytes.includes(Buffer.from(secret))))
    findings.push({ path, reason: "configured secret match" });
  const text = bytes.toString("utf8");
  for (const [reason, pattern] of patterns)
    if (pattern.test(text)) findings.push({ path, reason });
}
const required = [
  ".env.example",
  "README.md",
  "DEMO_SCRIPT.md",
  "VERIFICATION.md",
  "package.json",
  "package-lock.json",
];
for (const path of required)
  if (!paths.includes(path))
    findings.push({ path, reason: "required file missing" });
console.log(
  JSON.stringify(
    {
      stagedFilesScanned: paths.length,
      configuredSecretsChecked: configuredSecrets.length,
      findings,
    },
    null,
    2,
  ),
);
if (findings.length) process.exitCode = 1;
