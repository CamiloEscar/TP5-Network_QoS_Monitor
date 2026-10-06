# Network QoS Monitor

Analizador y visualizador de calidad de red móvil en tiempo real, con mapeo de cobertura personal.

**Materia:** Desarrollo de Aplicaciones Móviles — 2026 · Licenciatura en Sistemas de Información
**Consigna:** `CONSIGNAS.md`

## Stack

- React Native 0.86.3 + [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) (TypeScript strict, `expo-router`, development build)
- `@react-native-community/netinfo` — estado y tipo de conexión base
- `modules/telephony/` — módulo nativo propio (Expo Modules API, Kotlin/Swift) para `TelephonyManager`/`CoreTelephony`: operador, tipo de red fino, RSSI
- `react-native-tcp-socket` — sondas TCP para RTT/jitter/pérdida (motor propio en `src/features/probes/`)
- Backend de referencia propio (`backend/`, Node/Express) — test de throughput down/up
- `expo-sqlite` (Next API + `kv-store`) — persistencia de mediciones, sesiones y settings
- `expo-location` — georreferenciación de cada medición
- `react-native-maps` — mapa de cobertura (heatmap o fallback por círculos)
- `victory-native` (XL, Skia) — series temporales de latencia y throughput
- `zustand` (vanilla store, sin Provider) — estado reactivo compartido entre UI y tareas en background
- `react-native-background-fetch` + Headless JS — muestreo periódico con la app cerrada/bloqueada
- `@notifee/react-native` — notificaciones locales de degradación severa

> **Nota sobre "no Expo Go puro":** la consigna requiere módulos nativos custom. Se usa Expo con **development builds** (`npx expo run:android` vía prebuild/CNG): es la vía oficial que permite escribir Native Modules (Kotlin/Swift) sin abandonar el tooling de Expo.

## Requisitos

- Node 20+ (desarrollado y verificado con Node 22)
- Android Studio (SDK + emulador o dispositivo físico) para el build nativo — **requerido desde la Etapa 2** (módulo nativo de telefonía)
- Xcode/macOS para iOS — **no disponible en este desarrollo** (host Windows); ver [Limitaciones conocidas](#limitaciones-conocidas)

## Uso

```bash
npm install
npx expo prebuild        # genera android/ (gitignored) a partir de app.json + modules/
npx expo run:android     # development build con el módulo nativo
```

Scripts: `npm run lint`, `npm run typecheck`, `node --test src/features/probes/aggregate.test.ts`.

Backend de referencia (requerido para el test de throughput): ver `backend/README.md` — correr local (`npm start`), con Docker/compose, o desplegado (Fly.io/Render) para el video demo. Configurable desde la app en Monitor → Configuración → URL del backend (default `http://10.0.2.2:8080`, válido para el emulador Android).

## Arquitectura

```
src/
  app/
    _layout.tsx           Registro de BackgroundFetch (headless + foreground) y canal de notificaciones
    (tabs)/                Monitor, Mapa, Historia
  features/
    network/               NetInfo + fusión con telefonía nativa (use-network.ts), qualityOf (quality.ts)
    telephony/              Wrapper tipado del módulo nativo, degrada a null sin permiso/plataforma
    probes/                 Motor RTT/jitter/loss sobre TCP sockets (socketProber) + fallback nativo (nativeProber)
    throughput/              Motor de descarga/subida, Mbps corregido por bytes reales
    session/                 Ciclo de sesión + runMeasurement (orquestador: red+RTT+throughput+geo+persistencia)
    storage/                  expo-sqlite (schema+migraciones+índices) + repositorios + settings (kv-store)
    geo/                      Permisos, fix GPS con gate de accuracy, preparación de datos de heatmap
    background/                Tarea headless (muestreo reducido sin throughput) + notificaciones de degradación
    export/                    CSV/JSON vía share sheet nativo (RN Share)
  store/                        Zustand vanilla — mismo store para la UI y para la tarea headless
  components/, constants/, hooks/   UI compartida
modules/telephony/              Módulo nativo Expo Modules API (Kotlin/Swift) — RSSI, operador, probeTcpConnect
backend/                        Servicio Express de referencia para el test de throughput
```

Capas (alineado con la consigna §05): **Native Bridge** (`modules/telephony/`, `features/telephony/`, `features/network/`) → **Measurement Engine** (`features/probes/`, `features/throughput/`, `features/session/`) → **Persistence** (`features/storage/`) → **Geo Layer** (`features/geo/`) → **Presentation** (`app/(tabs)/`) → **Background** (`features/background/`). El store Zustand vanilla es el punto de encuentro: se usa igual desde componentes React (`useStore`) y desde la tarea Headless JS (`store.getState()`), sin necesidad de Provider ni de React para funcionar.

**No bloqueo del hilo de JS**: las sondas TCP y la transferencia de throughput corren en el runtime nativo (socket/fetch); JS solo recibe eventos/promesas. Los delays entre sondas usan `setTimeout` (yield del event loop). Cancelación vía `CancellationToken` chequeado entre etapas, que destruye sockets/aborta fetches in-flight.

## Estado por etapa

| Etapa                                   | Contenido                                                                                       | Estado                                                 |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1. Setup + NetInfo + permisos           | Detección de red, generación celular, operador/SSID (NetInfo)                                   | ✅                                                     |
| 2. Fundación nativa                     | Dev build, scaffold `modules/telephony/`, permisos/plugins en `app.json`                        | ✅                                                     |
| 3. Persistencia + geo + store + backend | SQLite+migraciones, geo layer, Zustand vanilla, backend Express+Docker                          | ✅                                                     |
| 4. Motores de medición                  | RTT/jitter/loss (TCP), throughput down/up, orquestador `runMeasurement`, wiring del store       | ✅                                                     |
| 5. Módulo nativo de telefonía           | `TelephonyModule` Kotlin/Swift real (carrier, tipo fino, RSSI), fusión en `NetworkSnapshot`     | ✅ (código no verificado en device — ver limitaciones) |
| 6. Visualización                        | Monitor (controles+resultados), Mapa (heatmap/fallback), Historia (lista+charts+filtros+export) | ✅                                                     |
| 7. Background + notificaciones          | `react-native-background-fetch` + Headless + `@notifee/react-native`                            | ✅                                                     |
| 8. Documentación + checklist final      | Este README, lint+typecheck en verde, checklist RF-01..09                                       | ✅                                                     |

`npm run lint` y `npx tsc --noEmit` están en verde al cierre de esta entrega. Tests unitarios: `src/features/probes/aggregate.test.ts` (2/2, jitter RFC 3550) y `backend/server.test.js` (5/5).

## Checklist de requisitos funcionales (CONSIGNAS.md §03)

| ID    | Requisito                                                      | Estado                     | Nota                                                                                                                                                                                                                                                                                                                                        |
| ----- | -------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-01 | Tipo de red activa + operador                                  | ✅                         | NetInfo (baseline, siempre funciona) fusionado con el módulo nativo (RSSI, tipo fino). Degrada a NetInfo-only sin permiso o en plataformas no soportadas.                                                                                                                                                                                   |
| RF-02 | RTT min/avg/max/jitter contra ≥3 hosts                         | ✅                         | `src/features/probes/` sobre `react-native-tcp-socket`; fallback nativo (`probeTcpConnect`) con el mismo contrato. Jitter RFC 3550, loss = fallidos/total.                                                                                                                                                                                  |
| RF-03 | Test de throughput down/up en Mbps                             | ✅                         | `src/features/throughput/` contra el backend de referencia; Mbps = bytes reales × 8 / segundos reales (no el tamaño nominal).                                                                                                                                                                                                               |
| RF-04 | Timestamp + GPS por medición                                   | ✅                         | `runMeasurement` persiste cada corrida con fix GPS (o null sin permiso/timeout) sin bloquear la medición.                                                                                                                                                                                                                                   |
| RF-05 | Mapa con heatmap de cobertura                                  | ✅ (fallback activo)       | `react-native-maps` `Heatmap` requiere API key de Google Maps con billing — **no configurada en este proyecto** → fallback automático a `Circle` (color por calidad) + `Marker` por medición. RF-05 se cumple funcionalmente con el fallback.                                                                                               |
| RF-06 | Series temporales de latencia/throughput                       | ✅                         | `victory-native` XL (Skia) en Historia, por sesión seleccionada.                                                                                                                                                                                                                                                                            |
| RF-07 | Muestreo periódico en background + notificación de degradación | ✅                         | `react-native-background-fetch` (Headless JS en Android) corre un muestreo reducido (sin throughput) y notifica si RTT/pérdida superan el umbral, rate-limited a 1/30min. iOS: scheduling gobernado por el OS, sin garantía con la app terminada.                                                                                           |
| RF-08 | Exportar historial a CSV/JSON                                  | ✅ (vía share, no archivo) | `Share.share` nativo con el contenido CSV/JSON como texto — sin `expo-sharing`/`expo-file-system` como dependencia nueva. No genera un archivo descargable en disco, comparte el contenido directamente.                                                                                                                                    |
| RF-09 | Filtrar por tipo de red, fechas y zona geográfica              | ⚠️ parcial                 | Tipo de red: ✅ (chips multi-selección). Fechas: ✅ pero como 3 presets (Hoy / Última semana / Todo), no un date-picker libre (sin esa dependencia instalada). Zona geográfica (bbox): el query layer (`queryMeasurements`) ya soporta `bbox`, pero la UI de Historia **no expone** un selector de zona — gap documentado, no implementado. |

## Desviaciones declaradas respecto al stack sugerido (§07)

| #   | Desviación                                                                         | Justificación                                                                                                                                                                                      |
| --- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `expo-sqlite` (Next API + `kv-store`) en vez de `react-native-sqlite-storage`      | Librería sugerida sin mantenimiento activo; expo-sqlite es first-class en SDK 57, tipado, con migraciones.                                                                                         |
| 2   | `expo-location` en vez de `react-native-geolocation-service`                       | Config plugin CNG + soporte de permisos background nativo del ecosistema Expo; mismo rol en la arquitectura.                                                                                       |
| 3   | `victory-native` XL (Skia)                                                         | Confirmado funcionando contra las dependencias ya instaladas (`@shopify/react-native-skia`, `react-native-reanimated` 4.5.1); `react-native-svg-charts` está abandonado.                           |
| 4   | Zustand 5 vanilla en vez de Redux Toolkit/Context                                  | Usable fuera de React (`store.getState()` desde la tarea Headless JS), selectors finos, sin Provider.                                                                                              |
| 5   | Expo Modules API local (`create-expo-module --local`) en vez de TurboModule "bare" | Compatible con prebuild/CNG; el código Kotlin/Swift sigue siendo propio (cumple "módulo nativo propio" de la consigna).                                                                            |
| 6   | RTT = TCP connect-timing (no ICMP)                                                 | React Native no permite sockets ICMP crudos; la consigna pide explícitamente sondas TCP/UDP propias. Fallback nativo con el mismo contrato si `react-native-tcp-socket` falla en New Architecture. |
| 7   | Heatmap `PROVIDER_GOOGLE` + fallback `Circle`/`Marker`                             | `Heatmap` de `react-native-maps` es exclusivo de Google Maps y requiere API key con billing; sin key, se degrada automáticamente sin romper RF-05.                                                 |
| 8   | `@notifee/react-native` agregado durante la Etapa 7                                | Estaba en el stack sugerido de la consigna pero no en el `package.json` inicial del scaffold; se instaló al implementar las notificaciones de degradación (RF-07).                                 |
| 9   | Export vía `Share.share` (texto) en vez de `expo-file-system` + `expo-sharing`     | Evita sumar una dependencia nueva (`expo-sharing` no estaba instalada); el share sheet nativo de RN ya resuelve "compartir el historial" sin guardar un archivo intermedio.                        |
| 10  | Filtro de fechas por presets en vez de date-picker                                 | `@react-native-community/datetimepicker` no está instalado; 3 presets (Hoy/Última semana/Todo) cubren el caso de uso sin sumar dependencia.                                                        |

## Limitaciones conocidas

- **Módulo nativo de telefonía sin verificar en dispositivo real.** El código Kotlin/Swift (`modules/telephony/`) se escribió contra la Expo Modules API documentada para SDK 57, pero este desarrollo corrió en Windows sin build Android ejecutado (regla del proyecto: no buildear durante el desarrollo asistido). **Pendiente antes de grabar el demo**: correr `npx expo run:android` una vez y confirmar que `getTelephonyInfo()`/`probeTcpConnect()` no crashean.
- **Listener en vivo (`onTelephonyChange`) declarado pero no conectado.** Tanto en Android (`TelephonyCallback`/`PhoneStateListener`) como en iOS (notifiers de `CTTelephonyNetworkInfo`) el evento está declarado en el módulo pero sin wiring del listener real — se optó por _polling_ cada 10s desde `useNetwork()` en su lugar, que sí funciona sin esa pieza.
- **iOS no expone RSSI.** `CoreTelephony` no tiene API pública para fuerza de señal — `rssiDbm` siempre `null` en iOS (la consigna dice "cuando esté disponible").
- **iOS en background es más restrictivo.** Sin garantía de ejecución con la app terminada y sin control fino del intervalo (lo decide el OS) — Android con Headless JS cumple el muestreo pleno.
- **Build iOS no disponible en este desarrollo.** Host Windows sin Xcode/macOS — requiere EAS Build remoto o una Mac para generar el IPA.
- **`react-native-tcp-socket` en New Architecture** tiene un veredicto provisional (`socketProber`) por un issue abierto en la librería (compatibilidad del interop layer con RN 0.86); el fallback `nativeProber` (vía el módulo propio) está implementado con el mismo contrato `TcpProber` pero tampoco verificado en device.
- **Heatmap real inactivo.** Sin API key de Google Maps con billing configurada, el mapa usa el fallback de círculos — funcionalmente cumple RF-05 pero no es el heatmap visual "ideal" de la consigna.
- **RF-09 zona geográfica**: sin UI de selección de bbox en Historia (el query layer ya lo soporta).
- **Export sin archivo en disco**: `Share.share` comparte el contenido como texto; no hay un artefacto `.csv`/`.json` persistido en el dispositivo, solo lo que la app de destino del share haga con el texto recibido.
- **Degradación en background nunca evalúa throughput** (por costo de batería/datos) — solo RTT promedio y pérdida de paquetes.

## Entregables

- ✅ Código fuente con historial de commits por etapa (ver `git log`).
- ✅ Backend de referencia con instrucciones de despliegue (`backend/README.md`).
- ✅ Este documento técnico (arquitectura, desviaciones, limitaciones).
- ⬜ **Build APK/dev client accesible** — pendiente: correr `npx expo run:android` en un equipo con Android SDK y generar el APK de prueba.
- ⬜ **Video demo (3-5 min)** — pendiente de grabar sobre un dispositivo físico con ≥2 sesiones de datos reales, mostrando: detección de red+operador, medición de latencia/throughput, mapa de cobertura con las sesiones registradas.
