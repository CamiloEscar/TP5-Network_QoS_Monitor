import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { generationLabel, qualityOf } from "@/features/network/quality";
import {
  useNetwork,
  type NetworkSnapshot,
} from "@/features/network/use-network";
import {
  store,
  useActiveSession,
  useLastMeasurement,
  useRun,
  useSettings,
} from "@/store";

const TYPE_LABELS: Record<NetworkSnapshot["type"], string> = {
  none: "Sin conexión",
  unknown: "Detectando…",
  wifi: "Wi-Fi",
  cellular: "Red celular",
  ethernet: "Ethernet",
  bluetooth: "Bluetooth",
  wimax: "WiMAX",
  vpn: "VPN",
  other: "Otra",
};

function mainLabel(snapshot: NetworkSnapshot): string {
  if (snapshot.type === "cellular")
    return generationLabel(snapshot.cellularGeneration) ?? "Red celular";
  return TYPE_LABELS[snapshot.type];
}

const RUN_STATUS_LABELS: Record<string, string> = {
  probing: "Sondeando…",
  throughput: "Midiendo throughput…",
  persisting: "Guardando…",
};

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

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value ?? "—"}</ThemedText>
    </View>
  );
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("es-AR");
}

export default function MonitorScreen() {
  const network = useNetwork();
  const session = useActiveSession();
  const run = useRun();
  const lastMeasurement = useLastMeasurement();
  const settings = useSettings();
  const [baseUrlInput, setBaseUrlInput] = useState(settings.throughput.baseUrl);
  const quality = qualityOf(network);
  const details =
    network.type === "wifi"
      ? [
          { label: "Red", value: "Wi-Fi" },
          { label: "SSID", value: network.ssid },
          {
            label: "Fuerza",
            value:
              network.wifiStrength != null ? `${network.wifiStrength}%` : null,
          },
          {
            label: "Velocidad de enlace",
            value:
              network.linkSpeed != null ? `${network.linkSpeed} Mbps` : null,
          },
          { label: "Dirección IP", value: network.ipAddress },
        ]
      : network.type === "cellular"
        ? [
            { label: "Operador", value: network.carrier },
            {
              label: "Generación",
              value: generationLabel(network.cellularGeneration),
            },
            {
              label: "Datos móviles",
              value: network.isExpensive ? "Conexión costosa" : "Normal",
            },
          ]
        : [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="subtitle">Monitor</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Calidad de conexión en tiempo real
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.headerRow}>
              <View style={styles.statusIcon}>
                <Ionicons name="cellular" size={48} color={quality.color} />
              </View>
              <View style={styles.headerText}>
                <ThemedText type="title" style={styles.typeLabel}>
                  {mainLabel(network)}
                </ThemedText>
                <View
                  style={[styles.badge, { backgroundColor: quality.color }]}
                >
                  <ThemedText type="smallBold" style={styles.badgeText}>
                    {quality.label}
                  </ThemedText>
                </View>
              </View>
            </View>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <InfoRow
              label="Estado"
              value={network.isConnected ? "Conectado" : "Desconectado"}
            />
            <View style={styles.divider} />
            <InfoRow
              label="Internet"
              value={network.isInternetReachable ? "Alcanzable" : "Sin acceso"}
            />
            <View style={styles.divider} />
            <InfoRow
              label="Tipo de conexión"
              value={`${TYPE_LABELS[network.type]}${network.type === "wifi" ? "" : network.cellularGeneration ? ` (${generationLabel(network.cellularGeneration)})` : ""}`}
            />
            {details.map((d) => (
              <View key={d.label}>
                <View style={styles.divider} />
                <InfoRow label={d.label} value={d.value} />
              </View>
            ))}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Sesión</ThemedText>
            {session.activeId ? (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  Sesión activa desde{" "}
                  {session.startedAt ? formatDateTime(session.startedAt) : "—"}
                </ThemedText>
                <AppButton
                  label="Finalizar sesión"
                  onPress={() => store.getState().endSession()}
                />
              </>
            ) : (
              <AppButton
                label="Iniciar sesión"
                onPress={() => store.getState().startSession()}
              />
            )}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Medición</ThemedText>
            <View style={styles.buttonRow}>
              <AppButton
                label="Medir ahora"
                disabled={run.status !== "idle"}
                onPress={() =>
                  store.getState().startMeasurement({ throughput: true })
                }
              />
              <AppButton
                label="Medición rápida"
                disabled={run.status !== "idle"}
                onPress={() =>
                  store.getState().startMeasurement({ quick: true })
                }
              />
              {run.status !== "idle" && (
                <AppButton
                  label="Cancelar"
                  onPress={() => store.getState().cancelMeasurement()}
                />
              )}
            </View>
            {run.status !== "idle" && (
              <ThemedText type="small" themeColor="textSecondary">
                {run.status === "error"
                  ? `Error: ${run.error}`
                  : RUN_STATUS_LABELS[run.status]}
              </ThemedText>
            )}
          </ThemedView>

          {lastMeasurement && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">
                Resultado de la última medición
              </ThemedText>
              <View style={styles.divider} />
              <InfoRow
                label="Tipo de red"
                value={TYPE_LABELS[lastMeasurement.networkType]}
              />
              <InfoRow label="Operador" value={lastMeasurement.carrier} />
              <InfoRow
                label="RSSI"
                value={
                  lastMeasurement.rssiDbm != null
                    ? `${lastMeasurement.rssiDbm} dBm`
                    : null
                }
              />

              <View style={styles.divider} />
              <ThemedText type="small" themeColor="textSecondary">
                Latencia
              </ThemedText>
              {lastMeasurement.ping ? (
                lastMeasurement.ping.hosts.map((h) => (
                  <View key={`${h.host}:${h.port}`}>
                    <InfoRow
                      label={`${h.host}:${h.port}`}
                      value={`min ${h.minMs.toFixed(0)} / avg ${h.avgMs.toFixed(0)} / max ${h.maxMs.toFixed(0)} ms, jitter ${h.jitterMs.toFixed(0)} ms, loss ${h.loss.toFixed(0)}%`}
                    />
                  </View>
                ))
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Sin datos de latencia
                </ThemedText>
              )}

              <View style={styles.divider} />
              <ThemedText type="small" themeColor="textSecondary">
                Throughput
              </ThemedText>
              {lastMeasurement.throughput ? (
                <>
                  <InfoRow
                    label="Bajada"
                    value={
                      lastMeasurement.throughput.downMbps != null
                        ? `${lastMeasurement.throughput.downMbps.toFixed(2)} Mbps`
                        : "—"
                    }
                  />
                  <InfoRow
                    label="Subida"
                    value={
                      lastMeasurement.throughput.upMbps != null
                        ? `${lastMeasurement.throughput.upMbps.toFixed(2)} Mbps`
                        : "—"
                    }
                  />
                </>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  No disponible (quick o backend caído)
                </ThemedText>
              )}
            </ThemedView>
          )}

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Configuración</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Hosts de prueba:
            </ThemedText>
            {settings.probe.hosts.map((h) => (
              <ThemedText key={`${h.host}:${h.port}`} type="small">
                {h.host}:{h.port}
              </ThemedText>
            ))}
            <ThemedText type="small" themeColor="textSecondary">
              mínimo 3 hosts recomendado
            </ThemedText>
            {/* TODO futura iteración: edición de la lista de hosts (host:port) */}
            {settings.probe.hosts.length < 3 && (
              <ThemedText type="smallBold" style={{ color: "#EF4444" }}>
                Advertencia: menos de 3 hosts configurados
              </ThemedText>
            )}

            <View style={styles.divider} />
            <ThemedText type="small" themeColor="textSecondary">
              URL base de throughput
            </ThemedText>
            <TextInput
              value={baseUrlInput}
              onChangeText={setBaseUrlInput}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <AppButton
              label="Guardar"
              onPress={() =>
                store.getState().updateSettings({
                  throughput: { baseUrl: baseUrlInput },
                })
              }
            />
          </ThemedView>

          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.hint}
          >
            Las mediciones RTT, throughput y cobertura se incorporan en las
            próximas etapas.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  statusIcon: {
    width: 72,
    height: 72,
    borderRadius: Spacing.four,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(60,135,247,0.12)",
  },
  headerText: {
    flex: 1,
    gap: Spacing.two,
  },
  typeLabel: {
    fontSize: 32,
    lineHeight: 36,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.half,
  },
  badgeText: {
    color: "#ffffff",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.two,
    gap: Spacing.three,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(128,128,128,0.3)",
  },
  hint: {
    textAlign: "center",
    marginTop: Spacing.two,
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
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(128,128,128,0.4)",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
