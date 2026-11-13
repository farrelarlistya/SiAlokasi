import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Uji alur M4 di Chrome sungguhan lewat DevTools Protocol, sekaligus mengambil
 * tangkapan layar untuk docs/bukti/m4. Jalankan setelah `npm run dev` menyala.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const outputDir = path.join(root, "docs/bukti/m4");
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
      consoleErrors.push(params.args.map((arg) => arg.value ?? arg.description ?? "").join(" "));
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

  async function screenshot(name, width, height) {
    if (width && height) await setViewport(width, height);
    await delay(700);
    const result = await cdp.send("Page.captureScreenshot", { format: "png" });
    await writeFile(path.join(outputDir, name), Buffer.from(result.data, "base64"));
    console.log(`  Tangkapan layar: docs/bukti/m4/${name}`);
  }

  async function loginAs(email) {
    const result = await evaluate(`fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ${JSON.stringify(email)}, password: "Sialokasi#2026" })
    }).then(async (response) => ({ status: response.status, body: await response.json() }))`);
    if (result.status !== 200) {
      throw new Error(`Gagal masuk sebagai ${email}: ${JSON.stringify(result.body)}`);
    }
    return result.body;
  }

  async function layoutCheck(page, width, height) {
    await setViewport(width, height);
    await navigate(`${baseUrl}${page}`);
    return evaluate(`(() => {
      const root = document.documentElement;
      const overflow = root.scrollWidth > window.innerWidth + 1;
      const smallText = [...document.querySelectorAll("body *")].filter((el) => {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return false;
        if (el.closest(".leaflet-container") || el.closest(".sr-only")) return false;
        const text = (el.textContent || "").trim();
        if (!text) return false;
        return parseFloat(style.fontSize) < 16;
      }).length;
      const smallTargets = [...document.querySelectorAll("button, a, input, select, textarea, summary")].filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return false;
        if (el.closest(".leaflet-container") || el.closest(".sr-only")) return false;
        if (rect.width === 0 || rect.height === 0) return false;
        return rect.width < 44 || rect.height < 44;
      }).length;
      return { overflow, smallText, smallTargets, scrollWidth: root.scrollWidth, innerWidth: window.innerWidth };
    })()`);
  }

  try {
    await setViewport(1440, 1000);
    await navigate(`${baseUrl}/`, "Kejadian aktif");

    console.log("Mereset demo lalu membuka panel kontrol");
    await loginAs("admin@sialokasi.demo");
    await evaluate(`fetch("/api/dev/reset", { method: "POST" })`);
    await loginAs("admin@sialokasi.demo");
    await navigate(`${baseUrl}/dev`, "Kontrol demo SiAlokasi");
    await screenshot("01-dev-panel.png", 1440, 1000);

    console.log("Mengisi tiga contoh laporan dari panel demo");
    await clickText("button", "Isi 3 contoh laporan");
    await waitForText("Isi tiga contoh laporan?");
    await clickText("button", "Ya, isi contoh");
    await waitForText("Tiga contoh laporan sudah dibuat.");
    await delay(1_000);
    await screenshot("02-dev-contoh-terisi.png", 1440, 1000);

    console.log("Membuka rekap pimpinan");
    await loginAs("pimpinan@sialokasi.demo");
    await navigate(`${baseUrl}/pimpinan/rekap`, "Rekap laporan bantuan");
    await waitForText("Rekap per kecamatan");
    await screenshot("03-rekap-pimpinan.png", 1440, 1000);

    console.log("Membuka antrian pimpinan dan izin distribusi");
    await navigate(`${baseUrl}/pimpinan`, "Antrian keputusan");
    await waitForText("Banjir di Wonokromo RW 03");
    await screenshot("04-l1-antrian.png", 1440, 1000);

    const approvedId = await evaluate(
      `fetch("/api/public/incidents").then((response) => response.json()).then((body) => (body.incidents.find((incident) => incident.code === "SIA-DEMO2") || {}).id)`,
    );
    if (!approvedId) throw new Error("Contoh laporan yang disetujui tidak ditemukan.");
    await navigate(`${baseUrl}/pimpinan/izin/${approvedId}`, "Izin Distribusi Bantuan");
    await waitForText("Nomor izin");
    await screenshot("05-l3-izin.png", 1440, 1000);

    console.log("Membuka modal koreksi dan menyimpan koreksi jumlah");
    await clickText("button", "Koreksi izin");
    await waitForText("Koreksi izin distribusi");
    await setField("#correction-qty-aid_air_bersih", "1500");
    await setField(
      "#correction-reason",
      "Hasil pendataan ulang menunjukkan kebutuhan air lebih kecil dari perkiraan awal.",
    );
    await screenshot("06-koreksi-modal.png", 1440, 1000);
    await clickText("button", "Simpan koreksi");
    await waitForText("Riwayat koreksi izin");
    await screenshot("07-l3-koreksi.png", 1440, 1000);

    console.log("Memeriksa halaman lacak publik setelah koreksi");
    await evaluate(`fetch("/api/auth/logout", { method: "POST" })`);
    await navigate(`${baseUrl}/lacak?kode=SIA-DEMO2`, "Pantau status bantuan");
    await waitForText("Bantuan yang disetujui");
    await screenshot("08-lacak-setelah-koreksi.png", 1440, 1000);

    console.log("Membuka peta publik berisi tiga contoh");
    await navigate(`${baseUrl}/`, "Kejadian aktif");
    await waitForText("Kebakaran permukiman di Tambaksari");
    await delay(1_500);
    await screenshot("09-p1-peta-contoh.png", 1440, 1000);

    console.log("Membuka ringkasan stok dan jurnal stok");
    await loginAs("pimpinan@sialokasi.demo");
    await navigate(`${baseUrl}/stok`, "Ringkasan stok per posko");
    await waitForText("Jurnal stok terakhir");
    await screenshot("10-stok-jurnal.png", 1440, 1000);

    console.log("Membuka audit admin dan detail nilai sebelum-sesudah");
    await loginAs("admin@sialokasi.demo");
    await navigate(`${baseUrl}/admin/audit`, "Audit & riwayat perubahan");
    await waitForText("Catatan perubahan");
    await evaluate(`document.querySelector("details summary")?.click()`);
    await delay(500);
    await screenshot("11-audit-admin.png", 1440, 1000);

    await navigate(`${baseUrl}/dev`, "Kontrol demo SiAlokasi");
    await screenshot("12-dev-setelah-demo.png", 1440, 1000);

    console.log("Membatalkan laporan dari akun petugas");
    await loginAs("petugas@sialokasi.demo");
    const created = await evaluate(`fetch("/api/petugas/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Laporan uji pembatalan M4",
        disasterType: "BANJIR",
        occurredAt: new Date(Date.now() - 3600000).toISOString(),
        lat: -7.312,
        lng: 112.745,
        radiusM: 600,
        regionId: "region_wonokromo"
      })
    }).then(async (response) => ({ status: response.status, body: await response.json() }))`);
    if (created.status !== 201) throw new Error(`Gagal membuat laporan batal: ${JSON.stringify(created.body)}`);
    await navigate(`${baseUrl}/petugas/laporan/${created.body.data.id}`, "Faktor & estimasi bantuan");
    await clickText("button", "Batalkan laporan");
    await waitForText("Batalkan laporan ini?");
    await clickText("button", "Ya, batalkan laporan");
    await waitForText("Laporan dibatalkan");
    await screenshot("13-petugas-batal.png", 1440, 1000);

    console.log("Mengambil tangkapan layar ponsel");
    await loginAs("pimpinan@sialokasi.demo");
    await navigate(`${baseUrl}/pimpinan/rekap`, "Rekap laporan bantuan");
    await screenshot("14-rekap-ponsel.png", 390, 844);
    await navigate(`${baseUrl}/stok`, "Ringkasan stok per posko");
    await screenshot("15-stok-ponsel.png", 390, 844);

    await loginAs("admin@sialokasi.demo");
    await navigate(`${baseUrl}/admin/audit`, "Audit & riwayat perubahan");
    await screenshot("16-audit-ponsel.png", 390, 844);
    await navigate(`${baseUrl}/dev`, "Kontrol demo SiAlokasi");
    await screenshot("17-dev-ponsel.png", 390, 844);

    console.log("\nMemeriksa tata letak halaman baru pada 4 lebar");
    const pages = [
      { path: "/pimpinan/rekap", label: "Rekap", role: "pimpinan@sialokasi.demo" },
      { path: `/pimpinan/izin/${approvedId}`, label: "Izin", role: "pimpinan@sialokasi.demo" },
      { path: "/stok", label: "Stok", role: "pimpinan@sialokasi.demo" },
      { path: "/admin/audit", label: "Audit", role: "admin@sialokasi.demo" },
      { path: "/dev", label: "Panel demo", role: "admin@sialokasi.demo" },
    ];
    const widths = [360, 768, 1366, 1920];

    for (const page of pages) {
      await loginAs(page.role);
      for (const width of widths) {
        const result = await layoutCheck(page.path, width, width < 768 ? 844 : 1000);
        const ok = !result.overflow && result.smallText === 0 && result.smallTargets === 0;
        console.log(
          `  ${ok ? "OK   " : "GAGAL"} ${page.label} ${width}px: overflow=${result.overflow} teksKecil=${result.smallText} targetKecil=${result.smallTargets}`,
        );
      }
    }

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
