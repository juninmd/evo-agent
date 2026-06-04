import { ask } from "../../src/utils/ai.js";

async function main() {
  const model =
    process.env.LITELLM_MODEL ??
    process.env.OPENCODE_MODEL ??
    "cloud/llama-70b";

  console.log(`Testando conexão com LiteLLM (modelo: ${model})...`);

  try {
    const response = await Promise.race([
      ask("Say OK and nothing else."),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 300000)
      ),
    ]);

    if (response && response.trim().length > 0) {
      console.log("✅ RESPONDE");
      console.log(`MODELO_SELECIONADO=${model}`);
    } else {
      console.error("ERRO: Resposta vazia do LiteLLM.");
      process.exit(1);
    }
  } catch (err: any) {
    console.error("ERRO:", err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("ERRO:", err.message);
  process.exit(1);
});
