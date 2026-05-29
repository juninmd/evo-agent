import { createOpencode } from "@opencode-ai/sdk";
import { log } from "./logger.js";

// biome-ignore lint/suspicious/noExplicitAny: SDK types not exported
type OcClient = any;

// Provider priority: prefer opencode (uses OPENCODE_API_KEY) over others that need OAuth
const PROVIDER_PRIORITY = ["opencode", "ollama", "opencode-go", "github-models", "github-copilot"];

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

async function selectBestModel(): Promise<{ providerID: string; modelID: string }> {
  // Explicit override always wins
  const envModel = process.env.OPENCODE_MODEL;
  if (envModel) {
    const slash = envModel.indexOf("/");
    const result = slash === -1
      ? { providerID: "opencode", modelID: envModel }
      : { providerID: envModel.slice(0, slash), modelID: envModel.slice(slash + 1) };
    log.info(`Using explicit OPENCODE_MODEL: ${envModel}`);
    return result;
  }

  const client = await getClient();

  try {
    const res = await client.provider.list();
    const data = res?.data ?? res;
    const connected: string[] = data?.connected ?? [];
    const all: any[] = data?.all ?? [];

    log.info(`Connected providers: [${connected.join(", ")}]`);

    // Sort connected providers by priority order
    const sorted = [
      ...PROVIDER_PRIORITY.filter((p) => connected.includes(p)),
      ...connected.filter((p) => !PROVIDER_PRIORITY.includes(p)),
    ];

    for (const providerID of sorted) {
      const providerDef = all.find((p: any) => p.id === providerID);
      if (!providerDef?.models) continue;

      const models = Object.values(providerDef.models) as any[];
      // Prefer free (cost = 0), then any model
      const freeModels = models.filter(
        (m: any) => m.cost && m.cost.input === 0 && m.cost.output === 0,
      );
      const pick = freeModels[0] ?? models[0];
      if (!pick) continue;

      log.info(`Selected model: ${providerID}/${(pick as any).id} (free=${freeModels.length > 0})`);
      return { providerID, modelID: (pick as any).id };
    }
  } catch (err) {
    log.warn(`provider.list() failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Hard fallback: opencode free model (OPENCODE_API_KEY is always set)
  log.warn("Falling back to opencode/deepseek-v4-flash-free");
  return { providerID: "opencode", modelID: "deepseek-v4-flash-free" };
}

export async function ask(
  userPrompt: string,
  systemPrompt?: string,
): Promise<string> {
  const client = await getClient();

  if (!_selectedModel) {
    _selectedModel = await selectBestModel();
  }
  const { providerID, modelID } = _selectedModel;
  log.info(`Calling model: ${providerID}/${modelID}`);

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
    const text = parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text as string)
      .join("");

    if (!text) {
      log.warn(`Empty response from ${providerID}/${modelID}`);
    }
    return text;
  } finally {
    client.session.delete({ path: { id: sessionId } }).catch(() => {});
  }
}
