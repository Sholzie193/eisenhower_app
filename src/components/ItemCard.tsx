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
            <View style={[styles.scorePill, { backgroundColor: theme.colors.surfaceInset }]}>
              <Text style={[styles.scoreText, { color: theme.colors.textMuted }]}>
                U {item.urgencyScore.toFixed(1)}
              </Text>
            </View>
            <View style={[styles.scorePill, { backgroundColor: theme.colors.surfaceInset }]}>
              <Text style={[styles.scoreText, { color: theme.colors.textMuted }]}>
                I {item.importanceScore.toFixed(1)}
              </Text>
            </View>
            {item.completed ? (
              <View style={[styles.completePill, { backgroundColor: theme.colors.accentWash }]}>
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
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  subtitle: {
    fontSize: 13,
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
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  scoreText: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  completePill: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  completeText: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
});
