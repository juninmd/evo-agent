export const codeCss = `.article-content code {
  background: var(--code);
  border-radius: 4px;
  font-family: var(--mono);
  font-size: 0.86em;
  padding: 0.1em 0.35em;
}

.article-content .highlight,
.article-content div[class*="language-"] {
  margin: 28px 0;
  position: relative;
}

.language-label {
  color: var(--muted);
  display: block;
  font-family: var(--sans);
  font-size: 0.8rem;
  margin-bottom: 6px;
}

.article-content pre {
  background: var(--code);
  border: 1px solid var(--line);
  border-radius: 8px;
  line-height: 1.6;
  margin: 0;
  overflow-x: auto;
  padding: 20px;
  position: relative;
  tab-size: 2;
  -moz-tab-size: 2;
}

.article-content pre code {
  background: transparent;
  border-radius: 0;
  color: var(--text);
  display: block;
  font-size: 0.88rem;
  padding: 0;
  white-space: pre;
}

.copy-btn {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--muted);
  cursor: pointer;
  font-family: var(--sans);
  font-size: 0.78rem;
  font-weight: 600;
  opacity: 0;
  padding: 4px 9px;
  position: absolute;
  right: 8px;
  top: 8px;
  transition: opacity 0.18s ease;
  z-index: 1;
}

pre:hover .copy-btn,
.copy-btn:focus-visible,
.copy-btn.copied { opacity: 1; }

.copy-btn:hover,
.copy-btn.copied { border-color: var(--accent); color: var(--accent); }

@media (hover: none) {
  .copy-btn { opacity: 1; }
}

.article-content .mermaid-wrapper {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  margin: 32px 0;
  overflow-x: auto;
  padding: 16px 8px;
  -webkit-overflow-scrolling: touch;
}

.article-content pre.mermaid,
.article-content .mermaid {
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  display: flex !important;
  justify-content: center !important;
  margin: 0 !important;
  min-width: 720px;
  padding: 0 !important;
  text-align: center;
}

.article-content .mermaid svg {
  height: auto !important;
  max-width: 100% !important;
}

.article-content table {
  border-collapse: collapse;
  display: block;
  font-family: var(--sans);
  font-size: 0.94rem;
  margin: 28px 0;
  overflow-x: auto;
  width: 100%;
}

.article-content th,
.article-content td {
  border-bottom: 1px solid var(--line);
  padding: 10px 14px;
  text-align: left;
  vertical-align: top;
}

.article-content th {
  border-bottom: 2px solid var(--text);
  color: var(--text);
  font-weight: 700;
}

.article-content tr:hover td {
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}

.hljs,
.highlight .nx { color: var(--text); background: transparent; }
.hljs-keyword,
.hljs-selector-tag,
.hljs-section,
.hljs-title.class_,
.highlight .kd,
.highlight .kc,
.highlight .kn { color: var(--accent); }
.hljs-string,
.hljs-selector-attr,
.hljs-selector-pseudo,
.hljs-addition,
.highlight .s1,
.highlight .s2,
.highlight .sr { color: var(--signal); }
.hljs-comment,
.hljs-quote,
.highlight .c1,
.highlight .cm { color: var(--muted); font-style: italic; }
.hljs-title.function_,
.hljs-title,
.highlight .nf,
.highlight .nc { color: color-mix(in srgb, var(--accent) 80%, var(--text)); }
.hljs-built_in,
.hljs-literal,
.hljs-type,
.hljs-params,
.highlight .nb,
.highlight .kt,
.highlight .no { color: color-mix(in srgb, var(--signal) 75%, var(--text)); }
.hljs-number,
.hljs-attr,
.hljs-attribute,
.highlight .mi,
.highlight .mh,
.highlight .mf { color: var(--accent); }
.hljs-meta,
.hljs-tag,
.highlight .o,
.highlight .p,
.highlight .dl { color: var(--muted); }
.hljs-deletion,
.highlight .err { color: var(--signal); }
.highlight .gh { color: var(--accent); font-weight: 700; }
.highlight .gu { color: var(--accent); }
.highlight .ge { font-style: italic; }
.highlight .gs { font-weight: 700; }
`;
