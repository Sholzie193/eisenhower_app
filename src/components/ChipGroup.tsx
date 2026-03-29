import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../providers/theme-provider";
import { triggerSelectionHaptic } from "../utils/haptics";

interface ChipOption<T extends string> {
  label: string;
  value: T;
}

interface ChipGroupProps<T extends string> {
  options: ChipOption<T>[];
  selected: T[];
  onChange: (selected: T[]) => void;
  multiple?: boolean;
}

export const ChipGroup = <T extends string>({
  options,
  selected,
  onChange,
  multiple = false,
}: ChipGroupProps<T>) => {
  const { theme } = useAppTheme();

  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              triggerSelectionHaptic();
              if (multiple) {
                onChange(
                  active
                    ? selected.filter((value) => value !== option.value)
                    : [...selected, option.value]
                );
              } else {
                onChange([option.value]);
              }
            }}
            style={[
              styles.chip,
              {
                backgroundColor: active ? theme.colors.accentWash : theme.colors.surfaceMuted,
                borderColor: active ? theme.colors.accentStrong : theme.colors.stroke,
                shadowColor: active ? theme.colors.shadowDark : "transparent",
              },
            ]}
          >
            <Text
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
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  label: {
    fontSize: 13,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
});
