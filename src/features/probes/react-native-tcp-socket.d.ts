// Minimal ambient types for react-native-tcp-socket (^6.4.3).
// ponytail: package has no bundled .d.ts and isn't installed in this
// workspace yet (declared in package.json, not run through npm install per
// task constraints) — only the slice of the API this module actually calls.
declare module "react-native-tcp-socket" {
  export type TcpSocketConnectOptions = {
    host: string;
    port: number;
  };

  export class TcpSocket {
    setTimeout(timeoutMs: number): void;
    destroy(): void;
    on(event: "connect", listener: () => void): this;
    on(event: "timeout", listener: () => void): this;
    on(event: "error", listener: (error: unknown) => void): this;
  }

  const TcpSocketDefault: {
    createConnection(
      options: TcpSocketConnectOptions,
      callback?: () => void,
    ): TcpSocket;
  };

  export default TcpSocketDefault;
}
