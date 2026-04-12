import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useAppTheme } from "../providers/theme-provider";
import { NeuCard } from "./NeuCard";

interface FormFieldProps extends TextInputProps {
  label: string;
  hint?: string;
}

export const FormField = ({ label, hint, multiline, style, ...props }: FormFieldProps) => {
  const { theme } = useAppTheme();

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: theme.colors.textSoft }]}>{hint}</Text> : null}
      </View>
      <NeuCard variant="inset" style={styles.inputCard}>
        <TextInput
          {...props}
          multiline={multiline}
          placeholderTextColor={theme.colors.textSoft}
          style={[
            styles.input,
            {
              color: theme.colors.text,
              minHeight: multiline ? 112 : 24,
              textAlignVertical: multiline ? "top" : "center",
            },
            style,
          ]}
        />
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
  inputCard: {
    borderRadius: 24,
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  input: {
    fontFamily: "IBMPlexSans_500Medium",
    fontSize: 15,
    lineHeight: 22,
  },
});
