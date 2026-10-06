import TcpSocket from "react-native-tcp-socket";
import { probeTcpConnect } from "../telephony/index.ts";
import type { TcpProber } from "./types.ts";

export const socketProber: TcpProber = {
  connect(
    host: string,
    port: number,
    timeoutMs: number,
  ): Promise<number | null> {
    return new Promise((resolve) => {
      const t0 = performance.now();
      let settled = false;

      const finish = (result: number | null) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(result);
      };

      const socket = TcpSocket.createConnection({ host, port }, () => {
        finish(performance.now() - t0);
      });
      socket.setTimeout(timeoutMs);
      socket.on("timeout", () => finish(null));
      socket.on("error", () => finish(null));
    });
  },
};

export const nativeProber: TcpProber = {
  async connect(host, port, timeoutMs) {
    return probeTcpConnect(host, port, timeoutMs);
  },
};
