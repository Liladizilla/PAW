/** Groq model IDs may be provider-namespaced, e.g. openai/gpt-oss-120b. */
export function isValidGroqModelId(model: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,119}$/.test(model)
}
