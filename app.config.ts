import type { ExpoConfig } from "expo/config";
import appJson from "./app.json";

const config = appJson.expo as ExpoConfig;

export default (): ExpoConfig => ({
  ...config,
  extra: {
    ...config.extra,
    openAIApiKey: process.env.OPENAI_API_KEY ?? null,
  },
});
