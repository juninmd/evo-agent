import { createOpencode } from "@opencode-ai/sdk";
import { config } from "../config.js";
import { log } from "./logger.js";

// biome-ignore lint/suspicious/noExplicitAny: SDK types not exported
type OcClient = any;

let _client: OcClient | null = null;

async function getClient(): Promise<OcClient> {
  if (!_client) {
    const { client } = await createOpencode({ timeout: 60000 });
    _client = client;
    log.info("OpenCode server started");
  }
  return _client;
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
  const rawModel =
    process.env.OPENCODE_MODEL ??
    `${config.opencode.provider}/${config.opencode.model}`;
  const { providerID, modelID } = parseProviderModel(rawModel);

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
