// kuaicha_env.mjs - Environment configuration for Kuaicha skill
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

function getLocalConfigPath() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  return join(__dirname, "..", "config.txt");
}

function readConfig(filePath) {
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, "utf8");
      const match = content.match(/^KUAICHA_API_KEY=(.+)$/m);
      if (match) return match[1].trim();
    } catch {
    }
  }
  return null;
}

export function getApiKey() {
  // 1. Environment variable takes priority
  if (process.env.KUAICHA_API_KEY) {
    return process.env.KUAICHA_API_KEY;
  }

  // 2. Try reading from config.txt
  const localConfigPath = getLocalConfigPath();
  const localKey = readConfig(localConfigPath);
  if (localKey) return localKey;

  // 3. Try reading from ~/.kuaicha/config
  const configPath = join(homedir(), ".kuaicha", "config");
  if (existsSync(configPath)) {
    const content = readFileSync(configPath, "utf8");
    const match = content.match(/^KUAICHA_API_KEY=(.+)$/m);
    if (match) return match[1].trim();
  }

  return null;
}

export const BASE_URL = process.env.KUAICHA_BASE_URL || "https://bizveris.kuaicha365.com";
