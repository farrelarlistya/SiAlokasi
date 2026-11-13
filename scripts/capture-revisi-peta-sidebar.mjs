import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(here, "..", "docs", "bukti", "revisi-peta-sidebar");
const baseUrl = process.env.WEB_URL ?? "http://localhost:5173";
const cdpUrl = process.env.CDP_URL ?? "http://127.0.0.1:9222";

const consoleErrors = [];
const pageErrors = [];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function openTab(url) {
  const response = await fetch(`${cdpUrl}/json/new?${encodeURIComponent(url)}`, {
    method: "PUT",
  });
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
          return () => handlers.get(method)?.delete(handler);
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
  await cdp.send("Log.enable");
  await cdp.send("Network.enable");
  await cdp.send("Network.clearBrowserCookies");

  async function setViewport(width, height) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
  }

  async function evaluate(expression) {
    const result = await cdp.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ??
          result.exceptionDetails.text ??
          "Evaluasi halaman gagal.",
      );
    }
    return result.result.value;
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
      }, 200);
    })`);
  }

  async function navigate(url, waitText) {
    await cdp.send("Page.navigate", { url });
    await delay(1_500);
    if (waitText) await waitForText(waitText);
  }

  async function screenshot(name, width, height) {
    if (width && height) await setViewport(width, height);
    await delay(900);
    const overflow = await evaluate(
      "document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth",
    );
    if (overflow) console.log(`  PERINGATAN: gulir horizontal pada ${name}`);
    const result = await cdp.send("Page.captureScreenshot", { format: "png" });
    await writeFile(path.join(outputDir, name), Buffer.from(result.data, "base64"));
    console.log(`  ${name}`);
  }

  async function cropElement(selector, name) {
    const rect = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    })()`);
    if (!rect) throw new Error(`Elemen tidak ditemukan: ${selector}`);
    await delay(400);
    const result = await cdp.send("Page.captureScreenshot", {
      format: "png",
      clip: { ...rect, scale: 6 },
    });
    await writeFile(path.join(outputDir, name), Buffer.from(result.data, "base64"));
    console.log(`  ${name}`);
  }

  async function loginAs(email) {
    const result = await evaluate(`fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ${JSON.stringify(email)}, code: "123456" })
    }).then(async (response) => ({ status: response.status, body: await response.json() }))`);
    if (result.status !== 200) {
      throw new Error(`Gagal masuk sebagai ${email}: ${JSON.stringify(result.body)}`);
    }
  }

  async function clickText(selector, text) {
    return evaluate(`(() => {
      const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(
        (item) => item.textContent && item.textContent.replace(/\\s+/g, " ").trim().includes(${JSON.stringify(text)})
      );
      if (!el) throw new Error("Tombol tidak ditemukan: " + ${JSON.stringify(text)});
      el.click();
      return true;
    })()`);
  }

  async function clickLabel(label) {
    return evaluate(`(() => {
      const el = document.querySelector('[aria-label=${JSON.stringify(label)}]');
      if (!el) throw new Error("Tombol tidak ditemukan: " + ${JSON.stringify(label)});
      el.click();
      return true;
    })()`);
  }

  await setViewport(1440, 960);
  await navigate(`${baseUrl}/`);
  await evaluate("localStorage.clear()");
  await navigate(`${baseUrl}/`, "Kejadian aktif");
  await screenshot("01-beranda-panel-terbuka-1440.png");
  await cropElement('header a[href="/"] > img', "00-logo-header.png");

  await clickLabel("Tutup Panel kejadian");
  await screenshot("02-beranda-panel-tertutup-1440.png");

  await navigate(`${baseUrl}/masuk`, "Masuk");
  await screenshot("03-halaman-masuk-logo-1440.png");

  await loginAs("petugas@sialokasi.demo");
  await evaluate('localStorage.removeItem("sialokasi.panel.laporan-baru")');
  await navigate(`${baseUrl}/petugas/laporan/baru`, "Klik peta untuk menandai titik kejadian");
  await screenshot("04-buat-laporan-panel-terbuka-1440.png");

  await clickLabel("Tutup Formulir laporan");
  await screenshot("05-buat-laporan-panel-tertutup-1440.png");

  await navigate(`${baseUrl}/petugas/laporan/baru`);
  await setViewport(390, 844);
  await clickText("button", "Tampilkan panel");
  await waitForText("Klik peta untuk menandai titik kejadian");
  await screenshot("06-buat-laporan-390.png");

  await clickLabel("Tutup Formulir laporan");
  await screenshot("07-buat-laporan-peta-penuh-390.png");

  await evaluate('localStorage.removeItem("sialokasi.panel.peta-publik")');
  await navigate(`${baseUrl}/`, "Kejadian aktif");
  await screenshot("08-beranda-390.png");

  await setViewport(768, 1024);
  await screenshot("09-beranda-768.png");

  await evaluate('localStorage.removeItem("sialokasi.panel.laporan-baru")');
  await navigate(`${baseUrl}/petugas/laporan/baru`, "Klik peta untuk menandai titik kejadian");
  await screenshot("10-buat-laporan-768.png");

  await evaluate('localStorage.removeItem("sialokasi.panel.peta-publik")');
  await navigate(`${baseUrl}/`, "Kejadian aktif");
  await setViewport(360, 800);
  await screenshot("11-beranda-360.png");

  await navigate(`${baseUrl}/petugas/laporan/baru`, "Klik peta untuk menandai titik kejadian");
  await screenshot("12-buat-laporan-360.png");

  await setViewport(1920, 1080);
  await evaluate('localStorage.removeItem("sialokasi.panel.peta-publik")');
  await navigate(`${baseUrl}/`, "Kejadian aktif");
  await screenshot("13-beranda-1920.png");

  if (consoleErrors.length > 0) {
    console.log("Kesalahan konsol:", consoleErrors.join("\n"));
  }
  if (pageErrors.length > 0) {
    console.log("Kesalahan halaman:", pageErrors.join("\n"));
  }
  console.log(`Selesai. ${consoleErrors.length} kesalahan konsol, ${pageErrors.length} kesalahan halaman.`);
  cdp.close();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
