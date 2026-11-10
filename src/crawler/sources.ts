export interface FeedSource {
  name: string;
  url: string;
  tags: string[];
  // HTML sources are scraped via Playwright instead of RSS parsing.
  html?: { hrefPrefix: string; baseUrl: string; excludePrefix?: string };
}

/** The static feed catalog; `extra_sources` in agent_state extends it at runtime. */
export const DEFAULT_SOURCES: FeedSource[] = [
  // Grandes empresas de IA
  {
    name: "Google AI Blog",
    url: "https://blog.google/technology/ai/rss/",
    tags: ["google", "ai"],
  },
  {
    name: "Anthropic News",
    url: "https://www.anthropic.com/news",
    tags: ["anthropic", "claude", "ai"],
    html: { hrefPrefix: "/news/", baseUrl: "https://www.anthropic.com" },
  },
  {
    name: "OpenAI Blog",
    url: "https://openai.com/blog/rss.xml",
    tags: ["openai", "ai"],
  },
  // Developer tools & IDEs com IA
  {
    name: "VSCode Updates",
    url: "https://code.visualstudio.com/feed.xml",
    tags: ["vscode", "tools", "ai-assistant"],
  },
  {
    name: "VSCode Blogs",
    url: "https://code.visualstudio.com/blogs",
    tags: ["vscode", "tools", "ai-assistant"],
    html: { hrefPrefix: "/blogs/", baseUrl: "https://code.visualstudio.com" },
  },
  {
    name: "GitHub Blog",
    url: "https://github.blog/feed/",
    tags: ["github", "developer", "ai"],
  },
  // ML/AI Platforms & Tools
  {
    name: "Hugging Face Blog",
    url: "https://huggingface.co/blog/feed.xml",
    tags: ["huggingface", "ai", "models"],
  },
  {
    name: "Lil'Log (Lilian Weng)",
    url: "https://lilianweng.github.io/index.xml",
    tags: ["ai", "ml", "research", "llm"],
  },
  {
    name: "Simon Willison's Weblog",
    url: "https://simonwillison.net/atom/entries/",
    tags: ["ai", "llm", "developer", "tools"],
  },
  {
    name: "PyTorch Blog",
    url: "https://pytorch.org/blog/feed/",
    tags: ["pytorch", "ml", "training", "inference"],
  },
  // Research papers
  {
    name: "arXiv cs.SE",
    url: "https://rss.arxiv.org/rss/cs.SE",
    tags: [
      "arxiv",
      "software-engineering",
      "programming",
      "research",
      "papers",
    ],
  },
  {
    name: "Reddit: ClaudeAI",
    url: "https://www.reddit.com/r/ClaudeAI/.rss",
    tags: ["reddit", "claude", "ai"],
  },
  {
    name: "Reddit: ClaudeCode",
    url: "https://www.reddit.com/r/ClaudeCode/.rss",
    tags: ["reddit", "claude", "coding", "ai"],
  },
  {
    name: "Reddit: Claude",
    url: "https://www.reddit.com/r/claude/.rss",
    tags: ["reddit", "claude", "ai"],
  },
  {
    name: "Reddit: VSCode",
    url: "https://www.reddit.com/r/vscode/.rss",
    tags: ["reddit", "vscode", "tools"],
  },
  {
    name: "Reddit: GithubCopilot",
    url: "https://www.reddit.com/r/GithubCopilot/.rss",
    tags: ["reddit", "github", "copilot", "ai"],
  },
  {
    name: "Reddit: Codex",
    url: "https://www.reddit.com/r/codex/.rss",
    tags: ["reddit", "codex", "openai", "coding", "ai"],
  },
  {
    name: "Reddit: KiloCode",
    url: "https://www.reddit.com/r/kilocode/.rss",
    tags: ["reddit", "kilocode", "coding"],
  },
  {
    name: "Reddit: OpenCode",
    url: "https://www.reddit.com/r/opencode/.rss",
    tags: ["reddit", "opencode", "coding"],
  },
  {
    name: "Reddit: LocalLLaMA",
    url: "https://www.reddit.com/r/LocalLLaMA/.rss",
    tags: ["reddit", "llm", "local-ai", "models"],
  },
  {
    name: "Reddit: AI Agents",
    url: "https://www.reddit.com/r/AI_Agents/.rss",
    tags: ["reddit", "agents", "ai"],
  },
  {
    name: "Reddit: AgenticAI",
    url: "https://www.reddit.com/r/AgenticAI/.rss",
    tags: ["reddit", "agents", "ai"],
  },
  {
    name: "Reddit: LangChain",
    url: "https://www.reddit.com/r/LangChain/.rss",
    tags: ["reddit", "langchain", "agents", "rag"],
  },
  {
    name: "Reddit: Ollama",
    url: "https://www.reddit.com/r/ollama/.rss",
    tags: ["reddit", "ollama", "local-ai", "llm"],
  },
  {
    name: "Reddit: WindsurfAI",
    url: "https://www.reddit.com/r/WindsurfAI/.rss",
    tags: ["reddit", "windsurf", "coding", "ai"],
  },
  {
    name: "Reddit Search: ai agents",
    url: "https://www.reddit.com/search/.rss?q=ai+agents&sort=new",
    tags: ["reddit", "agents", "ai", "search"],
  },
  {
    name: "Reddit Search: local llm",
    url: "https://www.reddit.com/search/.rss?q=local+llm&sort=new",
    tags: ["reddit", "llm", "local-ai", "search"],
  },
  {
    name: "Reddit Search: cursor windsurf copilot",
    url: "https://www.reddit.com/search/.rss?q=cursor+OR+windsurf+OR+copilot&sort=new",
    tags: ["reddit", "coding", "ai", "search"],
  },
  {
    name: "Reddit Search: claude code",
    url: "https://www.reddit.com/search/.rss?q=claude+code&sort=new",
    tags: ["reddit", "claude", "coding", "ai", "search"],
  },
  // AI coding tools specific
  {
    name: "Reddit Search: Claude AI",
    url: "https://www.reddit.com/search/.rss?q=claude+ai+coding&sort=new",
    tags: ["reddit", "claude", "ai-coding", "search"],
  },
  {
    name: "Reddit Search: Cursor IDE",
    url: "https://www.reddit.com/search/.rss?q=cursor+ide&sort=new",
    tags: ["reddit", "cursor", "ai-coding", "search"],
  },
  {
    name: "Reddit Search: GitHub Copilot tips",
    url: "https://www.reddit.com/search/.rss?q=github+copilot+tips&sort=new",
    tags: ["reddit", "copilot", "ai-coding", "search"],
  },
  {
    name: "Reddit Search: prompt engineering",
    url: "https://www.reddit.com/search/.rss?q=prompt+engineering&sort=new",
    tags: ["reddit", "prompt-eng", "llm", "search"],
  },
  {
    name: "Reddit Search: LLM agents",
    url: "https://www.reddit.com/search/.rss?q=llm+agents&sort=new",
    tags: ["reddit", "agents", "llm", "search"],
  },
  {
    name: "Reddit Search: RAG systems",
    url: "https://www.reddit.com/search/.rss?q=RAG+retrieval+augmented&sort=new",
    tags: ["reddit", "rag", "llm", "search"],
  },
  {
    name: "V2EX Tech",
    url: "https://www.v2ex.com/feed/tab/tech.xml",
    tags: ["v2ex", "chinese", "ai", "developer"],
  },
  {
    name: "Together AI",
    url: "https://www.together.ai/blog/rss.xml",
    tags: ["ai frontier", "togetherai", "ai"],
  },
  {
    name: "Google Research",
    url: "https://research.google/blog/rss/",
    tags: ["ai frontier", "googleresearch", "ai"],
  },
  {
    name: "Google DeepMind",
    url: "https://deepmind.google/blog/rss.xml",
    tags: ["ai frontier", "googledeepmind", "ai"],
  },
  // AI Agent Frameworks
  {
    name: "LangChain Docs & Updates",
    url: "https://github.com/langchain-ai/langchain/releases.atom",
    tags: ["langchain", "agents", "llm-framework"],
  },
  {
    name: "LangGraph Releases",
    url: "https://github.com/langchain-ai/langgraph/releases.atom",
    tags: ["langgraph", "agents", "llm-framework"],
  },
  {
    name: "CrewAI Framework",
    url: "https://github.com/joaomdmoura/crewai/releases.atom",
    tags: ["crewai", "agents", "llm-framework"],
  },
  {
    name: "Dify Releases",
    url: "https://github.com/langgenius/dify/releases.atom",
    tags: ["dify", "agents", "llm-framework"],
  },
  {
    name: "LiteLLM Releases",
    url: "https://github.com/BerriAI/litellm/releases.atom",
    tags: ["litellm", "llm-framework", "infra"],
  },
  {
    name: "vLLM Releases",
    url: "https://github.com/vllm-project/vllm/releases.atom",
    tags: ["vllm", "inference", "infra"],
  },
  {
    name: "Ollama Releases",
    url: "https://github.com/ollama/ollama/releases.atom",
    tags: ["ollama", "local-ai", "infra"],
  },
  // AI Research & Leaders
  {
    name: "Anthropic Research",
    url: "https://www.anthropic.com/research",
    tags: ["anthropic", "research", "ai"],
    // Team pages share the prefix and are navigation, not publications.
    html: {
      hrefPrefix: "/research/",
      baseUrl: "https://www.anthropic.com",
      excludePrefix: "/research/team/",
    },
  },
  {
    name: "Latent Space",
    url: "https://latent.space/feed",
    tags: ["ai-engineering", "agents", "research"],
  },
  {
    name: "Ahead of AI (Sebastian Raschka)",
    url: "https://magazine.sebastianraschka.com/feed",
    tags: ["ai", "llm", "research"],
  },
  {
    name: "Last Week in AI",
    url: "https://lastweekin.ai/feed",
    tags: ["ai", "news", "research"],
  },
  // Data Science & Analytics (IA-focused)
  {
    name: "Towards Data Science (Medium)",
    url: "https://towardsdatascience.com/feed",
    tags: ["medium", "data", "ai", "ml"],
  },
  {
    name: "AWS Machine Learning Blog",
    url: "https://aws.amazon.com/blogs/machine-learning/feed/",
    tags: ["aws", "ml", "ai", "bedrock"],
  },
  // News & Aggregators
  {
    name: "MarkTechPost",
    url: "https://www.marktechpost.com/feed/",
    tags: ["news", "ai", "papers"],
  },
  {
    name: "MIT Technology Review (AI)",
    url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/",
    tags: ["news", "ai", "policy"],
  },
  {
    name: "Ben's Bites",
    url: "https://www.bensbites.com/feed",
    tags: ["news", "ai", "products"],
  },
  {
    name: "Meta Engineering",
    url: "https://engineering.fb.com/feed/",
    tags: ["meta", "ai", "engineering"],
  },
  // Product showcase
  {
    name: "Product Hunt (AI category)",
    url: "https://www.producthunt.com/feed?category=artificial-intelligence",
    tags: ["producthunt", "ai", "products"],
  },
];
