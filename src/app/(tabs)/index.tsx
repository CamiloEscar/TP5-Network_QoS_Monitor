import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useNetwork, type NetworkSnapshot } from '@/features/network/use-network';

const TYPE_LABELS: Record<NetworkSnapshot['type'], string> = {
  none: 'Sin conexión',
  unknown: 'Detectando…',
  wifi: 'Wi-Fi',
  cellular: 'Red celular',
  ethernet: 'Ethernet',
  bluetooth: 'Bluetooth',
  wimax: 'WiMAX',
  vpn: 'VPN',
  other: 'Otra',
};

function generationLabel(gen?: NetworkSnapshot['cellularGeneration']): string | null {
  switch (gen) {
    case '5g':
      return '5G NR';
    case '4g':
      return '4G LTE';
    case '3g':
      return '3G';
    case '2g':
      return '2G';
    default:
      return null;
  }
}

function mainLabel(snapshot: NetworkSnapshot): string {
  if (snapshot.type === 'cellular') return generationLabel(snapshot.cellularGeneration) ?? 'Red celular';
  return TYPE_LABELS[snapshot.type];
}

function qualityOf(snapshot: NetworkSnapshot): { label: string; color: string } {
  if (!snapshot.isConnected) return { label: 'Sin servicio', color: '#EF4444' };

  if (snapshot.type === 'wifi') {
    const strength = snapshot.wifiStrength ?? 0;
    if (strength >= 70) return { label: 'Óptima', color: '#22C55E' };
    if (strength >= 40) return { label: 'Buena', color: '#84CC16' };
    if (strength >= 20) return { label: 'Regular', color: '#F59E0B' };
    return { label: 'Débil', color: '#EF4444' };
  }

  if (snapshot.type === 'cellular') {
    switch (snapshot.cellularGeneration) {
      case '5g':
        return { label: 'Óptima', color: '#22C55E' };
      case '4g':
        return { label: 'Buena', color: '#84CC16' };
      case '3g':
        return { label: 'Regular', color: '#F59E0B' };
      case '2g':
        return { label: 'Débil', color: '#EF4444' };
    }
  }

  return { label: 'Conectado', color: '#22C55E' };
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value ?? '—'}</ThemedText>
    </View>
  );
}

export default function MonitorScreen() {
  const network = useNetwork();
  const quality = qualityOf(network);
  const details =
    network.type === 'wifi'
      ? [
          { label: 'Red', value: 'Wi-Fi' },
          { label: 'SSID', value: network.ssid },
          { label: 'Fuerza', value: network.wifiStrength != null ? `${network.wifiStrength}%` : null },
          { label: 'Velocidad de enlace', value: network.linkSpeed != null ? `${network.linkSpeed} Mbps` : null },
          { label: 'Dirección IP', value: network.ipAddress },
        ]
      : network.type === 'cellular'
        ? [
            { label: 'Operador', value: network.carrier },
            { label: 'Generación', value: generationLabel(network.cellularGeneration) },
            { label: 'Datos móviles', value: network.isExpensive ? 'Conexión costosa' : 'Normal' },
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
                <View style={[styles.badge, { backgroundColor: quality.color }]}>
                  <ThemedText type="smallBold" style={styles.badgeText}>
                    {quality.label}
                  </ThemedText>
                </View>
              </View>
            </View>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <InfoRow label="Estado" value={network.isConnected ? 'Conectado' : 'Desconectado'} />
            <View style={styles.divider} />
            <InfoRow label="Internet" value={network.isInternetReachable ? 'Alcanzable' : 'Sin acceso'} />
            <View style={styles.divider} />
            <InfoRow
              label="Tipo de conexión"
              value={`${TYPE_LABELS[network.type]}${network.type === 'wifi' ? '' : network.cellularGeneration ? ` (${generationLabel(network.cellularGeneration)})` : ''}`}
            />
            {details.map((d) => (
              <View key={d.label}>
                <View style={styles.divider} />
                <InfoRow label={d.label} value={d.value} />
              </View>
            ))}
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            Las mediciones RTT, throughput y cobertura se incorporan en las próximas etapas.
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  statusIcon: {
    width: 72,
    height: 72,
    borderRadius: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(60,135,247,0.12)',
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
    alignSelf: 'flex-start',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.half,
  },
  badgeText: {
    color: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    gap: Spacing.three,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(128,128,128,0.3)',
  },
  hint: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
});