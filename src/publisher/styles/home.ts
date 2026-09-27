export const homeCss = `.masthead {
  border-bottom: 1px solid var(--line);
  margin-bottom: 36px;
  padding-bottom: 28px;
}

.masthead h1 {
  font-size: clamp(2rem, 4.5vw, 3.2rem);
  letter-spacing: -0.03em;
  line-height: 1.05;
  margin: 0 0 12px;
}

.lede {
  color: var(--muted);
  font-size: clamp(1.05rem, 1.6vw, 1.2rem);
  margin: 0;
  max-width: 62ch;
}

.masthead-count {
  color: var(--muted);
  font-family: var(--sans);
  font-size: 0.92rem;
  margin: 14px 0 0;
}

.masthead-count strong { color: var(--text); }

.section-label {
  color: var(--muted);
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 14px;
}

.edition-date {
  display: grid;
  font-family: var(--sans);
  justify-items: start;
  line-height: 1;
}

.edition-day {
  color: var(--accent);
  font-size: clamp(4.5rem, 11vw, 8.5rem);
  font-weight: 800;
  letter-spacing: -0.06em;
}

.edition-month {
  color: var(--muted);
  font-size: 1rem;
  font-weight: 600;
  margin-top: 6px;
}

.latest { margin-bottom: 56px; }

.latest-card {
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  display: grid;
  gap: clamp(20px, 4vw, 48px);
  grid-template-columns: auto 1fr;
  padding: clamp(22px, 4vw, 40px);
  text-decoration: none;
}

.latest-card:hover { border-color: var(--accent); }

.latest-card h3 {
  font-size: clamp(1.5rem, 3vw, 2.3rem);
  line-height: 1.15;
  margin: 0 0 12px;
}

.latest-card p {
  color: var(--muted);
  margin: 0;
  max-width: 62ch;
}

.latest-card .read-cta {
  color: var(--accent);
  display: inline-block;
  font-family: var(--sans);
  font-weight: 600;
  margin-top: 16px;
}

.home-grid {
  display: grid;
  gap: 56px;
  grid-template-columns: 280px minmax(0, 1fr);
}

.home-aside section + section { margin-top: 44px; }

.home-aside h2,
.archive > h2 {
  font-size: 1.35rem;
  margin: 0 0 6px;
}

.aside-note {
  color: var(--muted);
  font-family: var(--sans);
  font-size: 0.9rem;
  margin: 0 0 16px;
}

.report-list {
  border-top: 1px solid var(--line);
  list-style: none;
  margin: 0;
  padding: 0;
}

.report-list li { border-bottom: 1px solid var(--line); }

.report-list a {
  display: flex;
  font-family: var(--sans);
  gap: 12px;
  justify-content: space-between;
  padding: 10px 2px;
  text-decoration: none;
}

.report-list a:hover { color: var(--accent); }
.report-list time { color: var(--muted); font-variant-numeric: tabular-nums; }

.ebook-link {
  border-left: 3px solid var(--accent);
  display: block;
  padding: 4px 0 4px 14px;
  text-decoration: none;
}

.ebook-link strong {
  display: block;
  font-family: var(--sans);
  line-height: 1.3;
}

.ebook-link:hover strong { color: var(--accent); }

.ebook-link span {
  color: var(--muted);
  display: block;
  font-size: 0.95rem;
  margin-top: 6px;
}

.search-box { margin: 18px 0 14px; }

.search-box input {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--text);
  font-family: var(--sans);
  font-size: 1rem;
  padding: 12px 14px;
  width: 100%;
}

.search-box input:focus-visible { border-color: var(--accent); outline-offset: 0; }

.search-empty { color: var(--muted); margin-top: 12px; }

.archive-jump {
  display: flex;
  flex-wrap: wrap;
  font-family: var(--sans);
  font-size: 0.88rem;
  gap: 4px 14px;
  margin-bottom: 8px;
}

.archive-jump a { color: var(--muted); }
.archive-jump a:hover { color: var(--accent); }

.month-group { padding-top: 32px; }

.month-heading {
  align-items: baseline;
  border-bottom: 2px solid var(--text);
  display: flex;
  justify-content: space-between;
  padding-bottom: 8px;
}

.month-heading h2 {
  font-size: 1.5rem;
  margin: 0;
}

.month-heading h2 span { color: var(--muted); font-weight: 500; }

.month-heading p {
  color: var(--muted);
  font-family: var(--sans);
  font-size: 0.9rem;
  margin: 0;
}

.story-card {
  border-bottom: 1px solid var(--line);
  display: grid;
  gap: 20px;
  grid-template-columns: 64px minmax(0, 1fr);
  padding: 20px 0;
}

.story-card > time {
  color: var(--muted);
  font-family: var(--sans);
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  padding-top: 4px;
}

.story-card h3 {
  font-size: 1.2rem;
  line-height: 1.3;
  margin: 0 0 6px;
}

.story-card h3 a { text-decoration: none; }
.story-card h3 a:hover { color: var(--accent); text-decoration: underline; }

.story-card p {
  color: var(--muted);
  margin: 0;
  max-width: 72ch;
}

.story-card .story-tags {
  font-family: var(--sans);
  font-size: 0.85rem;
  margin-top: 8px;
}

.show-more { margin-top: 14px; }

@media (max-width: 900px) {
  .home-grid { gap: 44px; grid-template-columns: 1fr; }
}

@media (max-width: 560px) {
  .latest-card { grid-template-columns: 1fr; }
  .story-card { gap: 4px; grid-template-columns: 1fr; }
}
`;
