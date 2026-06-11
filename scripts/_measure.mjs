// One-off CDP measurement: report the rendered vertical gaps in the hero
// (Kicker → Display → Lede) at an exact viewport, plus the resolved
// text-box-trim value, so spacing can be tuned against ground truth
// instead of guessed pixels. Mirrors _viewshot.mjs's CDP plumbing.
//
//   node scripts/_measure.mjs            # 1024, light
//   node scripts/_measure.mjs 1280 dark
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const WIDTH = Number(process.argv[2]) || 1024;
const THEME = process.argv[3] === "dark" ? "dark" : "light";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9228;
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "ms-"))}`, "--no-first-run",
  "--no-default-browser-check", "--force-device-scale-factor=1"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getWs() { for (let i = 0; i < 40; i++) { try {
  const j = await (await fetch(`http://localhost:${PORT}/json/version`)).json();
  if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl; } catch {} await sleep(250);
} throw new Error("no cdp"); }
function client(ws) { let id = 0; const p = new Map();
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data);
    if (m.id && p.has(m.id)) { const { res, rej } = p.get(m.id); p.delete(m.id);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } });
  return (method, params = {}, sid) => new Promise((res, rej) => { const myId = ++id;
    p.set(myId, { res, rej }); const msg = { id: myId, method, params };
    if (sid) msg.sessionId = sid; ws.send(JSON.stringify(msg)); }); }

// The expression run inside the page: walk the hero Stack and report the
// box rects + the resolved trim property, so we can see both the geometry
// and whether the browser honored text-box-trim at all.
const PROBE = `(() => {
  const q = (s) => document.querySelector(s);
  const h1 = q("h1");
  // Kicker is the first element in the hero stack; lede is the first <p>
  // after the h1. Grab them relative to the h1's stack parent.
  const stack = h1.closest("div.flex.flex-col") || h1.parentElement;
  const kids = [...stack.children];
  const kicker = kids[0];
  const lede = kids.find((el, i) => i > kids.indexOf(h1) && el.tagName === "P");
  const r = (el) => { const b = el.getBoundingClientRect();
    return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height) }; };
  const cs = getComputedStyle(h1);
  const csL = getComputedStyle(lede);
  // The global site header/nav, and the hero Section that wraps the stack.
  const header = document.querySelector("header") || document.querySelector("nav");
  const section = h1.closest("section") || stack.closest("section") || stack.parentElement;
  return JSON.stringify({
    width: innerWidth,
    headerBottom: header ? Math.round(header.getBoundingClientRect().bottom) : null,
    navToKicker: header ? r(kicker).top - Math.round(header.getBoundingClientRect().bottom) : null,
    sectionPadTop: section ? getComputedStyle(section).paddingTop : null,
    kicker: r(kicker),
    h1: r(h1),
    lede: r(lede),
    kickerToH1: r(h1).top - r(kicker).bottom,
    h1ToLede: r(lede).top - r(h1).bottom,
    h1_trim: cs.getPropertyValue("text-box-trim") || "(unsupported)",
    lede_trim: csL.getPropertyValue("text-box-trim") || "(unsupported)",
    lede_marginTop: csL.marginTop,
    stack_gap: getComputedStyle(stack).gap,
  });
})()`;

const SURFACES = [
  { name: "films", url: "http://localhost:3000/films" },
  { name: "television", url: "http://localhost:3000/television" },
  { name: "home", url: "http://localhost:3000/" },
];

const main = async () => {
  const ws = new WebSocket(await getWs()); await new Promise((r) => (ws.onopen = r));
  const raw = client(ws);
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const send = (m, p = {}) => raw(m, p, sessionId);
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: THEME }] });
  await send("Emulation.setDeviceMetricsOverride", {
    width: WIDTH, height: 1000, deviceScaleFactor: 1, mobile: false });
  for (const s of SURFACES) {
    await send("Page.navigate", { url: s.url });
    await sleep(1600);
    const { result } = await send("Runtime.evaluate", {
      expression: PROBE, returnByValue: true });
    console.log(`\n=== ${s.name} @ ${WIDTH} (${THEME}) ===`);
    console.log(JSON.stringify(JSON.parse(result.value), null, 2));
  }
  ws.close(); chrome.kill("SIGKILL"); process.exit(0);
};
setTimeout(() => { chrome.kill("SIGKILL"); console.error("TIMEOUT"); process.exit(1); }, 60000);
main().catch((e) => { console.error(e); chrome.kill("SIGKILL"); process.exit(1); });
