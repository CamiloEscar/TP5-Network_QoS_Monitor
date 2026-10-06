import Constants from "expo-constants";
import { Fragment, useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import MapView, {
  Circle,
  Heatmap,
  Marker,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { toHeatPoints } from "@/features/geo/heatmap";
import { qualityOf } from "@/features/network/quality";
import { queryMeasurements } from "@/features/storage/measurements";
import type { MeasurementRecord } from "@/features/storage/types";
import { useSettings } from "@/store";

const hasGoogleKey = Boolean(
  Constants.expoConfig?.android?.config?.googleMaps?.apiKey,
);

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function regionFromRecords(records: MeasurementRecord[]) {
  const points = records.filter((r) => r.lat != null && r.lon != null);
  if (points.length === 0) return null;

  if (points.length === 1) {
    return {
      latitude: points[0].lat!,
      longitude: points[0].lon!,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  }

  const lats = points.map((p) => p.lat!);
  const lons = points.map((p) => p.lon!);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const pad = 0.01;

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: maxLat - minLat + pad * 2,
    longitudeDelta: maxLon - minLon + pad * 2,
  };
}

export default function MapScreen() {
  const settings = useSettings();
  const [records, setRecords] = useState<MeasurementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    queryMeasurements()
      .then(setRecords)
      .finally(() => setLoading(false));
  }, []);

  const heatPoints = useMemo(
    () => toHeatPoints(records, settings.geo.maxAccuracyM),
    [records, settings.geo.maxAccuracyM],
  );

  const pointRecords = useMemo(
    () => records.filter((r) => r.lat != null && r.lon != null),
    [records],
  );

  const region = useMemo(() => regionFromRecords(records), [records]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle" style={styles.title}>
          Mapa de cobertura
        </ThemedText>

        {loading ? (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.message}
          >
            Cargando mediciones...
          </ThemedText>
        ) : records.length === 0 || !region ? (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.message}
          >
            Todavía no hay mediciones registradas. Hacé una medición desde
            Monitor para ver el mapa de cobertura.
          </ThemedText>
        ) : (
          <>
            <ThemedView style={styles.mapContainer}>
              <MapView
                style={styles.map}
                provider={hasGoogleKey ? PROVIDER_GOOGLE : undefined}
                initialRegion={region}
              >
                {hasGoogleKey ? (
                  <Heatmap points={heatPoints} radius={40} opacity={0.7} />
                ) : (
                  <>
                    {pointRecords.map((record) => {
                      const synthetic = {
                        isConnected: true,
                        type: record.networkType,
                        cellularGeneration: record.cellularGeneration,
                        isInternetReachable: true,
                        isExpensive: false,
                        wifiStrength: null,
                      };
                      const accurate =
                        record.accuracy != null &&
                        record.accuracy <= settings.geo.maxAccuracyM;
                      return (
                        <Fragment key={record.id}>
                          {accurate && (
                            <Circle
                              center={{
                                latitude: record.lat!,
                                longitude: record.lon!,
                              }}
                              radius={40}
                              fillColor={hexToRgba(
                                qualityOf(synthetic).color,
                                0.35,
                              )}
                              strokeWidth={0}
                            />
                          )}
                          <Marker
                            coordinate={{
                              latitude: record.lat!,
                              longitude: record.lon!,
                            }}
                          />
                        </Fragment>
                      );
                    })}
                  </>
                )}
              </MapView>
            </ThemedView>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.message}
            >
              {hasGoogleKey
                ? "Mapa de calor de cobertura (Google Maps)"
                : "Vista de cobertura por puntos (sin API key de Google Maps configurada — fallback de círculos)"}
            </ThemedText>
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, gap: Spacing.three },
  title: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  message: { paddingHorizontal: Spacing.four },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
});
