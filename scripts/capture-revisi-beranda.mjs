import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(here, "..", "docs", "bukti", "revisi-beranda");
const baseUrl = process.env.WEB_URL ?? "http://localhost:5173";
const cdpUrl = process.env.CDP_URL ?? "http://127.0.0.1:9222";
const consoleErrors = [];
const pageErrors = [];
const checks = [];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function check(name, passed, detail) {
  checks.push({ name, passed: Boolean(passed), detail });
  if (!passed) throw new Error(`Pemeriksaan gagal: ${name}${detail ? ` — ${detail}` : ""}`);
}

async function openTab(url) {
  const response = await fetch(`${cdpUrl}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  if (!response.ok) throw new Error(`Gagal membuka tab Chrome: ${response.status}`);
  return response.json();
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    const pending = new Map();
    const handlers = new Map();
    let nextId = 0;

    socket.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          nextId += 1;
          const id = nextId;
          socket.send(JSON.stringify({ id, method, params }));
          return new Promise((resolveSend, rejectSend) => {
            pending.set(id, { resolve: resolveSend, reject: rejectSend });
          });
        },
        on(method, handler) {
          if (!handlers.has(method)) handlers.set(method, new Set());
          handlers.get(method).add(handler);
        },
        close() {
          socket.close();
        },
      });
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const entry = pending.get(message.id);
        if (!entry) return;
        pending.delete(message.id);
        if (message.error) entry.reject(new Error(message.error.message));
        else entry.resolve(message.result);
        return;
      }
      const set = handlers.get(message.method);
      if (set) for (const handler of set) handler(message.params);
    });
    socket.addEventListener("error", () => reject(new Error("Koneksi DevTools gagal.")));
  });
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const tab = await openTab(`${baseUrl}/`);
  const cdp = await connect(tab.webSocketDebuggerUrl);

  cdp.on("Runtime.consoleAPICalled", (params) => {
    if (params.type === "error") {
      consoleErrors.push(params.args.map((arg) => arg.value ?? arg.description ?? "").join(" "));
    }
  });
  cdp.on("Runtime.exceptionThrown", (params) => {
    pageErrors.push(params.exceptionDetails?.text ?? "Kesalahan halaman");
  });

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.clearBrowserCookies");

  async function evaluate(expression) {
    const result = await cdp.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    }
    return result.result.value;
  }

  async function setViewport(width, height) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
  }

  async function waitForText(text, timeout = 20_000) {
    return evaluate(`new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (document.body.innerText.includes(${JSON.stringify(text)})) {
          clearInterval(timer);
          resolve(true);
        } else if (Date.now() - started > ${timeout}) {
          clearInterval(timer);
          reject(new Error("Teks tidak muncul: " + ${JSON.stringify(text)}));
        }
      }, 150);
    })`);
  }

  async function navigate(url, waitText) {
    await cdp.send("Page.navigate", { url });
    await delay(500);
    if (waitText) await waitForText(waitText);
    await evaluate("document.fonts.ready.then(() => true)");
    await delay(900);
  }

  async function screenshot(name) {
    const overflow = await evaluate(
      "document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth",
    );
    check(`Tanpa gulir horizontal — ${name}`, !overflow);
    const result = await cdp.send("Page.captureScreenshot", { format: "png" });
    await writeFile(path.join(outputDir, name), Buffer.from(result.data, "base64"));
    console.log(`  ${name}`);
  }

  await setViewport(1440, 1000);
  await navigate(`${baseUrl}/`, "Kejadian aktif");
  await evaluate("localStorage.clear()");
  await navigate(`${baseUrl}/`, "Kejadian aktif");
  check(
    "Latar Aurora aktif di Beranda",
    await evaluate("Boolean(document.querySelector('canvas.aurora-canvas'))"),
  );
  check(
    "Transisi konten selesai dan terlihat",
    await evaluate(`(() => {
      const nodes = [...document.querySelectorAll('#isi-utama aside > div:last-child > div')];
      return nodes.length > 0 && nodes.every((node) => getComputedStyle(node).visibility !== 'hidden');
    })()`),
  );
  check(
    "Subtulisan yang dihapus tidak tampil",
    await evaluate(`!["Ruang kendali darurat", "Bisa ditutup kapan saja", "Tidak perlu masuk"].some(
      (text) => document.body.innerText.includes(text)
    )`),
  );
  await screenshot("01-beranda-1440.png");

  await setViewport(390, 844);
  await delay(500);
  await screenshot("02-beranda-390.png");

  await setViewport(1280, 800);
  await navigate(`${baseUrl}/masuk`, "Masuk ke SiAlokasi");
  const illustration = await evaluate(`(() => {
    const aside = document.querySelector('aside');
    const svg = aside?.querySelector('svg');
    if (!aside || !svg) return null;
    const outer = aside.getBoundingClientRect();
    const rect = svg.getBoundingClientRect();
    return {
      fullyContained: rect.left >= outer.left && rect.right <= outer.right &&
        rect.top >= outer.top && rect.bottom <= outer.bottom,
      ratio: rect.width / rect.height,
      expectedRatio: 800 / 520,
      width: rect.width,
      height: rect.height
    };
  })()`);
  check("Ilustrasi masuk tampil utuh di dalam panel", illustration?.fullyContained, illustration);
  check(
    "Rasio ilustrasi masuk tidak berubah",
    illustration && Math.abs(illustration.ratio - illustration.expectedRatio) < 0.01,
    illustration,
  );
  await screenshot("03-masuk-1280.png");

  await setViewport(1024, 768);
  await delay(400);
  await screenshot("04-masuk-1024.png");

  await setViewport(390, 844);
  await delay(400);
  await screenshot("05-masuk-390.png");

  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await setViewport(1440, 1000);
  await navigate(`${baseUrl}/`, "Kejadian aktif");
  check(
    "Konten tetap terlihat dengan gerak minimal",
    await evaluate(`(() => {
      const heading = [...document.querySelectorAll('h2')].find((node) => node.textContent === 'Kejadian aktif');
      return heading && getComputedStyle(heading).visibility === 'visible' && heading.getBoundingClientRect().width > 0;
    })()`),
  );
  await screenshot("06-beranda-gerak-minimal.png");

  check("Tanpa kesalahan konsol", consoleErrors.length === 0, consoleErrors);
  check("Tanpa kesalahan halaman", pageErrors.length === 0, pageErrors);

  const result = { date: new Date().toISOString(), checks, consoleErrors, pageErrors };
  await writeFile(path.join(outputDir, "hasil-uji.json"), `${JSON.stringify(result, null, 2)}\n`);
  await fetch(`${cdpUrl}/json/close/${tab.id}`);
  cdp.close();
  console.log(`Selesai: ${checks.length} pemeriksaan lulus.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
