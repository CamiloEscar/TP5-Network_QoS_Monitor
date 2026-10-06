import TelephonyModuleDefault from "./TelephonyModule";
import type { TelephonyInfo } from "./Telephony.types";

export { default } from "./TelephonyModule";
export * from "./Telephony.types";

export function addOnTelephonyChangeListener(
  cb: (info: TelephonyInfo) => void,
): () => void {
  const sub = TelephonyModuleDefault.addListener("onTelephonyChange", (e) =>
    cb(e.info),
  );
  return () => sub.remove();
}
