import fs from "node:fs";
import path from "node:path";

export function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function getConfig() {
  loadEnv();

  return {
    rssUrl: process.env.GEEKNEWS_RSS_URL || "https://news.hada.io/rss/news",
    topN: Number(process.env.TOP_N || 7),
    useOpenAI:
      String(process.env.USE_OPENAI || "true").toLowerCase() === "true",
    openaiApiKey: process.env.OPENAI_API_KEY || "",
    openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    kakao: {
      restApiKey: process.env.KAKAO_REST_API_KEY || "",
      clientSecret: process.env.KAKAO_CLIENT_SECRET || "",
      redirectUri: process.env.KAKAO_REDIRECT_URI || "",
      authCode: process.env.KAKAO_AUTH_CODE || "",
      refreshToken: process.env.KAKAO_REFRESH_TOKEN || "",
      accessToken: process.env.KAKAO_ACCESS_TOKEN || "",
    },
    maxCharsPerItem: Number(process.env.MAX_CHARS_PER_ITEM || 180),
    dryRun: String(process.env.DRY_RUN || "true").toLowerCase() === "true",
  };
}

export function required(value, name) {
  if (!value) throw new Error(`Missing required env: ${name}`);
}
