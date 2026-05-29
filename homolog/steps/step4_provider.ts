import { createOpencode } from "@opencode-ai/sdk";

const PROVIDER_PRIORITY = ["opencode", "ollama", "opencode-go", "github-models", "github-copilot"];

async function probeModel(client: any, providerID: string, modelID: string): Promise<boolean> {
  try {
    const sessionRes = await client.session.create({ body: {} });
    const sessionId = sessionRes.data?.id;
    if (!sessionId) return false;

    try {
      const result = await Promise.race([
        client.session.prompt({
          path: { id: sessionId },
          body: {
            parts: [{ type: "text", text: 'Say "OK" and nothing else.' }],
            model: { providerID, modelID },
          },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 20000)),
      ]) as any;

      const parts = result?.data?.parts ?? [];
      const text = parts.filter((p: any) => p.type === "text" && p.text).map((p: any) => p.text).join("");
      return text.length > 0;
    } finally {
      client.session.delete({ path: { id: sessionId } }).catch(() => {});
    }
  } catch {
    return false;
  }
}

async function main() {
  const { client } = await createOpencode({ timeout: 60000 });

  const res = await client.provider.list();
  const data = res?.data ?? res;
  const connected: string[] = data?.connected ?? [];
  const all: any[] = data?.all ?? [];

  if (connected.length === 0) {
    console.error("ERRO: Nenhum provider conectado.");
    process.exit(1);
  }

  // Sort by priority
  const sorted = [
    ...PROVIDER_PRIORITY.filter((p) => connected.includes(p)),
    ...connected.filter((p) => !PROVIDER_PRIORITY.includes(p)),
  ];

  console.log(`Providers conectados (ordenados): ${sorted.join(", ")}`);

  for (const providerID of sorted) {
    const pDef = all.find((p: any) => p.id === providerID);
    const models = Object.values(pDef?.models ?? {}) as any[];
    const freeModels = models.filter((m: any) => m.cost?.input === 0 && m.cost?.output === 0);
    const candidates = [...freeModels, ...models.filter((m: any) => !freeModels.includes(m))].slice(0, 3);

    console.log(`\n${providerID}: ${models.length} modelos, ${freeModels.length} gratuitos`);
    if (freeModels.length > 0) {
      console.log(`  Gratuitos: ${freeModels.map((m: any) => m.id).join(", ")}`);
    }

    for (const model of candidates) {
      process.stdout.write(`  Testando ${providerID}/${model.id}... `);
      const ok = await probeModel(client, providerID, model.id);
      if (ok) {
        console.log("✅ RESPONDE");
        console.log(`MODELO_SELECIONADO=${providerID}/${model.id}`);
        process.exit(0);
      } else {
        console.log("❌ falhou");
      }
    }
  }

  console.error("ERRO: Nenhum modelo respondeu.");
  process.exit(1);
}

main().catch((err) => {
  console.error("ERRO:", err.message);
  process.exit(1);
});
