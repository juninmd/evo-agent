export const articleCss = `.article-shell {
  margin: 0 auto;
  max-width: 1120px;
}

.back-link {
  color: var(--muted);
  display: inline-block;
  font-family: var(--sans);
  font-size: 0.92rem;
  margin-bottom: 28px;
  text-decoration: none;
}

.back-link:hover { color: var(--accent); }

.article-hero {
  border-bottom: 2px solid var(--text);
  margin-bottom: 40px;
  padding-bottom: 32px;
}

.article-masthead {
  align-items: start;
  display: grid;
  gap: clamp(20px, 4vw, 52px);
  grid-template-columns: auto minmax(0, 1fr);
}

.article-masthead .edition-day { font-size: clamp(4rem, 9vw, 7.5rem); }

.article-hero h1 {
  font-size: clamp(1.9rem, 3.6vw, 3rem);
  letter-spacing: -0.025em;
  line-height: 1.12;
  margin: 0 0 16px;
  max-width: 28ch;
}

.article-summary {
  color: var(--muted);
  font-size: 1.15rem;
  margin: 0;
  max-width: 62ch;
}

.article-meta {
  align-items: center;
  color: var(--muted);
  display: flex;
  flex-wrap: wrap;
  font-family: var(--sans);
  font-size: 0.92rem;
  gap: 10px 20px;
  margin-top: 22px;
}

.download-md {
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--text);
  font-weight: 600;
  padding: 6px 12px;
  text-decoration: none;
}

.download-md:hover { border-color: var(--accent); color: var(--accent); }

.article-tags {
  color: var(--muted);
  font-family: var(--sans);
  font-size: 0.88rem;
  margin: 14px 0 0;
}

.article-body {
  display: grid;
  gap: 56px;
  grid-template-columns: 230px minmax(0, var(--measure));
}

.article-body:not(:has(.article-toc:not([hidden]))) {
  grid-template-columns: minmax(0, var(--measure));
  justify-content: center;
}

.article-toc {
  align-self: start;
  font-family: var(--sans);
  font-size: 0.88rem;
  max-height: calc(100vh - 110px);
  overflow-y: auto;
  position: sticky;
  top: 88px;
}

.article-toc summary {
  cursor: pointer;
  font-weight: 700;
  margin-bottom: 10px;
}

.article-toc ul {
  border-left: 1px solid var(--line);
  list-style: none;
  margin: 0;
  padding: 0;
}

.article-toc a {
  border-left: 2px solid transparent;
  color: var(--muted);
  display: block;
  line-height: 1.35;
  margin-left: -1px;
  padding: 5px 0 5px 12px;
  text-decoration: none;
}

.article-toc .toc-h2 > a { color: var(--text); font-weight: 600; margin-top: 8px; }
.article-toc .toc-h4 > a { padding-left: 22px; }
.article-toc a:hover { color: var(--accent); }

.article-toc a[aria-current="true"] {
  border-left-color: var(--accent);
  color: var(--accent);
}

.toc-legend {
  color: var(--muted);
  display: grid;
  gap: 4px;
  margin: 16px 0 0;
}

.toc-legend span::before,
.source-line::before {
  border-radius: 50%;
  content: "";
  display: inline-block;
  height: 8px;
  margin-right: 8px;
  vertical-align: 0.08em;
  width: 8px;
}

.toc-legend .is-primary::before,
.source-line.is-primary::before { background: var(--accent); }

.toc-legend .is-community::before,
.source-line.is-community::before { background: var(--signal); }

.source-line:not(.is-primary):not(.is-community)::before { display: none; }

.article-content {
  font-size: 1.08rem;
  min-width: 0;
}

.article-content > h1 { display: none; }

.article-content > h1 + p {
  color: var(--muted);
  font-family: var(--sans);
  font-size: 0.95rem;
  margin-top: 0;
}

.article-content > h1 + p strong { color: var(--text); }

.article-content h2 {
  border-top: 2px solid var(--text);
  font-size: 1.55rem;
  line-height: 1.2;
  margin: 2.6em 0 0.8em;
  padding-top: 14px;
}

.article-content > h2:first-of-type { margin-top: 1.6em; }

.article-content h3 {
  font-size: 1.2rem;
  line-height: 1.25;
  margin: 2em 0 0.6em;
}

.article-content h3:has(+ h4) {
  color: var(--accent);
  font-size: 1rem;
  margin-bottom: 0;
}

.article-content h4 {
  border-top: 1px solid var(--line);
  font-size: 1.28rem;
  line-height: 1.3;
  margin: 1.4em 0 0.5em;
  padding-top: 1.1em;
}

.article-content h3 + h4 { border-top: 0; padding-top: 0.2em; }

.article-content p,
.article-content li { color: color-mix(in srgb, var(--text) 88%, var(--muted)); }

.article-content h2 + ul {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  list-style: none;
  padding: 6px 22px;
}

.article-content h2 + ul > li { padding: 12px 0; }
.article-content h2 + ul > li + li { border-top: 1px solid var(--line); }
.article-content h2 + ul strong { color: var(--text); font-family: var(--sans); }

.article-content .source-line,
.article-content p:has(> em:only-child > a) {
  color: var(--muted);
  font-family: var(--sans);
  font-size: 0.88rem;
}

.article-content .source-line em { font-style: normal; }
.article-content .source-line a { color: var(--text); text-underline-offset: 3px; }
.article-content .source-line a:hover { color: var(--accent); }

.article-content a { text-underline-offset: 3px; }
.article-content p a:hover,
.article-content li a:hover { color: var(--accent); }

.article-content hr {
  border: 0;
  border-top: 1px solid var(--line);
  margin: 40px 0;
}

.article-content img {
  border: 1px solid var(--line);
  border-radius: 8px;
  display: block;
  height: auto;
  margin: 28px auto;
  max-height: 70vh;
  max-width: 100%;
}

.article-content blockquote {
  border-left: 3px solid var(--accent);
  color: var(--muted);
  margin: 28px 0;
  padding: 2px 0 2px 20px;
}

@media (max-width: 1000px) {
  .article-body,
  .article-body:not(:has(.article-toc:not([hidden]))) {
    display: block;
  }

  .article-toc {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 10px;
    margin-bottom: 32px;
    max-height: none;
    padding: 14px 18px;
    position: static;
  }

  .article-toc summary { margin-bottom: 0; }
  .article-toc[open] summary { margin-bottom: 10px; }
}

@media (max-width: 560px) {
  .article-masthead { grid-template-columns: 1fr; gap: 8px; }
  .article-masthead .edition-date { display: flex; gap: 10px; align-items: baseline; }
  .article-masthead .edition-day { font-size: 3rem; }
}
`;
