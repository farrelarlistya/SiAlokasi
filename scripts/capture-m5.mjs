import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Uji M5 di Chrome sungguhan lewat DevTools Protocol: notifikasi, cetak A4,
 * dan tata letak semua halaman pada 360/768/1366/1920 px.
 * Jalankan setelah `npm run dev` menyala dan Chrome dibuka dengan port 9222.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const outputDir = path.join(root, "docs/bukti/m5");
const baseUrl = process.env.WEB_URL ?? "http://localhost:5173";
const cdpUrl = process.env.CDP_URL ?? "http://127.0.0.1:9222";

const consoleErrors = [];
const pageErrors = [];
const layoutResults = [];
const printResults = [];

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
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });

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
    await delay(1_000);
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
    console.log(`  Tangkapan layar: docs/bukti/m5/${name}`);
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

  async function logout() {
    await evaluate(`fetch("/api/auth/logout", { method: "POST" })`);
  }

  async function layoutCheck(page, width, height) {
    await setViewport(width, height);
    await navigate(`${baseUrl}${page.path}`, page.waitText);
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

  async function printToPdf(fileName) {
    const result = await cdp.send("Page.printToPDF", {
      printBackground: true,
      preferCSSPageSize: true,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
    });
    const buffer = Buffer.from(result.data, "base64");
    await writeFile(path.join(outputDir, fileName), buffer);
    const pageCount = (buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    printResults.push({ file: fileName, pages: pageCount });
    console.log(`  PDF: docs/bukti/m5/${fileName} (${pageCount} halaman)`);
    return pageCount;
  }

  async function printMediaCheck() {
    const result = await evaluate(`(() => {
      const header = document.querySelector(".app-header");
      const hidden = document.querySelector(".print-hidden");
      const documentBody = document.querySelector(".print-document");
      return {
        headerHidden: header ? getComputedStyle(header).display === "none" : false,
        helperHidden: hidden ? getComputedStyle(hidden).display === "none" : false,
        hasDocument: Boolean(documentBody),
        width: documentBody ? Math.round(documentBody.getBoundingClientRect().width) : 0,
      };
    })()`);
    return result;
  }

  async function setPrintMedia(enabled) {
    await cdp.send("Emulation.setEmulatedMedia", {
      media: enabled ? "print" : "screen",
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
  }

  async function exampleIds() {
    return evaluate(`fetch("/api/public/incidents")
      .then((response) => response.json())
      .then((body) => {
        const byCode = {};
        for (const incident of body.incidents) byCode[incident.code] = incident.id;
        return byCode;
      })`);
  }

  try {
    await setViewport(1440, 1000);
    await navigate(`${baseUrl}/`, "Kejadian aktif");

    console.log("Mereset demo dan mengisi tiga contoh laporan");
    await loginAs("admin@sialokasi.demo");
    await evaluate(`fetch("/api/dev/reset", { method: "POST" })`);
    await loginAs("admin@sialokasi.demo");
    const seeded = await evaluate(
      `fetch("/api/dev/seed-examples", { method: "POST" }).then((response) => response.json())`,
    );
    if (!seeded || seeded.incidents !== 3) {
      throw new Error(`Contoh laporan gagal dibuat: ${JSON.stringify(seeded)}`);
    }
    const ids = await exampleIds();
    if (!ids["SIA-DEMO1"] || !ids["SIA-DEMO2"]) {
      throw new Error("Laporan contoh tidak ditemukan di peta publik.");
    }

    console.log("Membuka lonceng notifikasi pimpinan");
    await loginAs("pimpinan@sialokasi.demo");
    await navigate(`${baseUrl}/pimpinan`, "Antrian keputusan");
    await waitForText("Banjir di Wonokromo RW 03");
    await screenshot("01-lonceng-pimpinan.png", 1440, 1000);
    const bellOpened = await evaluate(`(() => {
      const bell = document.querySelector('button[aria-label^="Notifikasi"]');
      if (!bell) return false;
      bell.click();
      return true;
    })()`);
    if (!bellOpened) throw new Error("Lonceng notifikasi tidak ditemukan.");
    await waitForText("Tandai semua dibaca");
    await screenshot("02-notifikasi-lonceng.png", 1440, 1000);

    await clickText("a", "Buka semua notifikasi");
    await waitForText("Log notifikasi");
    await screenshot("03-log-notifikasi.png", 1440, 1000);
    await clickText("button", "Tandai semua dibaca");
    await waitForText("0 belum dibaca");
    await screenshot("04-notifikasi-dibaca.png", 1440, 1000);

    console.log("Melihat notifikasi dari akun petugas");
    await loginAs("petugas@sialokasi.demo");
    await navigate(`${baseUrl}/notifikasi`, "Log notifikasi");
    await waitForText("Laporan tersimpan");
    await screenshot("05-notifikasi-petugas.png", 1440, 1000);

    console.log("Menguji cetak izin A4");
    await loginAs("pimpinan@sialokasi.demo");
    await navigate(`${baseUrl}/pimpinan/izin/${ids["SIA-DEMO2"]}`, "Izin Distribusi Bantuan");
    await waitForText("Nomor izin");
    await screenshot("06-izin-sebelum-koreksi.png", 1440, 1000);

    await setViewport(703, 993);
    await setPrintMedia(true);
    await delay(500);
    const printCheck = await printMediaCheck();
    if (!printCheck.headerHidden || !printCheck.helperHidden || !printCheck.hasDocument) {
      throw new Error(`Tampilan cetak belum rapi: ${JSON.stringify(printCheck)}`);
    }
    await screenshot("07-cetak-a4.png", 703, 993);
    const firstPages = await printToPdf("izin-distribusi-a4.pdf");
    await setPrintMedia(false);

    console.log("Mengoreksi izin dan mencetak dokumen pengganti");
    await setViewport(1440, 1000);
    await navigate(`${baseUrl}/pimpinan/izin/${ids["SIA-DEMO2"]}`, "Izin Distribusi Bantuan");
    await clickText("button", "Koreksi izin");
    await waitForText("Koreksi izin distribusi");
    await setField("#correction-qty-aid_air_bersih", "1500");
    await setField(
      "#correction-reason",
      "Hasil pendataan ulang M5 menunjukkan kebutuhan air lebih kecil dari perkiraan awal.",
    );
    await screenshot("08-koreksi-modal.png", 1440, 1000);
    await clickText("button", "Simpan koreksi");
    await waitForText("Riwayat koreksi izin");
    await waitForText("Menggantikan izin");
    await screenshot("09-izin-koreksi.png", 1440, 1000);

    await setViewport(703, 993);
    await setPrintMedia(true);
    await delay(500);
    const correctionPrintCheck = await printMediaCheck();
    if (!correctionPrintCheck.headerHidden || !correctionPrintCheck.helperHidden) {
      throw new Error(`Tampilan cetak izin koreksi belum rapi: ${JSON.stringify(correctionPrintCheck)}`);
    }
    await screenshot("10-cetak-a4-koreksi.png", 703, 993);
    const correctionPages = await printToPdf("izin-koreksi-a4.pdf");
    await setPrintMedia(false);

    console.log("Mengambil tangkapan layar ponsel dan panel demo");
    await setViewport(390, 844);
    await navigate(`${baseUrl}/pimpinan`, "Antrian keputusan");
    await evaluate(`document.querySelector('button[aria-label^="Notifikasi"]')?.click()`);
    await waitForText("Tandai semua dibaca");
    await screenshot("11-lonceng-ponsel.png", 390, 844);
    await evaluate(`document.querySelector('[aria-label="Tutup dialog"]')?.click()`);
    await navigate(`${baseUrl}/notifikasi`, "Log notifikasi");
    await screenshot("12-notifikasi-ponsel.png", 390, 844);
    await navigate(`${baseUrl}/pimpinan/izin/${ids["SIA-DEMO2"]}`, "Izin Distribusi Bantuan");
    await screenshot("13-izin-ponsel.png", 390, 844);

    await logout();
    await navigate(`${baseUrl}/`, "Kejadian aktif");
    await screenshot("14-beranda-360.png", 360, 844);
    await screenshot("15-beranda-1920.png", 1920, 1080);

    await loginAs("admin@sialokasi.demo");
    await navigate(`${baseUrl}/dev`, "Kontrol demo SiAlokasi");
    await screenshot("16-dev-1920.png", 1920, 1080);

    console.log("\nMemeriksa tata letak semua halaman pada 4 lebar");
    const pages = [
      { path: "/", label: "Beranda publik", waitText: "Kejadian aktif", role: null },
      { path: `/lacak?kode=SIA-DEMO1`, label: "Lacak status", waitText: "Pantau status bantuan", role: null },
      { path: "/masuk", label: "Masuk", waitText: "Masuk ke ruang kendali", role: null },
      { path: "/daftar", label: "Daftar petugas", waitText: "Daftar sebagai petugas", role: null },
      { path: "/ui", label: "Pemeriksaan komponen", waitText: "Enam komponen dasar", role: null },
      { path: "/petugas", label: "Dasbor petugas", waitText: "Dasbor Petugas", role: "petugas@sialokasi.demo" },
      { path: "/petugas/laporan/baru", label: "Buat laporan", waitText: "Judul laporan", role: "petugas@sialokasi.demo" },
      {
        path: `/petugas/laporan/${ids["SIA-DEMO1"]}`,
        label: "Faktor & estimasi",
        waitText: "Faktor & estimasi bantuan",
        role: "petugas@sialokasi.demo",
      },
      {
        path: `/petugas/laporan/${ids["SIA-DEMO1"]}/ajukan`,
        label: "Ajukan laporan",
        waitText: "Laporan belum siap diajukan",
        role: "petugas@sialokasi.demo",
      },
      { path: "/notifikasi", label: "Notifikasi petugas", waitText: "Log notifikasi", role: "petugas@sialokasi.demo" },
      { path: "/pimpinan", label: "Dasbor pimpinan", waitText: "Antrian keputusan", role: "pimpinan@sialokasi.demo" },
      {
        path: `/pimpinan/laporan/${ids["SIA-DEMO1"]}`,
        label: "Tinjau laporan",
        waitText: "Tinjau laporan",
        role: "pimpinan@sialokasi.demo",
      },
      {
        path: `/pimpinan/izin/${ids["SIA-DEMO2"]}`,
        label: "Izin distribusi",
        waitText: "Izin Distribusi Bantuan",
        role: "pimpinan@sialokasi.demo",
      },
      { path: "/pimpinan/rekap", label: "Rekap pimpinan", waitText: "Rekap laporan bantuan", role: "pimpinan@sialokasi.demo" },
      { path: "/stok", label: "Stok & jurnal", waitText: "Ringkasan stok per posko", role: "pimpinan@sialokasi.demo" },
      { path: "/notifikasi", label: "Notifikasi pimpinan", waitText: "Log notifikasi", role: "pimpinan@sialokasi.demo" },
      { path: "/admin", label: "Dasbor admin", waitText: "Dasbor Admin", role: "admin@sialokasi.demo" },
      { path: "/admin/akun", label: "Akun & peran", waitText: "Kelola akses semua peran", role: "admin@sialokasi.demo" },
      { path: "/admin/bantuan", label: "Jenis bantuan", waitText: "Jenis bantuan", role: "admin@sialokasi.demo" },
      { path: "/admin/wilayah", label: "Wilayah & posko", waitText: "Wilayah & posko", role: "admin@sialokasi.demo" },
      { path: "/admin/audit", label: "Audit & riwayat", waitText: "Audit & riwayat perubahan", role: "admin@sialokasi.demo" },
      { path: "/dev", label: "Panel demo", waitText: "Kontrol demo SiAlokasi", role: "admin@sialokasi.demo" },
      { path: "/notifikasi", label: "Notifikasi admin", waitText: "Log notifikasi", role: "admin@sialokasi.demo" },
    ];
    const widths = [360, 768, 1366, 1920];
    let currentRole = "admin@sialokasi.demo";

    for (const page of pages) {
      if (page.role !== currentRole) {
        if (page.role === null) {
          await logout();
        } else {
          await loginAs(page.role);
        }
        currentRole = page.role;
      }

      for (const width of widths) {
        const result = await layoutCheck(page, width, width < 768 ? 844 : 1000);
        const ok = !result.overflow && result.smallText === 0 && result.smallTargets === 0;
        layoutResults.push({ page: page.label, width, ...result, ok });
        console.log(
          `  ${ok ? "OK   " : "GAGAL"} ${page.label} ${width}px: overflow=${result.overflow} teksKecil=${result.smallText} targetKecil=${result.smallTargets}`,
        );
      }
    }

    console.log("\nMengembalikan demo ke kondisi nol transaksi");
    await loginAs("admin@sialokasi.demo");
    await evaluate(`fetch("/api/dev/reset", { method: "POST" })`);

    const summary = {
      generatedAt: new Date().toISOString(),
      baseUrl,
      widths,
      pagesChecked: pages.length,
      layoutResults,
      printResults,
      printMedia: { first: printCheck, correction: correctionPrintCheck },
      printPageCounts: { first: firstPages, correction: correctionPages },
      consoleErrors,
      pageErrors,
    };
    await writeFile(
      path.join(outputDir, "hasil-uji.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
      "utf8",
    );
    console.log("  Ringkasan: docs/bukti/m5/hasil-uji.json");

    console.log("\nKesalahan konsol:", consoleErrors.length);
    for (const error of consoleErrors) console.log(`  - ${error}`);
    console.log("Kesalahan halaman:", pageErrors.length);
    for (const error of pageErrors) console.log(`  - ${error}`);
  } finally {
    cdp.close();
  }
}

main().catch((error) => {
  console.error("Uji peramban M5 gagal.");
  console.error(error);
  process.exitCode = 1;
});
