import { Ionicons } from "@expo/vector-icons";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";
import { useAppTheme } from "../providers/theme-provider";
import { triggerSelectionHaptic } from "../utils/haptics";
import { NeuCard } from "./NeuCard";

const DEFAULT_CATEGORIES = [
  "Work",
  "Admin",
  "Home",
  "Personal",
  "Health",
  "Money",
  "Relationships",
  "Errands",
];

interface CategoryFieldProps {
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}

export const CategoryField = ({ value, onChange, hint = "Optional" }: CategoryFieldProps) => {
  const { theme } = useAppTheme();
  const [open, setOpen] = useState(false);

  const options = useMemo(() => {
    if (!value.trim()) {
      return DEFAULT_CATEGORIES;
    }

    return DEFAULT_CATEGORIES.includes(value) ? DEFAULT_CATEGORIES : [value, ...DEFAULT_CATEGORIES];
  }, [value]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Category</Text>
        <Text style={[styles.hint, { color: theme.colors.textSoft }]}>{hint}</Text>
      </View>

      <NeuCard variant="inset" style={styles.fieldCard}>
        <Pressable
          onPress={() => {
            triggerSelectionHaptic();
            Keyboard.dismiss();
            setOpen((current) => !current);
          }}
          style={styles.trigger}
        >
          <View style={styles.triggerCopy}>
            <Text style={[styles.value, { color: value ? theme.colors.text : theme.colors.textSoft }]}>
              {value || "Select a category"}
            </Text>
            <Text style={[styles.helper, { color: theme.colors.textSoft }]}>
              {value ? "Tap to change" : "Helpful if you want to group decisions later"}
            </Text>
          </View>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={16}
            color={theme.colors.textMuted}
          />
        </Pressable>

        {open ? (
          <View style={[styles.menu, { borderTopColor: theme.colors.stroke }]}>
            <View style={styles.optionsWrap}>
              {options.map((option) => {
                const active = option === value;
                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      triggerSelectionHaptic();
                      onChange(option);
                      setOpen(false);
                    }}
                    style={[
                      styles.option,
                      {
                        backgroundColor: active ? theme.colors.surfaceElevated : theme.colors.surfaceMuted,
                        borderColor: active ? theme.colors.accentStrong : theme.colors.stroke,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: active ? theme.colors.text : theme.colors.textMuted },
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => {
                triggerSelectionHaptic();
                onChange("");
                setOpen(false);
              }}
              style={styles.clearAction}
            >
              <Text style={[styles.clearText, { color: theme.colors.textSoft }]}>No category</Text>
            </Pressable>
          </View>
        ) : null}
      </NeuCard>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  hint: {
    fontFamily: "IBMPlexSans_500Medium",
    fontSize: 12,
  },
  fieldCard: {
    borderRadius: 22,
    paddingVertical: 0,
    paddingHorizontal: 0,
    overflow: "hidden",
  },
  trigger: {
    minHeight: 66,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  triggerCopy: {
    flex: 1,
    gap: 3,
  },
  value: {
    fontFamily: "IBMPlexSans_500Medium",
    fontSize: 15,
    lineHeight: 21,
  },
  helper: {
    fontFamily: "IBMPlexSans_500Medium",
    fontSize: 12,
    lineHeight: 16,
  },
  menu: {
    borderTopWidth: 1,
    padding: 14,
    gap: 10,
  },
  optionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    minHeight: 38,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  optionText: {
    fontFamily: "IBMPlexSans_600SemiBold",
    fontSize: 12,
  },
  clearAction: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  clearText: {
    fontFamily: "IBMPlexSans_500Medium",
    fontSize: 12,
  },
});
