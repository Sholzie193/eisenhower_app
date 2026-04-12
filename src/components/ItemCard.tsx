import { Pressable, StyleSheet, Text, View } from "react-native";
import { QuadrantPill } from "./QuadrantPill";
import { NeuCard } from "./NeuCard";
import { useAppTheme } from "../providers/theme-provider";
import { formatDateTime, getItemSubtitle } from "../utils/format";
import { triggerSelectionHaptic } from "../utils/haptics";
import type { DecisionItem } from "../types/decision";

interface ItemCardProps {
  item: DecisionItem;
  onPress: () => void;
}

export const ItemCard = ({ item, onPress }: ItemCardProps) => {
  const { theme } = useAppTheme();

  return (
    <View>
      <Pressable
        onPress={() => {
          triggerSelectionHaptic();
          onPress();
        }}
        style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.988 : 1 }] }]}
      >
        <NeuCard variant="raised" style={styles.card}>
          <View style={styles.topRow}>
            <QuadrantPill quadrant={item.quadrant} compact />
            <Text style={[styles.time, { color: theme.colors.textSoft }]}>
              {formatDateTime(item.updatedAt)}
            </Text>
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            {getItemSubtitle(item)}
          </Text>
          <View style={styles.bottomRow}>
            <View
              style={[
                styles.scorePill,
                { backgroundColor: theme.colors.surfaceInset, borderColor: theme.colors.stroke },
              ]}
            >
              <Text style={[styles.scoreText, { color: theme.colors.textMuted }]}>
                U {item.urgencyScore.toFixed(1)}
              </Text>
            </View>
            <View
              style={[
                styles.scorePill,
                { backgroundColor: theme.colors.surfaceInset, borderColor: theme.colors.stroke },
              ]}
            >
              <Text style={[styles.scoreText, { color: theme.colors.textMuted }]}>
                I {item.importanceScore.toFixed(1)}
              </Text>
            </View>
            {item.completed ? (
              <View
                style={[
                  styles.completePill,
                  { backgroundColor: theme.colors.accentWash, borderColor: theme.colors.stroke },
                ]}
              >
                <Text style={[styles.completeText, { color: theme.colors.success }]}>Complete</Text>
              </View>
            ) : null}
          </View>
        </NeuCard>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 14,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "IBMPlexSans_500Medium",
  },
  time: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_500Medium",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  scorePill: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 11,
    justifyContent: "center",
    borderWidth: 1,
  },
  scoreText: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  completePill: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 11,
    justifyContent: "center",
    borderWidth: 1,
  },
  completeText: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
});
