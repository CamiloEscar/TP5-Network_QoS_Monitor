import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CartesianChart, Line } from "victory-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { exportHistory } from "@/features/export/export";
import type { NetworkType } from "@/features/network/use-network";
import { queryMeasurements } from "@/features/storage/measurements";
import { listSessions } from "@/features/storage/sessions";
import type {
  HistoryFilter,
  MeasurementRecord,
  SessionSummary,
} from "@/features/storage/types";

const NETWORK_TYPES: NetworkType[] = [
  "unknown",
  "none",
  "cellular",
  "wifi",
  "bluetooth",
  "ethernet",
  "wimax",
  "vpn",
  "other",
];

const NETWORK_TYPE_LABELS: Record<NetworkType, string> = {
  unknown: "Desconocido",
  none: "Sin conexión",
  cellular: "Celular",
  wifi: "Wi-Fi",
  bluetooth: "Bluetooth",
  ethernet: "Ethernet",
  wimax: "WiMAX",
  vpn: "VPN",
  other: "Otra",
};

type DatePreset = "today" | "week" | "all";

function presetFromTs(preset: DatePreset): number | undefined {
  if (preset === "all") return undefined;
  if (preset === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  return Date.now() - 7 * 24 * 60 * 60 * 1000;
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("es-AR");
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <ThemedText
        type="small"
        style={selected ? styles.chipTextSelected : undefined}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function AppButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled && styles.buttonDisabled]}
    >
      <ThemedText type="smallBold" style={styles.buttonText}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

// ponytail: no date-picker dependency installed, so date range is 3 presets instead of a free range.
const PRESET_LABELS: Record<DatePreset, string> = {
  today: "Hoy",
  week: "Última semana",
  all: "Todo",
};

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [selectedTypes, setSelectedTypes] = useState<NetworkType[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [records, setRecords] = useState<MeasurementRecord[]>([]);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    listSessions().then(setSessions);
  }, []);

  useEffect(() => {
    const filter: HistoryFilter = {
      networkTypes: selectedTypes.length ? selectedTypes : undefined,
      fromTs: presetFromTs(datePreset),
      sessionId: selectedSessionId ?? undefined,
    };
    queryMeasurements(filter).then(setRecords);
  }, [selectedTypes, datePreset, selectedSessionId]);

  function toggleType(t: NetworkType) {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  async function handleExport(format: "csv" | "json") {
    const ok = await exportHistory(records, format);
    setExportMessage(ok ? null : "Sin datos para exportar");
  }

  const pingPoints = records
    .filter((r) => r.ping != null)
    .map((r) => ({ ts: r.ts, avgMs: r.ping!.avgMs }));

  const throughputPoints = records
    .filter(
      (r) => r.throughput?.downMbps != null || r.throughput?.upMbps != null,
    )
    .map((r) => ({
      ts: r.ts,
      downMbps: r.throughput?.downMbps ?? 0,
      upMbps: r.throughput?.upMbps ?? 0,
    }));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <>
              <ThemedText type="subtitle">Historial</ThemedText>

              {sessions.length === 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  Todavía no hay sesiones registradas.
                </ThemedText>
              )}

              <ThemedText type="smallBold">Filtrar por tipo de red</ThemedText>
              <View style={styles.chipRow}>
                {NETWORK_TYPES.map((t) => (
                  <Chip
                    key={t}
                    label={NETWORK_TYPE_LABELS[t]}
                    selected={selectedTypes.includes(t)}
                    onPress={() => toggleType(t)}
                  />
                ))}
              </View>

              <ThemedText type="smallBold">Rango de fechas</ThemedText>
              <View style={styles.chipRow}>
                {(Object.keys(PRESET_LABELS) as DatePreset[]).map((p) => (
                  <Chip
                    key={p}
                    label={PRESET_LABELS[p]}
                    selected={datePreset === p}
                    onPress={() => setDatePreset(p)}
                  />
                ))}
              </View>

              <ThemedText type="smallBold">Sesiones</ThemedText>
            </>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                setSelectedSessionId(
                  selectedSessionId === item.id ? null : item.id,
                )
              }
            >
              <ThemedView
                type={
                  selectedSessionId === item.id
                    ? "backgroundSelected"
                    : "backgroundElement"
                }
                style={styles.sessionRow}
              >
                <ThemedText type="smallBold">
                  {formatDateTime(item.startedAt)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.measurementCount} mediciones
                </ThemedText>
              </ThemedView>
            </Pressable>
          )}
          ListFooterComponent={
            <>
              {selectedSessionId && records.length === 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  Sin mediciones para los filtros seleccionados.
                </ThemedText>
              )}

              {selectedSessionId && records.length > 0 && (
                <>
                  <ThemedText type="smallBold">Latencia (ping avg)</ThemedText>
                  {pingPoints.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      Datos insuficientes para graficar
                    </ThemedText>
                  ) : (
                    <View style={styles.chartBox}>
                      <CartesianChart
                        data={pingPoints}
                        xKey="ts"
                        yKeys={["avgMs"]}
                      >
                        {({ points }) => (
                          <Line
                            points={points.avgMs}
                            color="#3C87F7"
                            strokeWidth={2}
                          />
                        )}
                      </CartesianChart>
                    </View>
                  )}

                  <ThemedText type="smallBold">
                    Throughput (down / up)
                  </ThemedText>
                  {throughputPoints.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      Datos insuficientes para graficar
                    </ThemedText>
                  ) : (
                    <View style={styles.chartBox}>
                      <CartesianChart
                        data={throughputPoints}
                        xKey="ts"
                        yKeys={["downMbps", "upMbps"]}
                      >
                        {({ points }) => (
                          <>
                            <Line
                              points={points.downMbps}
                              color="#3C87F7"
                              strokeWidth={2}
                            />
                            <Line
                              points={points.upMbps}
                              color="#F7A93C"
                              strokeWidth={2}
                            />
                          </>
                        )}
                      </CartesianChart>
                    </View>
                  )}
                </>
              )}

              <View style={styles.buttonRow}>
                <AppButton
                  label="Exportar CSV"
                  onPress={() => handleExport("csv")}
                />
                <AppButton
                  label="Exportar JSON"
                  onPress={() => handleExport("json")}
                />
              </View>
              {exportMessage && (
                <ThemedText type="small" themeColor="textSecondary">
                  {exportMessage}
                </ThemedText>
              )}

              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.hint}
              >
                Nota: el filtro por zona geográfica (bbox) no está implementado
                en esta pantalla.
              </ThemedText>
            </>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  chip: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: "rgba(128,128,128,0.15)",
  },
  chipSelected: {
    backgroundColor: "#3C87F7",
  },
  chipTextSelected: {
    color: "#ffffff",
  },
  sessionRow: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    gap: Spacing.half,
  },
  chartBox: {
    height: 200,
    marginBottom: Spacing.three,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  button: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: "rgba(60,135,247,0.12)",
    alignSelf: "flex-start",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: "#3C87F7",
  },
  hint: {
    marginTop: Spacing.two,
  },
});
