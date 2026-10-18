flowchart TD
    subgraph Crawler
        RSS[RSS Feeds]
        GN[Google News]
        SX[SearXNG]
        RC[Reddit Community Signals]
    end

    Crawler -->|articles, signals| SQLite[(SQLite)]
    SQLite -->|context| Improver[Agent Improver]
    Improver -->|system prompt, keywords| SQLite
    SQLite -->|recent articles, snippets| Writer[Article Writer]
    Writer -->|markdown content| Publisher[GitHub Pages Publisher]
    Publisher -->|Jekyll assets, markdown| GH[gh-pages branch]
    Publisher -->|published URL| Notifier[Telegram Notifier]
