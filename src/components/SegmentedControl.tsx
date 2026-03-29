import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../providers/theme-provider";
import { NeuCard } from "./NeuCard";
import { triggerSelectionHaptic } from "../utils/haptics";

interface SegmentedOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
}

export const SegmentedControl = <T extends string>({
  value,
  onChange,
  options,
}: SegmentedControlProps<T>) => {
  const { theme } = useAppTheme();

  return (
    <NeuCard variant="inset" style={styles.outer}>
      <View style={styles.row}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                triggerSelectionHaptic();
                onChange(option.value);
              }}
              style={[
                styles.option,
                {
                  backgroundColor: active ? theme.colors.surfaceElevated : "transparent",
                  borderColor: active ? theme.colors.accentStrong : "transparent",
                  shadowColor: active ? theme.colors.shadowDark : "transparent",
                },
              ]}
            >
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.82}
                numberOfLines={2}
                style={[
                  styles.label,
                  { color: active ? theme.colors.text : theme.colors.textMuted },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </NeuCard>
  );
};

const styles = StyleSheet.create({
  outer: {
    padding: 4,
    borderRadius: 20,
  },
  row: {
    flexDirection: "row",
    gap: 4,
  },
  option: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  label: {
    width: "100%",
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center",
    fontFamily: "IBMPlexSans_600SemiBold",
  },
});
