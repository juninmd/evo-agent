/**
 * Intelligence ranking rendered by renderIntelligenceRanking. Scoped under
 * .article-content so it beats the generic table rules in code.ts.
 */
export const rankingCss = `.visually-hidden {
  clip: rect(0 0 0 0);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}

.article-content .ranking-status {
  color: var(--muted);
  font-family: var(--sans);
  font-size: 0.95rem;
}

.article-content .ranking { margin: 20px 0 8px; }

.article-content .ranking-table {
  border-collapse: collapse;
  display: table;
  font-family: var(--sans);
  margin: 0;
  width: 100%;
}

.article-content .ranking-table thead th {
  border: 0;
  border-bottom: 2px solid var(--text);
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0 10px 8px;
}

.article-content .ranking-table td,
.article-content .ranking-table tbody th {
  background: none;
  border: 0;
  border-bottom: 1px solid var(--line);
  padding: 9px 10px;
  vertical-align: middle;
}

.article-content .ranking-table tbody th { font-weight: 600; white-space: nowrap; }
.article-content .ranking-table tr:hover td { background: none; }

.article-content .ranking-table .rank {
  color: var(--muted);
  text-align: right;
  width: 2.2em;
}

.article-content .ranking-table .creator { color: var(--muted); white-space: nowrap; }
.article-content .ranking-table .score { width: 42%; }

.article-content .ranking-table .score-cell {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr 2.6em;
}

.article-content .ranking-table .bar-track { display: block; }

.article-content .ranking-table .bar {
  background: color-mix(in srgb, var(--accent) 70%, transparent);
  border-radius: 3px;
  display: block;
  height: 12px;
  width: var(--w);
}

.article-content .ranking-table tbody tr:first-child .bar { background: var(--accent); }
.article-content .ranking-table .value { font-weight: 700; text-align: right; }
.article-content .ranking-table .change { font-size: 0.88rem; white-space: nowrap; }

.open-mark,
.legend-open::before {
  background: var(--signal);
  border-radius: 50%;
  content: "";
  display: inline-block;
  height: 8px;
  width: 8px;
}

.open-mark { margin-left: 6px; vertical-align: 0.1em; }
.legend-open::before { margin-right: 6px; }

.rank-delta { font-weight: 700; }
.rank-delta.is-up { color: var(--accent); }
.rank-delta.is-down { color: var(--muted); }

.rank-delta.is-new {
  border: 1px solid var(--accent);
  border-radius: 4px;
  color: var(--accent);
  font-size: 0.78rem;
  padding: 0 5px;
}

.score-delta { color: var(--muted); }

.article-content .ranking figcaption {
  color: var(--muted);
  display: flex;
  flex-wrap: wrap;
  font-family: var(--sans);
  font-size: 0.85rem;
  gap: 6px 18px;
  margin-top: 12px;
}

@media (max-width: 560px) {
  .article-content .ranking-table thead {
    clip: rect(0 0 0 0);
    height: 1px;
    overflow: hidden;
    position: absolute;
    width: 1px;
  }

  .article-content .ranking-table tr {
    align-items: center;
    border-bottom: 1px solid var(--line);
    column-gap: 10px;
    display: grid;
    grid-template-columns: 1.8em minmax(0, 1fr) auto auto;
    padding: 10px 0;
  }

  .article-content .ranking-table td,
  .article-content .ranking-table tbody th { border: 0; padding: 0; }

  .article-content .ranking-table .rank { width: auto; }
  .article-content .ranking-table .creator { display: none; }
  .article-content .ranking-table tbody th { white-space: normal; }

  .article-content .ranking-table td.score,
  .article-content .ranking-table .score-cell { display: contents; }

  .article-content .ranking-table .value { grid-column: 4; grid-row: 1; }
  .article-content .ranking-table .change { grid-column: 3; grid-row: 1; }

  .article-content .ranking-table .bar-track {
    grid-column: 2 / -1;
    grid-row: 2;
    margin-top: 6px;
  }
}
`;
