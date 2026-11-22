import axios from "axios";
import { db } from "../knowledge/store.js";
import { HTTP_LIMITS } from "../utils/http-limits.js";
import { log } from "../utils/logger.js";
import { summarizeSourceContent } from "./feed-items.js";

export const MCP_REGISTRY_SOURCE = "MCP Registry";
const API = "https://registry.modelcontextprotocol.io/v0/servers";
const WINDOW_DAYS = 3;
const PAGE_SIZE = 100;
/** Bounded walk: the registry adds a few hundred servers a day. */
const MAX_PAGES = 5;
const SAVE_LIMIT = 15;
const GITHUB_REPO = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/;
const IDENTIFIER = /^[@\w./:-]{1,120}$/;
const OFFICIAL_META = "io.modelcontextprotocol.registry/official";

interface RegistryPackage {
  registryType?: string;
  identifier?: string;
}

export interface RegistryServer {
  name?: string;
  title?: string;
  description?: string;
  version?: string;
  repository?: { url?: string };
  packages?: RegistryPackage[];
  /** Set by the crawler from the registry's official metadata. */
  publishedAt?: string;
}

interface RegistryPage {
  servers?: Array<{
    server?: RegistryServer;
    _meta?: Record<string, { publishedAt?: string }>;
  }>;
  metadata?: { nextCursor?: string };
}

/** The command a reader pastes, by package registry; null when unknown. */
export function installHint(pkg: RegistryPackage): string | null {
  const id = pkg.identifier ?? "";
  if (!IDENTIFIER.test(id)) return null;
  switch (pkg.registryType) {
    case "npm":
      return `npx -y ${id}`;
    case "pypi":
      return `uvx ${id}`;
    case "oci":
      return `docker run -i --rm ${id}`;
    default:
      return null;
  }
}

/**
 * Most entries are hosted SaaS endpoints; a public repo plus an installable
 * package is what a developer can actually read and run.
 */
export function devServers(servers: RegistryServer[]): RegistryServer[] {
  const seen = new Set<string>();
  const newestFirst = [...servers].sort((a, b) =>
    (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  );
  return newestFirst.filter((server) => {
    const name = server.name ?? "";
    if (!name || seen.has(name)) return false;
    seen.add(name);
    return (
      GITHUB_REPO.test(server.repository?.url ?? "") &&
      (server.packages ?? []).some((pkg) => installHint(pkg) !== null)
    );
  });
}

export interface McpRegistryDeps {
  page: (since: string, cursor?: string) => Promise<RegistryPage>;
}

const defaultDeps: McpRegistryDeps = {
  page: async (since, cursor) => {
    const { data } = await axios.get<RegistryPage>(API, {
      ...HTTP_LIMITS,
      timeout: 15_000,
      params: {
        limit: PAGE_SIZE,
        version: "latest",
        updated_since: since,
        ...(cursor ? { cursor } : {}),
      },
    });
    return data ?? {};
  },
};

export async function crawlMcpRegistry(
  now = new Date(),
  deps: McpRegistryDeps = defaultDeps,
): Promise<number> {
  const since = new Date(
    now.getTime() - WINDOW_DAYS * 86_400_000,
  ).toISOString();
  const servers: RegistryServer[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await deps.page(since, cursor);
    for (const entry of data.servers ?? []) {
      if (entry.server) {
        servers.push({
          ...entry.server,
          publishedAt: entry._meta?.[OFFICIAL_META]?.publishedAt,
        });
      }
    }
    cursor = data.metadata?.nextCursor;
    if (!cursor) break;
  }
  let saved = 0;
  for (const server of devServers(servers).slice(0, SAVE_LIMIT)) {
    const url = (server.repository?.url ?? "").replace(/\/$/, "");
    if (db.urlExists(url)) continue;
    const command = (server.packages ?? [])
      .map(installHint)
      .find((hint): hint is string => hint !== null);
    db.saveArticle({
      title: `MCP: ${server.title || server.name}`,
      source: MCP_REGISTRY_SOURCE,
      url,
      summary: summarizeSourceContent(server.description ?? "", 400),
      // Fenced so the skill week card and the brief show it as a command.
      body: command ? `\`\`\`bash\n${command}\n\`\`\`` : undefined,
      tags: JSON.stringify(["mcp", "tools", "registry"]),
      engagement_score: 0,
    });
    saved++;
  }
  log.info(
    `Crawled ${MCP_REGISTRY_SOURCE}, ${servers.length} updated, ${saved} new dev servers`,
  );
  return saved;
}
