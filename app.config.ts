import type { ExpoConfig } from "expo/config";
import appJson from "./app.json";

const config = appJson.expo as ExpoConfig;
const appOrigin = process.env.EXPO_PUBLIC_APP_ORIGIN?.trim() || process.env.APP_ORIGIN?.trim();

const plugins: ExpoConfig["plugins"] =
  config.plugins?.map((plugin) => {
    if (plugin !== "expo-router") {
      return plugin;
    }

    return appOrigin ? (["expo-router", { origin: appOrigin }] as [string, any]) : plugin;
  }) ?? config.plugins;

export default (): ExpoConfig => ({
  ...config,
  ...(plugins ? { plugins } : {}),
});
