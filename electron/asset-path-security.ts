/** Pure validation for workspace-relative asset URIs, kept separate from filesystem resolution. */
const MAX_ASSET_URI_LENGTH = 512
const SAFE_ASSET_PATH = /^assets\/[a-zA-Z0-9._/-]+$/i
const SAFE_MODEL_PATH = /\.(?:glb|gltf)$/i

export function isSafeWorkspaceAssetUri(uri: unknown, modelOnly = false): uri is string {
  if (typeof uri !== 'string' || uri.length > MAX_ASSET_URI_LENGTH || !SAFE_ASSET_PATH.test(uri) || uri.includes(String.fromCharCode(92))) return false
  if (uri.split('/').some(part => !part || part === '.' || part === '..')) return false
  if (modelOnly && !SAFE_MODEL_PATH.test(uri)) return false
  return true
}
