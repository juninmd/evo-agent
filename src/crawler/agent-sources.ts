/**
 * Primary channels for coding agents, agent protocols and practitioner
 * analysis. Probed live on 2026-09-17: each one published inside the last
 * ~120 days; the crawler's age window ignores anything older.
 */
const feed = (name: string, url: string, tags: string[]) => ({
  name,
  url,
  tags,
});

const gh = (repo: string) => `https://github.com/${repo}/releases.atom`;

export const AGENT_SOURCES = [
  // Coding agents: release notes carry the behavior changes users hit first.
  feed("Claude Code Releases", gh("anthropics/claude-code"), [
    "claude-code",
    "anthropic",
    "coding-agent",
  ]),
  feed("Codex CLI Releases", gh("openai/codex"), [
    "codex",
    "openai",
    "coding-agent",
  ]),
  feed("Gemini CLI Releases", gh("google-gemini/gemini-cli"), [
    "gemini",
    "google",
    "coding-agent",
  ]),
  feed("Copilot CLI Releases", gh("github/copilot-cli"), [
    "copilot",
    "github",
    "coding-agent",
  ]),
  feed("OpenCode Releases", gh("sst/opencode"), ["opencode", "coding-agent"]),
  feed("Cline Releases", gh("cline/cline"), ["cline", "coding-agent"]),
  feed("GitHub Changelog", "https://github.blog/changelog/feed/", [
    "github",
    "copilot",
    "changelog",
  ]),
  feed("Cursor Changelog", "https://cursor.com/changelog/rss.xml", [
    "cursor",
    "coding-agent",
    "changelog",
  ]),
  feed("Zed Blog", "https://zed.dev/blog.rss", ["zed", "editor", "ai"]),
  // Agent protocols and SDKs.
  feed("MCP Spec Releases", gh("modelcontextprotocol/modelcontextprotocol"), [
    "mcp",
    "protocol",
    "agents",
  ]),
  feed(
    "MCP TypeScript SDK Releases",
    gh("modelcontextprotocol/typescript-sdk"),
    ["mcp", "sdk", "agents"],
  ),
  feed("OpenAI Agents SDK Releases", gh("openai/openai-agents-python"), [
    "openai",
    "sdk",
    "agents",
  ]),
  feed("Vercel AI SDK Releases", gh("vercel/ai"), ["ai-sdk", "sdk", "agents"]),
  // Successor of AutoGen, which has been in maintenance mode since 2025.
  feed("Microsoft Agent Framework Releases", gh("microsoft/agent-framework"), [
    "microsoft",
    "agents",
    "llm-framework",
  ]),
  feed("SGLang Releases", gh("sgl-project/sglang"), ["sglang", "inference"]),
  // Vendor engineering blogs without a native feed.
  feed(
    "Anthropic Engineering",
    "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_engineering.xml",
    ["anthropic", "engineering", "agents"],
  ),
  feed("Cloudflare AI Blog", "https://blog.cloudflare.com/tag/ai/rss/", [
    "cloudflare",
    "ai",
    "infra",
  ]),
  feed(
    "Microsoft Foundry Blog",
    "https://devblogs.microsoft.com/foundry/feed/",
    ["microsoft", "ai", "agents"],
  ),
  // Practitioner analysis: low volume, high density.
  feed("Interconnects (Nathan Lambert)", "https://www.interconnects.ai/feed", [
    "analysis",
    "models",
    "research",
  ]),
  feed("Import AI (Jack Clark)", "https://jack-clark.net/feed/", [
    "analysis",
    "research",
    "policy",
  ]),
  feed("Eugene Yan", "https://eugeneyan.com/rss/", [
    "analysis",
    "llm",
    "evals",
  ]),
  feed("Hamel Husain", "https://hamel.dev/index.xml", ["analysis", "evals"]),
  feed("Addy Osmani", "https://addyo.substack.com/feed", [
    "analysis",
    "ai-coding",
  ]),
  feed(
    "One Useful Thing (Ethan Mollick)",
    "https://www.oneusefulthing.org/feed",
    ["analysis", "ai"],
  ),
  feed("Martin Fowler", "https://martinfowler.com/feed.atom", [
    "engineering",
    "ai-coding",
  ]),
  // Curated community: votes filter what HN and Reddit miss.
  feed("Lobsters: AI", "https://lobste.rs/t/ai.rss", ["lobsters", "community"]),
  feed("Lobsters: vibecoding", "https://lobste.rs/t/vibecoding.rss", [
    "lobsters",
    "community",
    "ai-coding",
  ]),
];
