export const DEFAULT_API_ORIGIN = "http://localhost:8090"

export function resolveApiOrigin(runtimeUrl?: string, buildUrl?: string): string {
  return (runtimeUrl?.trim() || buildUrl?.trim() || DEFAULT_API_ORIGIN).replace(/\/+$/, "")
}

export function configuredApiOrigin(): string {
  return resolveApiOrigin(window.__APP_CONFIG__?.VITE_API_URL, import.meta.env.VITE_API_URL)
}
