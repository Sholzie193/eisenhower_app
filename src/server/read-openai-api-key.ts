import fs from "node:fs";
import path from "node:path";

const ENV_PATHS = [".env", "app/.env"];

const parseEnvValue = (rawValue: string) => {
  const trimmed = rawValue.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed.replace(/\s+#.*$/, "").trim();
};

export const readOpenAiApiKey = () => {
  const directValue = process.env.OPENAI_API_KEY?.trim();
  if (directValue) {
    return directValue;
  }

  for (const relativePath of ENV_PATHS) {
    const absolutePath = path.join(process.cwd(), relativePath);

    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    const envFile = fs.readFileSync(absolutePath, "utf8");
    const match = envFile.match(/^\s*OPENAI_API_KEY\s*=\s*(.+)\s*$/m);

    if (!match?.[1]) {
      continue;
    }

    const parsedValue = parseEnvValue(match[1]);
    if (!parsedValue) {
      continue;
    }

    process.env.OPENAI_API_KEY = parsedValue;
    return parsedValue;
  }

  return null;
};
