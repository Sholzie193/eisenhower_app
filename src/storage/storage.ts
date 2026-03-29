import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DecisionItem } from "../types/decision";

const STORAGE_KEYS = {
  items: "decision-triage:items:v1",
  theme: "decision-triage:theme:v1",
  intro: "decision-triage:intro:v1",
};

const safeParse = <T,>(value: string | null, fallback: T) => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const storage = {
  async loadItems() {
    return safeParse<DecisionItem[]>(await AsyncStorage.getItem(STORAGE_KEYS.items), []);
  },
  async saveItems(items: DecisionItem[]) {
    await AsyncStorage.setItem(STORAGE_KEYS.items, JSON.stringify(items));
  },
  async loadThemeMode() {
    return safeParse<"light" | "dark" | null>(
      await AsyncStorage.getItem(STORAGE_KEYS.theme),
      null
    );
  },
  async saveThemeMode(value: "light" | "dark") {
    await AsyncStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(value));
  },
  async loadIntroSeen() {
    return safeParse<boolean>(await AsyncStorage.getItem(STORAGE_KEYS.intro), false);
  },
  async saveIntroSeen(value: boolean) {
    await AsyncStorage.setItem(STORAGE_KEYS.intro, JSON.stringify(value));
  },
};
