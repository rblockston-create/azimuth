:root {
  /* Instrument panel, not office whiteboard. */
  --slate-900: #0d1319;
  --slate-800: #131c24;
  --slate-700: #1c2831;
  --slate-600: #2a3a46;
  --chart:     #f2ecdd;  /* chart paper — the drawing surface */
  --graticule: #d3c8b0;
  --brass:     #c8963e;  /* the one accent; spend it carefully */
  --ink:       #16202a;
  --mist:      #8fa0ad;
  --alert:     #b0544c;

  --font-display: 'Space Grotesk', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --rail: 56px;
}

* { box-sizing: border-box; }

html, body, #root {
  height: 100%;
  margin: 0;
}

body {
  font-family: var(--font-display);
  background: var(--slate-900);
  color: #e6ecf1;
  -webkit-font-smoothing: antialiased;
}

button {
  font: inherit;
  cursor: pointer;
  border: none;
  background: none;
  color: inherit;
}

input {
  font: inherit;
  color: inherit;
}

:focus-visible {
  outline: 2px solid var(--brass);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}

/* ---------- wordmark ---------- */
.wordmark {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  font-size: 13px;
}
.wordmark .rose {
  width: 18px;
  height: 18px;
  flex: none;
  color: var(--brass);
}

/* ---------- auth ---------- */
.auth {
  min-height: 100%;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(1100px 600px at 50% -10%, #1b2a35 0%, transparent 60%),
    var(--slate-900);
}
.auth-card {
  width: 100%;
  max-width: 380px;
}
.auth-card h1 {
  font-size: 30px;
  margin: 22px 0 4px;
  letter-spacing: -0.01em;
}
.auth-card p.lede {
  color: var(--mist);
  margin: 0 0 28px;
  font-size: 14px;
}
.field { margin-bottom: 14px; }
.field label {
  display: block;
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--mist);
  margin-bottom: 6px;
}
.field input {
  width: 100%;
  padding: 11px 12px;
  background: var(--slate-800);
  border: 1px solid var(--slate-600);
  border-radius: 4px;
}
.field input:focus { border-color: var(--brass); outline: none; }

.btn {
  width: 100%;
  padding: 12px;
  background: var(--brass);
  color: var(--slate-900);
  font-weight: 700;
  border-radius: 4px;
  letter-spacing: 0.02em;
}
.btn:hover { filter: brightness(1.08); }
.btn.ghost {
  background: transparent;
  color: #e6ecf1;
  border: 1px solid var(--slate-600);
  font-weight: 500;
}
.btn.ghost:hover { border-color: var(--brass); filter: none; }
.btn.small { width: auto; padding: 8px 14px; font-size: 13px; }

.error {
  color: var(--alert);
  font-size: 13px;
  margin: 0 0 14px;
  font-family: var(--font-mono);
}

/* ---------- boards index ---------- */
.shell { max-width: 900px; margin: 0 auto; padding: 40px 24px 80px; }
.shell header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--slate-700);
}
.shell h2 {
  font-size: 13px;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--mist);
  font-weight: 400;
  margin: 36px 0 12px;
}
.who { display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--mist); }
.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }

.new-board { display: flex; gap: 8px; margin-top: 4px; }
.new-board input {
  flex: 1;
  padding: 11px 12px;
  background: var(--slate-800);
  border: 1px solid var(--slate-600);
  border-radius: 4px;
}
.new-board input:focus { border-color: var(--brass); outline: none; }

.board-list { list-style: none; padding: 0; margin: 0; }
.board-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 15px 4px;
  border-bottom: 1px solid var(--slate-700);
}
.board-row a {
  color: inherit;
  text-decoration: none;
  font-size: 17px;
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.board-row a:hover { color: var(--brass); }
.board-row .meta {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--mist);
  white-space: nowrap;
}
.board-row .kill { color: var(--mist); padding: 4px 6px; font-size: 13px; }
.board-row .kill:hover { color: var(--alert); }

.empty {
  padding: 44px 0;
  color: var(--mist);
  font-size: 14px;
}

/* ---------- board view ---------- */
.board {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--slate-900);
}
.board-bar {
  height: var(--rail);
  flex: none;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 14px;
  background: var(--slate-800);
  border-bottom: 1px solid var(--slate-700);
}
.board-bar .back { color: var(--mist); font-size: 18px; padding: 4px 8px; }
.board-bar .back:hover { color: var(--brass); }
.board-title {
  font-weight: 500;
  font-size: 15px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 6px 8px;
  min-width: 120px;
  flex: 1;
}
.board-title:hover { border-color: var(--slate-600); }
.board-title:focus { border-color: var(--brass); outline: none; background: var(--slate-900); }

.peers { display: flex; align-items: center; gap: -6px; }
.peer {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--slate-900);
  border: 2px solid var(--slate-800);
  margin-left: -6px;
}
.link-state {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--mist);
  display: flex;
  align-items: center;
  gap: 6px;
}

.stage { flex: 1; position: relative; overflow: hidden; }
.stage canvas { display: block; touch-action: none; }

/* toolbar */
.tools {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  background: var(--slate-800);
  border: 1px solid var(--slate-700);
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
}
.tool {
  width: 38px;
  height: 38px;
  border-radius: 5px;
  display: grid;
  place-items: center;
  color: var(--mist);
}
.tool:hover { background: var(--slate-700); color: #e6ecf1; }
.tool[aria-pressed='true'] { background: var(--brass); color: var(--slate-900); }
.tool-sep { height: 1px; background: var(--slate-700); margin: 5px 4px; }

.swatches {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
  padding-top: 3px;
}
.swatch {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid transparent;
}
.swatch[aria-pressed='true'] { border-color: #e6ecf1; }

.widths { display: flex; flex-direction: column; gap: 4px; align-items: center; padding-top: 4px; }
.width-btn { width: 26px; height: 20px; display: grid; place-items: center; border-radius: 4px; }
.width-btn:hover { background: var(--slate-700); }
.width-btn[aria-pressed='true'] { background: var(--slate-700); }
.width-btn span { display: block; background: var(--mist); border-radius: 99px; width: 16px; }
.width-btn[aria-pressed='true'] span { background: var(--brass); }

/* the signature: bearing readout */
.bearing {
  position: absolute;
  right: 14px;
  bottom: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(19, 28, 36, 0.92);
  border: 1px solid var(--slate-700);
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--mist);
  backdrop-filter: blur(6px);
}
.bearing .rose-lg { width: 34px; height: 34px; color: var(--brass); flex: none; }
.bearing dl { margin: 0; display: grid; grid-template-columns: auto auto; gap: 2px 10px; }
.bearing dt { color: #5f7180; text-transform: uppercase; letter-spacing: 0.08em; }
.bearing dd { margin: 0; color: #e6ecf1; font-weight: 600; text-align: right; }
.bearing .reset { color: var(--mist); padding: 4px; }
.bearing .reset:hover { color: var(--brass); }

.hint {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--mist);
  background: rgba(19, 28, 36, 0.9);
  border: 1px solid var(--slate-700);
  padding: 6px 12px;
  border-radius: 99px;
  pointer-events: none;
}

.text-entry {
  position: absolute;
  background: transparent;
  border: 1px dashed var(--brass);
  color: var(--ink);
  font-family: var(--font-display);
  padding: 2px 4px;
  min-width: 60px;
  outline: none;
}

@media (max-width: 640px) {
  .tools { left: 8px; padding: 4px; }
  .tool { width: 34px; height: 34px; }
  .bearing dl { display: none; }
  .hint { display: none; }
}

/* ---------- people ---------- */
.notice {
  color: var(--brass);
  font-size: 13px;
  font-family: var(--font-mono);
  margin: 20px 0 0;
}

.add-person {
  display: grid;
  grid-template-columns: repeat(4, 1fr) auto;
  gap: 12px;
  align-items: end;
}
.add-person .field { margin-bottom: 0; }
.add-person select {
  width: 100%;
  padding: 11px 12px;
  background: var(--slate-800);
  border: 1px solid var(--slate-600);
  border-radius: 4px;
  color: #e6ecf1;
  font: inherit;
}
.add-person select:focus { border-color: var(--brass); outline: none; }
.add-person .add-btn { height: 43px; white-space: nowrap; }

.fineprint {
  color: var(--mist);
  font-size: 12px;
  margin: 12px 0 0;
}

.person-name {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: 500;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.person-name .handle {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--mist);
  font-weight: 400;
}
.you-tag { color: var(--brass); }

button.wordmark { cursor: pointer; }

@media (max-width: 720px) {
  .add-person { grid-template-columns: 1fr; }
  .add-person .add-btn { width: 100%; }
}

/* ---------- task board ---------- */
.taskboard {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--slate-900);
  overflow: hidden;
}

.progress-tag {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--mist);
  white-space: nowrap;
}

.board-error { margin: 10px 16px 0; }

.cat-tabs {
  flex: none;
  display: flex;
  gap: 4px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--slate-700);
  overflow-x: auto;
}
.cat-tab {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border-radius: 99px;
  font-size: 13px;
  color: var(--mist);
  white-space: nowrap;
  border: 1px solid transparent;
}
.cat-tab:hover { color: #e6ecf1; border-color: var(--slate-600); }
.cat-tab[aria-pressed='true'] {
  background: var(--brass);
  color: var(--slate-900);
  font-weight: 600;
}
.cat-count {
  font-family: var(--font-mono);
  font-size: 10px;
  opacity: 0.7;
}

.columns {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(240px, 1fr));
  gap: 12px;
  padding: 14px;
  overflow-x: auto;
  min-height: 0;
}

.column {
  display: flex;
  flex-direction: column;
  background: var(--slate-800);
  border: 1px solid var(--slate-700);
  border-radius: 8px;
  min-height: 0;
}
.column.over { border-color: var(--brass); background: #17222c; }

.col-head {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 13px;
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--mist);
  border-bottom: 1px solid var(--slate-700);
}
/* one hairline of color per column — enough to read at a glance, not a rainbow */
.col-head.todo    { box-shadow: inset 3px 0 0 var(--mist); }
.col-head.doing   { box-shadow: inset 3px 0 0 var(--brass); }
.col-head.blocked { box-shadow: inset 3px 0 0 var(--alert); }
.col-head.done    { box-shadow: inset 3px 0 0 #5c8a4e; }
.col-count { font-weight: 600; color: #e6ecf1; }

.col-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  min-height: 0;
}

.card {
  background: var(--slate-900);
  border: 1px solid var(--slate-700);
  border-radius: 6px;
  padding: 10px 11px;
  cursor: grab;
}
.card:hover { border-color: var(--slate-600); }
.card.dragging { opacity: 0.4; }
.card.done .card-title { text-decoration: line-through; color: var(--mist); }

.card-top { display: flex; align-items: flex-start; gap: 8px; }
.card-title {
  flex: 1;
  margin: 0;
  font-size: 14px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.card .kill {
  color: #3f4f5c;
  padding: 0 2px;
  font-size: 12px;
  line-height: 1;
}
.card .kill:hover { color: var(--alert); }

.check {
  flex: none;
  width: 16px;
  height: 16px;
  margin-top: 2px;
  border: 1px solid var(--slate-600);
  border-radius: 3px;
  display: grid;
  place-items: center;
  font-size: 11px;
  color: transparent;
}
.check:hover { border-color: var(--brass); }
.check[aria-pressed='true'] {
  background: #5c8a4e;
  border-color: #5c8a4e;
  color: var(--slate-900);
}

.card-group {
  margin: 6px 0 0 24px;
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #5f7180;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 8px 0 0 24px;
}
.chip {
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 3px 7px;
  border-radius: 99px;
  border: 1px solid var(--slate-600);
  color: var(--mist);
  white-space: nowrap;
}
.chip.owner { border-color: #3d5a6c; color: #8fbcd4; }
.chip.date.overdue { border-color: var(--alert); color: var(--alert); }
.chip.blocker { border-color: #6b4a2a; color: var(--brass); }

.card-blockers {
  margin: 7px 0 0 24px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--mist);
  white-space: pre-line;
  border-left: 2px solid var(--slate-700);
  padding-left: 8px;
}

.add-card {
  padding: 8px;
  border-radius: 6px;
  border: 1px dashed var(--slate-600);
  color: var(--mist);
  font-size: 13px;
}
.add-card:hover { border-color: var(--brass); color: var(--brass); }

.kind-tag {
  flex: none;
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  padding: 3px 6px;
  border-radius: 3px;
  border: 1px solid var(--slate-600);
  color: var(--mist);
}
.kind-tag.tasks { border-color: #6b4a2a; color: var(--brass); }

/* task editor */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(6, 10, 13, 0.7);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 50;
}
.sheet {
  width: 100%;
  max-width: 480px;
  background: var(--slate-800);
  border: 1px solid var(--slate-600);
  border-radius: 10px;
  padding: 22px;
}
.sheet h3 { margin: 0 0 18px; font-size: 17px; }
.sheet-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.sheet textarea {
  width: 100%;
  padding: 10px 12px;
  background: var(--slate-900);
  border: 1px solid var(--slate-600);
  border-radius: 4px;
  color: #e6ecf1;
  font: inherit;
  font-size: 13px;
  resize: vertical;
}
.sheet textarea:focus { border-color: var(--brass); outline: none; }
.sheet .field input { background: var(--slate-900); }
.sheet-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

@media (max-width: 900px) {
  .columns { grid-template-columns: repeat(4, 260px); }
  .sheet-row { grid-template-columns: 1fr; }
}
