import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { qualityOf } from "@/features/network/quality";
import { queryMeasurements } from "@/features/storage/measurements";
import type { MeasurementRecord } from "@/features/storage/types";
import { useSettings } from "@/store";

type MapPoint = {
  lat: number;
  lon: number;
  color: string;
  accurate: boolean;
};

function buildHtml(points: MapPoint[]): string {
  const center = points[0] ?? { lat: 0, lon: 0 };
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="anonymous" />
  <style>html,body,#map{height:100%;margin:0;padding:0;}</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin="anonymous"></script>
  <script>
    const map = L.map('map').setView([${center.lat}, ${center.lon}], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    const points = ${JSON.stringify(points)};
    const bounds = [];
    points.forEach((p) => {
      bounds.push([p.lat, p.lon]);
      if (p.accurate) {
        L.circle([p.lat, p.lon], { radius: 40, color: p.color, fillColor: p.color, fillOpacity: 0.35, weight: 0 }).addTo(map);
      }
      L.circleMarker([p.lat, p.lon], { radius: 6, color: '#1f2937', fillColor: p.color, fillOpacity: 1, weight: 1 }).addTo(map);
    });
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [32, 32] });
  </script>
</body>
</html>`;
}

export default function MapScreen() {
  const settings = useSettings();
  const [records, setRecords] = useState<MeasurementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      queryMeasurements()
        .then(setRecords)
        .finally(() => setLoading(false));
    }, []),
  );

  const points = useMemo<MapPoint[]>(
    () =>
      records
        .filter((r) => r.lat != null && r.lon != null)
        .map((r) => {
          const synthetic = {
            isConnected: true,
            type: r.networkType,
            cellularGeneration: r.cellularGeneration,
            isInternetReachable: true,
            isExpensive: false,
            wifiStrength: null,
          };
          return {
            lat: r.lat!,
            lon: r.lon!,
            color: qualityOf(synthetic).color,
            accurate:
              r.accuracy != null && r.accuracy <= settings.geo.maxAccuracyM,
          };
        }),
    [records, settings.geo.maxAccuracyM],
  );

  const html = useMemo(() => buildHtml(points), [points]);

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
        ) : points.length === 0 ? (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.message}
          >
            {records.length === 0
              ? "Todavía no hay mediciones registradas. Hacé una medición desde Monitor para ver el mapa de cobertura."
              : "Hay mediciones, pero ninguna tiene ubicación. Concedé el permiso de ubicación y hacé una nueva medición para que los puntos aparezcan en el mapa."}
          </ThemedText>
        ) : (
          <>
            <ThemedView style={styles.mapContainer}>
              <WebView
                style={styles.map}
                originWhitelist={["*"]}
                source={{ html }}
              />
            </ThemedView>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.message}
            >
              Vista de cobertura por puntos (OpenStreetMap, sin API key)
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
