/** Pure validation for workspace-relative asset URIs, kept separate from filesystem resolution. */
const MAX_ASSET_URI_LENGTH = 512
const SAFE_ASSET_PATH = /^assets\/[a-zA-Z0-9._/-]+$/i
const SAFE_MODEL_PATH = /\.(?:glb|gltf)$/i

export function isSafeWorkspaceAssetUri(uri: unknown, modelOnly = false): uri is string {
  if (typeof uri !== 'string' || uri.length > MAX_ASSET_URI_LENGTH || !SAFE_ASSET_PATH.test(uri) || uri.includes(String.fromCharCode(92))) return false
  const parts = uri.split('/')
  if (parts.some(part => !part || part === '.' || part === '..' || part.length > 255)) return false
  if (modelOnly && !SAFE_MODEL_PATH.test(uri)) return false
  return true
}

/** Only UUID-named GLBs created by the desktop import picker may be discarded. */
export function isDisposableImportedGlbUri(uri: unknown): uri is string {
  return typeof uri === 'string' && /^assets\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.glb$/i.test(uri) && isSafeWorkspaceAssetUri(uri, true)
}
