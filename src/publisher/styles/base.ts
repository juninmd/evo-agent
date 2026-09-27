/**
 * Two accents carry meaning, not decoration: --accent marks primary sources
 * and navigation, --signal marks community signals.
 */
const DARK_TOKENS = `
  color-scheme: dark;
  --bg: #0f141b;
  --surface: #161d27;
  --text: #e4e9f0;
  --muted: #93a0b2;
  --line: #26303d;
  --accent: #8fa0ff;
  --signal: #e9a04a;
  --code: #121821;
`;

export const baseCss = `:root {
  color-scheme: light;
  --bg: #f3f5f8;
  --surface: #ffffff;
  --text: #16202c;
  --muted: #5a6576;
  --line: #d6dce4;
  --accent: #2d46d6;
  --signal: #a85b06;
  --code: #eef1f6;
  --sans: "Schibsted Grotesk", "Segoe UI", system-ui, sans-serif;
  --serif: "Literata", Georgia, Cambria, serif;
  --mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
  --max: 1180px;
  --measure: 68ch;
}

:root[data-theme="dark"] {${DARK_TOKENS}}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {${DARK_TOKENS}}
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 88px; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--serif);
  line-height: 1.7;
  margin: 0;
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; }

h1, h2, h3, h4 {
  font-family: var(--sans);
  letter-spacing: -0.01em;
}

.site-header {
  align-items: center;
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
  display: flex;
  gap: 16px;
  justify-content: space-between;
  padding: 14px clamp(16px, 4vw, 48px);
  position: sticky;
  top: 0;
  z-index: 10;
}

.brand {
  font-family: var(--sans);
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-decoration: none;
}

.brand::before {
  background: var(--accent);
  border-radius: 3px;
  content: "";
  display: inline-block;
  height: 0.7em;
  margin-right: 8px;
  width: 0.7em;
}

.site-header nav {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  font-family: var(--sans);
  font-size: 0.92rem;
  gap: 4px 18px;
}

.site-header nav a {
  color: var(--muted);
  text-decoration: none;
}

.site-header nav a:hover { color: var(--text); }

.theme-toggle,
.show-more {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--text);
  cursor: pointer;
  font-family: var(--sans);
  font-size: 0.88rem;
  padding: 6px 12px;
}

.theme-toggle:hover,
.show-more:hover {
  border-color: var(--accent);
  color: var(--accent);
}

main {
  margin: 0 auto;
  max-width: var(--max);
  padding: clamp(28px, 5vw, 64px) clamp(16px, 4vw, 44px) 96px;
}

.empty-state {
  border: 1px dashed var(--line);
  border-radius: 8px;
  color: var(--muted);
  padding: 24px;
}

.back-to-top {
  background: var(--text);
  border: 0;
  border-radius: 8px;
  bottom: 24px;
  color: var(--bg);
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 700;
  height: 44px;
  opacity: 0;
  pointer-events: none;
  position: fixed;
  right: 24px;
  transition: opacity 160ms ease;
  width: 44px;
  z-index: 15;
}

.back-to-top.visible {
  opacity: 1;
  pointer-events: auto;
}

.skip-link {
  background: var(--accent);
  border-radius: 0 0 8px 0;
  color: var(--surface);
  font-family: var(--sans);
  font-weight: 700;
  left: 0;
  padding: 10px 16px;
  position: absolute;
  top: -100px;
  transition: top 0.15s ease;
  z-index: 20;
}

.skip-link:focus { top: 0; }

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  * { transition: none !important; }
}

@media (max-width: 640px) {
  .site-header { align-items: flex-start; flex-direction: column; gap: 8px; }
}
`;
