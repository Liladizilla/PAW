/**
 * Resolve optional Electron-only smoke hooks without assuming the renderer is
 * running inside Electron. Vercel serves the same React UI without preload IPC.
 */
export type DesktopSmokeBridge = {
  desktopSmokeReady?: () => Promise<unknown>
}

export function getDesktopSmokeReady(bridge: unknown): (() => Promise<unknown>) | undefined {
  if (typeof bridge !== 'object' || bridge === null) return undefined
  const candidate = (bridge as DesktopSmokeBridge).desktopSmokeReady
  return typeof candidate === 'function' ? candidate : undefined
}
