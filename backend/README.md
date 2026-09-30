# Backend de referencia — TP5 Network QoS Monitor

Servicio HTTP mínimo (Node 20+ / Express) usado por la app para medir
**throughput real** (download/upload) y como sanity check del camino HTTP
(`/ping`). Sin base de datos, sin estado: cada request se mide contra este
servicio desde el dispositivo.

## Contratos de los endpoints

| Método | Ruta               | Respuesta                                                                                                                                                                                                                                 |
| ------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/health`          | `{ status: "ok", ok: true, uptime: <segundos>, version: <string>, ts: <ms epoch> }`                                                                                                                                                       |
| `GET`  | `/ping`            | `{ ts: <ms epoch> }` (respuesta mínima para RTT/sanity)                                                                                                                                                                                   |
| `GET`  | `/download/:bytes` | Stream de **exactamente** `:bytes` bytes aleatorios (incompresibles). `Content-Type: application/octet-stream`, `Content-Length` exacto, `Cache-Control: no-store`. Cap: 100 MiB.                                                         |
| `POST` | `/upload`          | Cuenta el body crudo sin bufferizarlo. `200` → `{ received: <bytes>, receivedBytes: <bytes> }` (mismo valor, dos alias). Cap: 100 MiB → `413`. `?echo=1` devuelve los bytes crudos (chunked) y el conteo en el header `X-Received-Bytes`. |

Errores: `:bytes` inválido (no numérico, `0`, negativo, no entero o > 100 MiB) →
`400 { error }`. Ruta desconocida → `404 { error }`.

Cualquier origen puede llamarla (CORS `*`), pensada para el dev client.

## Correr en local

```bash
cd backend
npm install
npm start          # http://localhost:3000
```

Variables de entorno: `PORT` (default `3000`), `HOST` (default `0.0.0.0`).

Smoke tests (runner nativo de Node, sin frameworks):

```bash
npm test           # node --test
```

Cubre: `/health` ok, `/download/1024` exactamente 1024 bytes, `/upload` con el
conteo correcto y `400` ante `:bytes` inválidos.

## Correr con Docker

```bash
cd backend
docker build -t tp5-qos-backend .
docker run --rm -p 3000:3000 tp5-qos-backend
# o publicarlo en 8080: docker run --rm -p 8080:3000 tp5-qos-backend
```

El `Dockerfile` corre como usuario no-root (`node`), expone `3000` y tiene
`HEALTHCHECK` contra `/health` (útil para orquestadores y para el doc de deploy).

## Correr con docker compose

```bash
cd backend
docker compose up --build
# queda publicado en http://localhost:8080 → contenedor :3000
```

## Exponerlo para probar desde un dispositivo físico (LAN)

El servidor bindea `0.0.0.0`, así que alcanza con la IP de la máquina que lo
corre:

1. **Servidor local (sin Docker)**: `npm start` y averiguá tu IP LAN
   (`ipconfig` en Windows → adaptador Wi-Fi/Ethernet, p. ej. `192.168.1.50`).
   En el celular (misma red Wi-Fi) configurá `throughput.baseUrl` apuntando a
   `http://192.168.1.50:3000`.
2. **Firewall de Windows**: permití el puerto (3000 o el que uses) para redes
   privadas, si no el dispositivo no ve el servicio.
3. **Emulador Android**: el host no es `localhost` sino `10.0.2.2`, o sea
   `http://10.0.2.2:3000` (o `:8080` si usaste compose).
4. **iOS Simulator** en la misma máquina: `http://localhost:3000` funciona
   directo.

## Deploy en la nube (para el demo)

Cualquier host que sirva un contenedor o un proceso Node alcanza. Opciones
probadas en la consigna:

- **Fly.io**: `fly launch` dentro de `backend/` (detecta el `Dockerfile`),
  `fly deploy`; la app queda en `https://<app>.fly.dev`. Ajustá
  `internal_port = 3000` en `fly.toml`.
- **Render**: _New → Web Service_ → repo, runtime Docker (o Node 20+, start
  command `npm start`). El puerto lo inyecta la plataforma vía `PORT`, que este
  servicio ya respeta.
- Para el video demo: corré la app contra la URL pública y verificá que las
  cargas de 1/5/10 MiB bajen y suban sin timeout.

## Notas de implementación

- El payload de `/download` se genera por chunks de 64 KiB con
  `crypto.randomBytes` y se streamea con backpressure
  (`Readable.from` + `pipeline`) — nunca se arma el body completo en memoria.
- `/upload` cuenta bytes sobre el stream entrante, no bufferiza
  (no usa `express.raw`), así acepta bodies grandes con memoria constante.
- Sin middleware de compresión: el throughput medido debe ser el del enlace.
