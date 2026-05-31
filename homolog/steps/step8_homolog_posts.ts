import axios from "axios";
import { config } from "../../src/config.js";
import { ask } from "../../src/utils/ai.js";

const BASE = `https://api.telegram.org/bot${config.telegram.botToken}`;
const N = Number(process.env.HOMOLOG_POSTS ?? "3");
const GAP_MS = Number(process.env.HOMOLOG_GAP_MS ?? "20000");

type Result = {
  i: number;
  ok: boolean;
  messageId?: number;
  error?: string;
};

async function send(text: string): Promise<number> {
  const { data } = await axios.post(
    `${BASE}/sendMessage`,
    {
      chat_id: config.telegram.chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    },
    { timeout: 15000 },
  );
  return data.result.message_id as number;
}

async function del(messageId: number): Promise<boolean> {
  try {
    await axios.post(
      `${BASE}/deleteMessage`,
      { chat_id: config.telegram.chatId, message_id: messageId },
      { timeout: 15000 },
    );
    return true;
  } catch (err) {
    console.error(`  deleteMessage ${messageId} falhou: ${(err as Error).message}`);
    return false;
  }
}

async function main() {
  console.log(`Modelo: ${process.env.LITELLM_MODEL}`);
  console.log(`Gerando ${N} posts de homologação (gap ${GAP_MS}ms)...`);
  const results: Result[] = [];

  for (let i = 1; i <= N; i++) {
    let messageId: number | undefined;
    try {
      const tip = await ask(
        `Escreva uma dica técnica curta (máx 4 linhas) em pt-BR para desenvolvedores sobre IA/LLM/agentes. Apenas o texto, sem markdown, sem aspas.`,
        "Você é um editor técnico conciso. Responda só com a dica.",
      );
      if (!tip || !tip.trim()) throw new Error("LLM retornou vazio");
      const text = `<b>[HOMOLOG ${i}/${N}] Evo Agent</b>\n\n${tip.trim()}\n\n<i>Gerado por: ${process.env.LITELLM_MODEL}</i>`;
      messageId = await send(text);
      results.push({ i, ok: true, messageId });
      console.log(`  ✅ Post ${i} enviado (message_id=${messageId})`);
    } catch (err) {
      const error = (err as Error).message;
      results.push({ i, ok: false, messageId, error });
      console.error(`  ❌ Post ${i} falhou: ${error}`);
      // Se a mensagem chegou a ser enviada mas o fluxo falhou, remove
      if (messageId) await del(messageId);
    }
    if (i < N) await new Promise((r) => setTimeout(r, GAP_MS));
  }

  const okCount = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  console.log(`\nResumo: ${okCount}/${N} posts OK.`);
  if (failed.length > 0) {
    console.log(`Posts com problema: ${failed.map((f) => f.i).join(", ")}`);
    for (const f of failed) {
      if (f.messageId) {
        const removed = await del(f.messageId);
        console.log(`  Post ${f.i} (msg ${f.messageId}) removido: ${removed}`);
      }
    }
  }

  console.log(`HOMOLOG_POSTS_OK=${okCount}`);
  console.log(`HOMOLOG_POSTS_FAILED=${failed.length}`);
  if (okCount === 0) process.exit(1);
}

main().catch((err) => {
  console.error("ERRO:", err.message);
  process.exit(1);
});
