import { app, safeStorage } from "electron";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

const keyFile = () => join(app.getPath("userData"), "paw", "providers", "groq-key.enc");
const defaultModel = "llama-3.3-70b-versatile";
const maxPromptChars = 32_000;

function requireSecureStorage() {
  if (!safeStorage.isEncryptionAvailable() || safeStorage.getSelectedStorageBackend() === "basic_text" ||
      safeStorage.getSelectedStorageBackend() === "unknown") {
    throw new Error("OS-backed secure credential storage is unavailable. Configure an OS keyring before saving a provider key.");
  }
}

async function readKey(): Promise<string | null> {
  requireSecureStorage();
  try {
    return safeStorage.decryptString(await readFile(keyFile()));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function configureGroqApiKey(apiKey: string): Promise<{ configured: boolean }> {
  if (typeof apiKey !== "string" || apiKey.trim().length < 20 || apiKey.length > 512 || /\s/.test(apiKey)) {
    throw new Error("The Groq API key format is invalid.");
  }
  requireSecureStorage();
  const path = keyFile();
  await mkdir(join(app.getPath("userData"), "paw", "providers"), { recursive: true });
  await writeFile(path, safeStorage.encryptString(apiKey.trim()), { mode: 0o600 });
  return { configured: true };
}

export async function clearGroqApiKey(): Promise<{ configured: false }> {
  try {
    await unlink(keyFile());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return { configured: false };
}

export async function groqProviderStatus(): Promise<{ provider: "groq"; configured: boolean; model: string }> {
  try {
    return { provider: "groq", configured: Boolean(await readKey()), model: defaultModel };
  } catch {
    return { provider: "groq", configured: false, model: defaultModel };
  }
}

export async function groqChat(input: { prompt: string; system?: string; model?: string }): Promise<{ text: string; model: string }> {
  if (!input || typeof input.prompt !== "string" || !input.prompt.trim() || input.prompt.length > maxPromptChars) {
    throw new Error(`Prompt must contain 1-${maxPromptChars} characters.`);
  }
  if (input.system !== undefined && (typeof input.system !== "string" || input.system.length > 8_000)) {
    throw new Error("System instructions exceed the configured limit.");
  }
  const apiKey = await readKey();
  if (!apiKey) throw new Error("Groq is not configured. Add a key in provider settings first.");
  const model = input.model?.trim() || defaultModel;
  if (!/^[a-zA-Z0-9._:-]{1,120}$/.test(model)) throw new Error("Invalid model identifier.");

  const messages = [
    ...(input.system ? [{ role: "system", content: input.system }] : []),
    { role: "user", content: input.prompt }
  ];
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 2048 }),
    signal: AbortSignal.timeout(60_000)
  });
  if (!response.ok) {
    const message = response.status === 401 ? "Groq rejected the API key." :
      response.status === 429 ? "Groq rate limit reached. Try again later." :
      response.status >= 500 ? "Groq is temporarily unavailable." :
      `Groq request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }
  const result: unknown = await response.json();
  if (!result || typeof result !== "object") throw new Error("Groq returned an invalid response.");
  const choices = (result as { choices?: Array<{ message?: { content?: unknown } }> }).choices;
  const content = choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("Groq returned no text response.");
  return { text: content, model };
}
