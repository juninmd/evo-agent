export const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,800;1,8..60,400&family=IBM+Plex+Mono:wght@400;500&display=swap";

const DARK =
  "--paper:#171716;--paper-2:#21211f;--ink:#e7e4dc;--ink-soft:#a9a59b;--rule:#e7e4dc;--hair:#45443f;--accent:#e0695c;";

export const NEWSPAPER_CSS = `
:root{--paper:#eceae4;--paper-2:#e2dfd7;--ink:#1a1a19;--ink-soft:#4a4944;--rule:#1a1a19;--hair:#b9b5aa;--accent:#a3261b;
--display:"UnifrakturMaguntia","Old English Text MT",Georgia,serif;
--serif:"Source Serif 4",Georgia,"Times New Roman",serif;
--mono:"IBM Plex Mono",ui-monospace,"Cascadia Mono",Consolas,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${DARK}}}
:root[data-theme="dark"]{${DARK}}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--serif);font-size:16px;line-height:1.5;padding-inline:16px;padding-block:24px 48px}
.sheet{max-width:1180px;margin:0 auto}
a{color:inherit;text-decoration-color:var(--hair);text-underline-offset:3px}
a:hover{text-decoration-color:var(--accent)}
a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
code{font-family:var(--mono);font-size:.88em;background:var(--paper-2);padding:0 3px}
.ears{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-soft)}
.flag{text-align:center;font-family:var(--display);font-weight:400;font-size:clamp(44px,9vw,104px);line-height:1;margin:10px 0 6px}
.dateline{display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px 18px;border-top:3px double var(--rule);border-bottom:1px solid var(--rule);padding:6px 2px;font-family:var(--mono);font-size:12px;font-variant-numeric:tabular-nums}
.lead{display:grid;grid-template-columns:1.7fr 1fr;gap:28px;padding:22px 0;border-bottom:1px solid var(--rule)}
.kicker{font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin:0 0 6px}
.lead h1{font-weight:800;font-size:clamp(30px,4.6vw,54px);line-height:1.04;margin:0 0 12px;text-wrap:balance;letter-spacing:-.01em;overflow-wrap:anywhere}
.dek{font-style:italic;font-size:19px;color:var(--ink-soft);margin:0 0 14px;text-wrap:pretty}
.also{list-style:none;padding:0;margin:0 0 14px;font-size:15px}
.also li{padding:4px 0;border-top:1px dotted var(--hair)}
.sidebar{border-left:1px solid var(--hair);padding-left:24px}
.sidebar h2,.desk>h2,.backroom h2{font-family:var(--mono);font-size:13px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;margin:0 0 10px}
.tldr{padding-left:22px;margin:0 0 16px;font-size:15px}
.tldr li{margin-bottom:6px}
.tldr li::marker{font-family:var(--mono);color:var(--accent);font-size:12px}
.watch{border-top:2px solid var(--rule);padding-top:10px}
.watch p{font-style:italic;margin:0 0 8px}
figure{margin:0 0 12px;background:var(--paper-2);border:1px solid var(--hair)}
figure a{display:block;line-height:0}
figure img{display:block;width:100%;height:auto;max-width:100%;aspect-ratio:1200/630;object-fit:cover;filter:grayscale(1) contrast(1.08);mix-blend-mode:multiply;transition:filter .3s}
figure a:hover img,figure a:focus-visible img{filter:none}
figcaption{font-family:var(--mono);font-size:11px;color:var(--ink-soft);padding:5px 8px;border-top:1px solid var(--hair);line-height:1.4}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0 28px}
.desk{padding:18px 0 8px;border-bottom:1px solid var(--hair);min-width:0}
.desk>h2{border-top:3px solid var(--rule);padding-top:6px;display:flex;justify-content:space-between;gap:8px}
.desk>h2 span{color:var(--ink-soft)}
.note h3{font-size:18px;line-height:1.2;margin:0 0 3px;font-weight:600;text-wrap:balance;overflow-wrap:anywhere}
.note p{margin:0 0 12px;color:var(--ink-soft);font-size:15px}
.meta{font-family:var(--mono);font-size:11.5px;color:var(--ink-soft)}
.meta b{color:var(--accent);font-weight:500;font-variant-numeric:tabular-nums}
.brief{list-style:none;padding:0;margin:0}
.brief li{padding:7px 0;border-top:1px dotted var(--hair);font-size:15px;overflow-wrap:anywhere}
.brief li:first-child{border-top:0}
.backroom{background:var(--paper-2);padding:16px 18px;margin-top:22px;border-top:3px solid var(--rule)}
.backroom p{margin:0;max-width:72ch}
footer{margin-top:18px;font-family:var(--mono);font-size:11px;color:var(--ink-soft);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;border-top:3px double var(--rule);padding-top:8px}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) figure img{mix-blend-mode:normal;opacity:.9}}
:root[data-theme="dark"] figure img{mix-blend-mode:normal;opacity:.9}
@media (prefers-reduced-motion:reduce){figure img{transition:none}}
@media (max-width:900px){.lead{grid-template-columns:1fr}.sidebar{border-left:0;padding-left:0}.grid{grid-template-columns:1fr 1fr}}
@media (max-width:620px){.grid{grid-template-columns:1fr}}
`;
