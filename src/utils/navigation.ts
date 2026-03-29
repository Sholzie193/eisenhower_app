import { router } from "expo-router";

export const goBackOrFallback = (fallbackHref: string = "/") => {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallbackHref);
};
