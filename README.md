# Network QoS Monitor

Analizador y visualizador de calidad de red móvil en tiempo real, con mapeo de cobertura personal.

**Materia:** Desarrollo de Aplicaciones Móviles — 2026 · Licenciatura en Sistemas de Información  
**Consigna:** `CONSIGNAS.md`

## Stack

- React Native 0.86 + [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) (TypeScript, `expo-router`, development build)
- `@react-native-community/netinfo` — estado y tipo de conexión
- (en etapas siguientes) módulo nativo Kotlin/Swift para `TelephonyManager` / `CoreTelephony`, `react-native-tcp-socket`, `react-native-maps`, SQLite y background fetch

> **Nota sobre "no Expo Go puro":** la consigna requiere módulos nativos custom. Se usa Expo con **development builds** (`npx expo run:android` vía prebuild/CNG): es la vía oficial que permite escribir Native Modules (Kotlin/Swift) sin abandonar el tooling de Expo.

## Requisitos

- Node 20+
- Android Studio / Xcode para builds nativos (no hace falta para correr en Expo Go durante la etapa 1)

## Uso

```bash
npm install
npx expo start          # Expo Go o simulator
npx expo run:android    # development build (necesario desde la etapa 2, módulo nativo)
```

Scripts: `npm run lint`, `npm run typecheck`.

## Arquitectura

```
src/
  app/                  Rutas expo-router
    (tabs)/             Navegación principal (Monitor, Mapa, Historia)
  features/             Features por dominio (network, measurements, geo, …)
  components/           Componentes de UI compartidos
  constants/            Tema y tokens de diseño
  hooks/                Hooks transversales
```

Capas del proyecto (alineado con la consigna, §05): Native Bridge → Measurement Engine → Persistence → Geo Layer → Presentation. El store reactivo (Zustand) se incorpora cuando exista motor de medición (etapa 3).

## Estado por etapa

| Etapa | Estado |
|---|---|
| 1. Setup + NetInfo + permisos | ✅ Detecta tipo de red, generación celular, operador/Ssid, calidad de señal |
| 2. Módulo nativo de telefonía (TelephonyManager / CoreTelephony) | 🔲 |
| 3. Motor RTT/jitter sobre TCP + throughput | 🔲 |
| 4. Persistencia y georreferenciación | 🔲 |
| 5. Mapa heatmap + series temporales | 🔲 |
| 6. Background fetch, notificaciones, export | 🔲 |
| 7. Testing, pulido y documentación | 🔲 |