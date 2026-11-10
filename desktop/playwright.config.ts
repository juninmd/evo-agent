import { defineConfig, devices } from "@playwright/test";

// Uma maquina sem a revisao do Chromium que esta versao do Playwright baixa
// (sandbox, CI offline) aponta para um Chromium ja instalado.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  // O console le a API a cada 30 s; um unico worker evita dois dev servers.
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:1435",
    trace: "retain-on-failure",
    // As horas da interface saem no fuso do navegador; fixo como no vitest,
    // para o teste dizer a mesma hora em qualquer maquina.
    timezoneId: "America/Sao_Paulo",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // 2x: as capturas de docs/prints saem na densidade de uma tela HiDPI,
        // onde serrilhado de grafico e fio borrado aparecem.
        deviceScaleFactor: 2,
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:1435",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
