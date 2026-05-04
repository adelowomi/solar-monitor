export function fmtKw(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "\u2014";
  const abs = Math.abs(v);
  if (abs >= 1) return `${v.toFixed(2)} kW`;
  return `${(v * 1000).toFixed(0)} W`;
}

export function fmtKwh(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "\u2014";
  return `${Number(v).toFixed(1)} kWh`;
}

export function fmtRelativeTime(date: Date): string {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function splitUnit(formatted: string): [string, string] {
  const parts = formatted.split(" ");
  return [parts[0], parts.slice(1).join(" ")];
}
