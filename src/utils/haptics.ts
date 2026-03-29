import * as Haptics from "expo-haptics";

export const triggerSelectionHaptic = () => {
  Haptics.selectionAsync().catch(() => undefined);
};

export const triggerImpactHaptic = (
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light
) => {
  Haptics.impactAsync(style).catch(() => undefined);
};

export const triggerSuccessHaptic = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
};
