import {
  type IncomingMessage,
  type ServerResponse,
  createServer,
} from "node:http";
import { config } from "../config.js";
import { getDb } from "../knowledge/store.js";
import { log } from "../utils/logger.js";
import { isAuthorized } from "./auth.js";
import { ApiError, matchPath, readJsonBody, sendJson } from "./http.js";
import { type Route, createRoutes } from "./routes.js";
import { createRunSpawner } from "./runs.js";

/**
 * `/healthz` stays outside the token check so a Kubernetes probe never needs
 * the credential; it exposes liveness only, never a row of agent data.
 */
function handleProbe(res: ServerResponse, startedAt: number): void {
  sendJson(res, 200, {
    status: "ok",
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
  });
}

function applyCors(res: ServerResponse, origin: string | undefined): boolean {
  if (!origin || !config.api.corsOrigins.includes(origin)) return false;
  res.setHeader("access-control-allow-origin", origin);
  res.setHeader("vary", "origin");
  res.setHeader("access-control-allow-headers", "authorization, content-type");
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  return true;
}

function findRoute(
  routes: Route[],
  method: string,
  pathname: string,
): { route: Route; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    const params = matchPath(route.path, pathname);
    if (params) return { route, params };
  }
  return null;
}

export interface ApiServerOptions {
  startedAt?: number;
  routes?: Route[];
}

export function createApiServer(options: ApiServerOptions = {}) {
  const startedAt = options.startedAt ?? Date.now();
  const routes =
    options.routes ?? createRoutes({ spawner: createRunSpawner(), startedAt });

  return createServer((req: IncomingMessage, res: ServerResponse) => {
    void handle(req, res, routes, startedAt);
  });
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  routes: Route[],
  startedAt: number,
): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "local"}`);
  const origin =
    typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  const cors = applyCors(res, origin);

  try {
    if (req.method === "OPTIONS") {
      res.writeHead(cors ? 204 : 405).end();
      return;
    }
    if (url.pathname === "/healthz") {
      handleProbe(res, startedAt);
      return;
    }

    const authorization = req.headers.authorization;
    if (!isAuthorized(authorization, config.api.token)) {
      // A missing token is a configuration mistake and a wrong one is an
      // intrusion attempt; neither answer echoes the expected value.
      throw new ApiError(
        401,
        authorization ? "invalid token" : "missing bearer token",
      );
    }

    const matched = findRoute(routes, req.method ?? "GET", url.pathname);
    if (!matched) {
      throw new ApiError(404, `no route for ${req.method} ${url.pathname}`);
    }

    const body = req.method === "POST" ? await readJsonBody(req) : undefined;
    const result = await matched.route.handler({
      params: matched.params,
      url,
      body,
    });
    sendJson(res, matched.route.successStatus ?? 200, result);
  } catch (error) {
    if (error instanceof ApiError) {
      sendJson(res, error.status, { error: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    log.error(`API request failed: ${message}`);
    sendJson(res, 500, { error: "internal error" });
  }
}

export function startApiServer(): Promise<{ url: string; close: () => void }> {
  const server = createApiServer();
  const { host, port } = config.api;
  let closed = false;

  // The API owns its own database handle, so it closes it before exiting.
  const close = () => {
    if (closed) return;
    closed = true;
    server.close();
    getDb().close();
  };

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.removeListener("error", reject);
      const url = `http://${host}:${port}`;
      log.info(`API listening on ${url}`);
      if (!config.api.allowRuns) {
        log.info("Run triggering disabled (API_ALLOW_RUNS is not true)");
      }

      for (const signal of ["SIGINT", "SIGTERM"] as const) {
        process.on(signal, () => {
          log.info(`${signal} received, closing API server...`);
          // Drained first so an in-flight response is not cut off.
          server.close(() => {
            close();
            process.exit(0);
          });
        });
      }

      resolve({ url, close });
    });
  });
}
