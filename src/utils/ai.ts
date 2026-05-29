import { createOpencode } from "@opencode-ai/sdk";
import { config } from "../config.js";
import { log } from "./logger.js";

// biome-ignore lint/suspicious/noExplicitAny: SDK types not exported
type OcClient = any;

let _client: OcClient | null = null;
let _selectedModel: { providerID: string; modelID: string } | null = null;

async function getClient(): Promise<OcClient> {
  if (!_client) {
    const { client } = await createOpencode({ timeout: 60000 });
    _client = client;
    log.info("OpenCode server started");
  }
  return _client;
}

async function getAvailableModels(): Promise<Array<{ id: string; name: string; free?: boolean }>> {
  try {
    const client = await getClient();
    // Try to list available models from OpenCode API
    const modelsRes = await client.models?.list?.() ?? { data: [] };
    return modelsRes.data || [];
  } catch (err) {
    log.warn(`Failed to fetch available models: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

async function selectBestModel(): Promise<{ providerID: string; modelID: string }> {
  // Check if explicit model is set
  const envModel = process.env.OPENCODE_MODEL;
  if (envModel) {
    log.info(`Using explicit model from env: ${envModel}`);
    return parseProviderModel(envModel);
  }

  // Try to find a free model
  const models = await getAvailableModels();
  const freeModels = models.filter((m) => m.free === true);

  if (freeModels.length > 0) {
    const selected = freeModels[0];
    log.info(`Selected free model: ${selected.name} (${selected.id})`);
    return parseProviderModel(selected.id);
  }

  // Fallback to Gemini (usually free tier available)
  log.info("No free model found, falling back to google/gemini-2.0-flash");
  return { providerID: "google", modelID: "gemini-2.0-flash" };
}

function parseProviderModel(model: string): {
  providerID: string;
  modelID: string;
} {
  const slash = model.indexOf("/");
  if (slash === -1) return { providerID: "opencode", modelID: model };
  return { providerID: model.slice(0, slash), modelID: model.slice(slash + 1) };
}

export async function ask(
  userPrompt: string,
  systemPrompt?: string,
): Promise<string> {
  const client = await getClient();

  // Select best available model (free tier preferred)
  if (!_selectedModel) {
    _selectedModel = await selectBestModel();
  }
  const { providerID, modelID } = _selectedModel;

  const sessionRes = await client.session.create({ body: {} });
  const sessionId: string = sessionRes.data?.id;
  if (!sessionId) throw new Error("Failed to create opencode session");

  try {
    if (systemPrompt) {
      await client.session.prompt({
        path: { id: sessionId },
        body: {
          parts: [{ type: "text", text: systemPrompt }],
          model: { providerID, modelID },
          noReply: true,
        },
      });
    }

    const result = await client.session.prompt({
      path: { id: sessionId },
      body: {
        parts: [{ type: "text", text: userPrompt }],
        model: { providerID, modelID },
      },
    });

    const parts: Array<{ type: string; text?: string }> =
      result.data?.parts ?? [];
    return parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text as string)
      .join("");
  } finally {
    client.session.delete({ path: { id: sessionId } }).catch(() => {});
  }
}
