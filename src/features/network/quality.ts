import type { NetworkSnapshot } from "@/features/network/use-network";

export function generationLabel(
  gen?: NetworkSnapshot["cellularGeneration"],
): string | null {
  switch (gen) {
    case "5g":
      return "5G NR";
    case "4g":
      return "4G LTE";
    case "3g":
      return "3G";
    case "2g":
      return "2G";
    default:
      return null;
  }
}

export function qualityOf(snapshot: NetworkSnapshot): {
  label: string;
  color: string;
} {
  if (!snapshot.isConnected) return { label: "Sin servicio", color: "#EF4444" };

  if (snapshot.type === "wifi") {
    const strength = snapshot.wifiStrength ?? 0;
    if (strength >= 70) return { label: "Óptima", color: "#22C55E" };
    if (strength >= 40) return { label: "Buena", color: "#84CC16" };
    if (strength >= 20) return { label: "Regular", color: "#F59E0B" };
    return { label: "Débil", color: "#EF4444" };
  }

  if (snapshot.type === "cellular") {
    switch (snapshot.cellularGeneration) {
      case "5g":
        return { label: "Óptima", color: "#22C55E" };
      case "4g":
        return { label: "Buena", color: "#84CC16" };
      case "3g":
        return { label: "Regular", color: "#F59E0B" };
      case "2g":
        return { label: "Débil", color: "#EF4444" };
    }
  }

  return { label: "Conectado", color: "#22C55E" };
}
