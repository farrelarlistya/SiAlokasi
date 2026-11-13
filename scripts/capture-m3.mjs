import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Uji alur M3 di Chrome sungguhan lewat DevTools Protocol, sekaligus mengambil
 * tangkapan layar untuk docs/bukti/m3. Jalankan setelah `npm run dev` menyala.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const outputDir = path.join(root, "docs/bukti/m3");
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
      if (set) {
        for (const handler of set) handler(message.params);
      }
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
      consoleErrors.push(
        params.args.map((arg) => arg.value ?? arg.description ?? "").join(" "),
      );
    }
  });
  cdp.on("Runtime.exceptionThrown", (params) => {
    pageErrors.push(params.exceptionDetails?.text ?? "Kesalahan halaman");
  });

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");

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
    return evaluate(
      `new Promise((resolve, reject) => {
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
      })`,
    );
  }

  async function navigate(url, waitText) {
    await cdp.send("Page.navigate", { url });
    await delay(1_200);
    if (waitText) await waitForText(waitText);
  }

  async function setField(selector, value) {
    return evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) throw new Error("Elemen tidak ditemukan: " + ${JSON.stringify(selector)});
      const proto = el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : el instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
      setter.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return el.value;
    })()`);
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

  async function clickSelector(selector) {
    return evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) throw new Error("Elemen tidak ditemukan: " + ${JSON.stringify(selector)});
      el.click();
      return true;
    })()`);
  }

  async function screenshot(name, width, height) {
    if (width && height) await setViewport(width, height);
    await delay(700);
    const result = await cdp.send("Page.captureScreenshot", { format: "png" });
    await writeFile(path.join(outputDir, name), Buffer.from(result.data, "base64"));
    console.log(`  Tangkapan layar: docs/bukti/m3/${name}`);
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
    return result.body;
  }

  try {
    await setViewport(1440, 1000);
    await navigate(`${baseUrl}/`, "Kejadian aktif");

    console.log("Masuk sebagai petugas dan membuat laporan lewat formulir");
    await loginAs("petugas@sialokasi.demo");
    await evaluate(`window.localStorage.removeItem("sialokasi.draft.laporan-baru")`);
    await navigate(`${baseUrl}/petugas/laporan/baru`, "Klik peta untuk menandai titik kejadian");
    await cdp.send("Page.reload");
    await delay(1_200);
    await waitForText("Klik peta untuk menandai titik kejadian");

    await setField("#incident-title", "Banjir di Wonokromo RW 03");
    await setField("#incident-lat", "-7.3002");
    await setField("#incident-lng", "112.7382");
    await waitForText("Kecamatan terdampak · otomatis");
    await waitForText("Wonokromo");
    await screenshot("01-t2-buat-laporan.png", 1440, 1000);

    await clickText("button", "Simpan & lanjut");
    await waitForText("Faktor lapangan");

    console.log("Mengisi faktor lapangan dan menghitung estimasi");
    await setField("#factor-people", "420");
    await setField("#factor-damage", "BERAT");
    await setField("#factor-vulnerableBabies", "12");
    await setField("#factor-vulnerableElderly", "30");
    await setField("#factor-vulnerablePregnant", "4");
    await setField("#factor-vulnerableDisabled", "6");
    await setField("#factor-road", "TERBATAS");
    await setField("#factor-weather", "HUJAN");
    await setField("#factor-density", "TINGGI");

    await clickText("button", "Hitung estimasi");
    await waitForText("Sudah dihitung");
    await waitForText("Air bersih");
    await screenshot("02-t3-faktor-estimasi.png", 1440, 1000);

    const trackingCode = await evaluate(`(() => {
      const match = document.body.innerText.match(/SIA-[A-Z0-9]{5}/);
      return match ? match[0] : null;
    })()`);
    if (!trackingCode) throw new Error("Kode lacak tidak ditemukan di halaman T3.");
    console.log(`  Kode lacak: ${trackingCode}`);

    console.log("Mengajukan laporan ke pimpinan");
    await clickText("a", "Ajukan ke pimpinan");
    await waitForText("Ajukan laporan ke pimpinan");
    await screenshot("03-t4-ajukan.png", 1440, 1000);
    await clickText("button", "Ajukan ke pimpinan");
    await waitForText("Ajukan laporan ini ke pimpinan?");
    await clickText("button", "Ya, ajukan sekarang");
    await waitForText("Menunggu keputusan pimpinan");
    await screenshot("04-t3-terkunci.png", 1440, 1000);

    console.log("Memeriksa peringatan laporan dobel di titik yang sama");
    await evaluate(`window.localStorage.removeItem("sialokasi.draft.laporan-baru")`);
    await navigate(`${baseUrl}/petugas/laporan/baru`, "Klik peta untuk menandai titik kejadian");
    await cdp.send("Page.reload");
    await delay(1_200);
    await waitForText("Klik peta untuk menandai titik kejadian");
    await setField("#incident-lat", "-7.3002");
    await setField("#incident-lng", "112.7382");
    await waitForText("Sudah ada laporan dalam radius 200 meter.");
    await screenshot("05-t2-peringatan-dobel.png", 1440, 1000);

    console.log("Masuk sebagai pimpinan dan meninjau antrian");
    await loginAs("pimpinan@sialokasi.demo");
    await navigate(`${baseUrl}/pimpinan`, "Antrian keputusan");
    await waitForText("Banjir di Wonokromo RW 03");
    await screenshot("06-l1-dasbor-pimpinan.png", 1440, 1000);

    await clickSelector('a[href^="/pimpinan/laporan/"]');
    await waitForText("Rekomendasi bantuan");
    await waitForText("Keputusan pimpinan");
    await screenshot("07-l2-tinjau.png", 1440, 1000);

    console.log("Menyesuaikan jumlah bantuan dengan alasan");
    await clickText("button", "Ubah");
    await waitForText("Ubah jumlah bantuan");
    const currentQty = await evaluate(
      `Number(document.querySelector("#adjust-qty").value)`,
    );
    await setField("#adjust-qty", String(currentQty + 5));
    await setField(
      "#adjust-reason",
      "Stok posko tujuan perlu disesuaikan dengan kondisi lapangan.",
    );
    await clickText("button", "Simpan perubahan");
    await waitForText("Disesuaikan pimpinan");
    await screenshot("08-l2-disesuaikan.png", 1440, 1000);

    console.log("Menyetujui dan menerbitkan izin");
    await setField("#posko-tujuan", "posko_balai_kota");
    await clickText("button", "Setujui & terbitkan izin");
    await waitForText("Setujui laporan dan terbitkan izin?");
    await clickText("button", "Ya, setujui & terbitkan");
    await waitForText("Izin Distribusi Bantuan");
    await screenshot("09-l3-izin.png", 1440, 1000);

    console.log("Menandai distribusi selesai");
    await clickText("button", "Tandai distribusi selesai");
    await waitForText("Tandai distribusi selesai?");
    await clickText("button", "Ya, tandai selesai");
    await waitForText("Distribusi sudah ditandai selesai.");
    await screenshot("10-l3-selesai.png", 1440, 1000);

    console.log("Membuka halaman lacak publik tanpa masuk");
    await evaluate(`fetch("/api/auth/logout", { method: "POST" })`);
    await navigate(
      `${baseUrl}/lacak?kode=${encodeURIComponent(trackingCode)}`,
      "Pantau status bantuan",
    );
    await waitForText("Bantuan yang disetujui");
    await waitForText("Izin distribusi");
    await screenshot("11-p2-lacak.png", 1440, 1000);
    await screenshot("12-p2-lacak-ponsel.png", 390, 844);

    console.log("Memeriksa tata letak ponsel pada halaman baru");
    await navigate(`${baseUrl}/`, "Kejadian aktif");
    await screenshot("13-p1-peta-ponsel.png", 390, 844);

    const layout = await evaluate(`(() => {
      const root = document.documentElement;
      const overflow = root.scrollWidth > window.innerWidth + 1;
      const smallText = [...document.querySelectorAll("body *")].filter((el) => {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return false;
        if (el.closest(".leaflet-container")) return false;
        const text = (el.textContent || "").trim();
        if (!text) return false;
        return parseFloat(style.fontSize) < 16;
      }).length;
      const smallTargets = [...document.querySelectorAll("button, a, input, select, textarea")].filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return false;
        if (el.closest(".leaflet-container")) return false;
        if (rect.width === 0 || rect.height === 0) return false;
        return rect.width < 44 || rect.height < 44;
      }).length;
      return { overflow, smallText, smallTargets, scrollWidth: root.scrollWidth, innerWidth: window.innerWidth };
    })()`);

    console.log("\nHasil pemeriksaan tata letak 390 px:");
    console.log(JSON.stringify(layout, null, 2));

    console.log("\nKesalahan konsol:", consoleErrors.length);
    for (const error of consoleErrors) console.log(`  - ${error}`);
    console.log("Kesalahan halaman:", pageErrors.length);
    for (const error of pageErrors) console.log(`  - ${error}`);
  } finally {
    cdp.close();
  }
}

main().catch((error) => {
  console.error("Uji peramban gagal.");
  console.error(error);
  process.exitCode = 1;
});
