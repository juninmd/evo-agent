import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Formatar em hora local e o comportamento certo no app, mas um teste que
    // depende do fuso da maquina passa em BRT e falha na CI (UTC). O fuso fica
    // fixo aqui, no mesmo padrao do agente (`TZ` em .env.example).
    env: { TZ: "America/Sao_Paulo" },
  },
});
