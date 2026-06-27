// Reusable visual-capture harness (CDP, zero deps). Captures a matrix of
// surfaces × viewport widths × theme to /tmp/clustershots so a UI defect
// can be pinned to an EXACT viewport instead of a guessed one. Keep this
// around for the film/TV cluster work — recreating it each round was part
// of what made the last sessions slow.
//
//   node scripts/_viewshot.mjs            # full sweep, dark
//   node scripts/_viewshot.mjs light      # full sweep, light
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const THEME = process.argv[2] === "light" ? "light" : "dark";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9227;
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "vs-"))}`, "--no-first-run",
  "--no-default-browser-check", "--hide-scrollbars", "--force-device-scale-factor=1"]);
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

// Surfaces to capture and the widths to sweep. Heights are generous so the
// hero + rail + first module are all in frame.
const SURFACES = [
  { name: "films-reviews", url: "http://localhost:3000/films/reviews" },
  { name: "tv-reviews", url: "http://localhost:3000/television/reviews" },
  { name: "films-landing", url: "http://localhost:3000/films" },
  { name: "tv-landing", url: "http://localhost:3000/television" },
];
const WIDTHS = [1024, 1280, 1440, 1680, 2560];

const main = async () => {
  const ws = new WebSocket(await getWs()); await new Promise((r) => (ws.onopen = r));
  const raw = client(ws);
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const send = (m, p = {}) => raw(m, p, sessionId);
  await send("Page.enable");
  // Force the theme so captures match the user's reported mode.
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: THEME }],
  });
  for (const s of SURFACES) {
    for (const w of WIDTHS) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: w, height: 1000, deviceScaleFactor: 1, mobile: false });
      await send("Page.navigate", { url: s.url });
      await sleep(1600);
      const { data } = await send("Page.captureScreenshot", { format: "png",
        clip: { x: 0, y: 0, width: w, height: 1000, scale: 1 } });
      const f = `${s.name}-${w}-${THEME}.png`;
      writeFileSync(join("/tmp/clustershots", f), Buffer.from(data, "base64"));
      console.log("wrote", f);
    }
  }
  ws.close(); chrome.kill("SIGKILL"); process.exit(0);
};
setTimeout(() => { chrome.kill("SIGKILL"); console.error("TIMEOUT"); process.exit(1); }, 120000);
main().catch((e) => { console.error(e); chrome.kill("SIGKILL"); process.exit(1); });
