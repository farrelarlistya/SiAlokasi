import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Bukti revisi hierarki & fokus section.
 * Jalankan setelah `npm run dev` menyala dan Chrome dibuka dengan port 9222:
 *   chrome --remote-debugging-port=9222
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const outputDir = path.join(root, "docs/bukti/hierarki-fokus");
const baseUrl = process.env.WEB_URL ?? "http://localhost:5173";
const cdpUrl = process.env.CDP_URL ?? "http://127.0.0.1:9222";

const consoleErrors = [];
const pageErrors = [];
const checks = [];
const screenshots = [];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function check(name, passed, detail) {
  checks.push({ name, passed: Boolean(passed), detail });
  if (!passed) throw new Error(`Pemeriksaan gagal: ${name}${detail ? ` — ${JSON.stringify(detail)}` : ""}`);
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
    await delay(700);
  }

  async function api(pathname, method = "GET", body) {
    return evaluate(`fetch(${JSON.stringify(pathname)}, {
      method: ${JSON.stringify(method)},
      headers: ${body ? '{ "Content-Type": "application/json" }' : "{}"},
      ${body ? `body: ${JSON.stringify(JSON.stringify(body))}` : ""}
    }).then(async (response) => ({ status: response.status, body: await response.json().catch(() => null) }))`);
  }

  async function login(email) {
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

  async function logout() {
    await evaluate(`fetch("/api/auth/logout", { method: "POST" })`);
  }

  async function auditPage(label, options = {}) {
    const result = await evaluate(`(() => {
      const root = document.documentElement;
      const overflow = root.scrollWidth > window.innerWidth + 1;
      const visible = (el) => {
        const style = getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden";
      };
      const smallText = [...document.querySelectorAll("body *")].filter((el) => {
        if (!visible(el)) return false;
        if (el.closest(".leaflet-container") || el.closest(".sr-only") || el.closest(".print-document")) return false;
        const text = (el.textContent || "").trim();
        if (!text) return false;
        return parseFloat(getComputedStyle(el).fontSize) < 16;
      }).length;
      const smallTargets = [...document.querySelectorAll("button, input, select, textarea, summary, a")].filter((el) => {
        if (!visible(el)) return false;
        if (el.closest(".leaflet-container") || el.closest(".sr-only") || el.closest(".print-document")) return false;
        const style = getComputedStyle(el);
        if (el.tagName === "A" && style.display === "inline") return false;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        return rect.width < 44 || rect.height < 44;
      }).length;
      const focusBlocks = [...document.querySelectorAll(".focus-rule")].filter(
        (el) => !el.closest(".print-document"),
      ).length;
      const focus = [...document.querySelectorAll(".focus-rule")].find(
        (el) => !el.closest(".print-document"),
      );
      const focusHeading = focus ? focus.querySelector("h2, h3") : null;
      const h1s = [...document.querySelectorAll("h1")].filter(
        (el) => !el.closest(".print-document"),
      );
      return {
        overflow,
        smallText,
        smallTargets,
        focusBlocks,
        focusTitle: focusHeading ? focusHeading.textContent.trim() : null,
        focusTitleSize: focusHeading ? parseFloat(getComputedStyle(focusHeading).fontSize) : null,
        h1Count: h1s.length,
        h1Size: h1s[0] ? parseFloat(getComputedStyle(h1s[0]).fontSize) : null,
        h1Text: h1s[0] ? h1s[0].textContent.trim() : null,
      };
    })()`);

    checks.push({
      name: `${label}: tanpa gulir horizontal`,
      passed: !result.overflow,
      detail: result,
    });
    checks.push({
      name: `${label}: tanpa teks < 16 px`,
      passed: result.smallText === 0,
      detail: { smallText: result.smallText },
    });
    checks.push({
      name: `${label}: target sentuh ≥ 44 px`,
      passed: result.smallTargets === 0,
      detail: { smallTargets: result.smallTargets },
    });
    checks.push({
      name: `${label}: satu judul h1`,
      passed: result.h1Count === 1,
      detail: { h1Count: result.h1Count, h1Text: result.h1Text },
    });
    checks.push({
      name: `${label}: satu blok fokus`,
      passed: result.focusBlocks === 1,
      detail: { focusBlocks: result.focusBlocks },
    });
    if (!options.skipFocusTitle && result.focusTitle) {
      checks.push({
        name: `${label}: judul fokus 24 px`,
        passed: result.focusTitleSize === 24,
        detail: { title: result.focusTitle, size: result.focusTitleSize },
      });
    }
    return result;
  }

  async function screenshot(name, label, options = {}) {
    await auditPage(label ?? name, options);
    const result = await cdp.send("Page.captureScreenshot", { format: "png" });
    await writeFile(path.join(outputDir, name), Buffer.from(result.data, "base64"));
    screenshots.push(name);
    console.log(`  ${name}`);
  }

  async function viewportScreenshot(width, height, name, label, options = {}) {
    await setViewport(width, height);
    await delay(600);
    await screenshot(name, label, options);
  }

  // ---------- P1 kosong & A1/A2 ----------
  await setViewport(1440, 1000);
  await navigate(`${baseUrl}/`, "Kejadian aktif");
  await evaluate("localStorage.clear(); sessionStorage.clear();");
  await navigate(`${baseUrl}/`, "Kejadian aktif");
  await screenshot("01-p1-kosong-1440.png", "P1 kosong 1440");
  await viewportScreenshot(390, 844, "02-p1-kosong-390.png", "P1 kosong 390");

  await setViewport(1440, 1000);
  await navigate(`${baseUrl}/masuk`, "Masuk ke SiAlokasi");
  await screenshot("03-a1-masuk-1440.png", "A1 masuk 1440", { skipFocusTitle: true });
  await viewportScreenshot(390, 844, "04-a1-masuk-390.png", "A1 masuk 390", { skipFocusTitle: true });
  await setViewport(1440, 1000);
  await navigate(`${baseUrl}/daftar`, "Daftar sebagai petugas");
  await screenshot("05-a2-daftar-1440.png", "A2 daftar 1440", { skipFocusTitle: true });
  await viewportScreenshot(390, 844, "32-a2-daftar-390.png", "A2 daftar 390", {
    skipFocusTitle: true,
  });

  // ---------- Seed data demo ----------
  await login("admin@sialokasi.demo");
  const seed = await api("/api/dev/seed-examples", "POST");
  check("Data contoh demo terisi", seed.status === 200, seed);
  await logout();

  // ---------- P1 terpilih ----------
  await setViewport(1440, 1000);
  await navigate(`${baseUrl}/`, "Kejadian aktif");
  await delay(500);
  const selectedTitle = await evaluate(`(() => {
    const row = document.querySelector('button[aria-pressed]');
    if (!row) return null;
    row.click();
    return row.querySelector('p')?.textContent?.trim() ?? null;
  })()`);
  await delay(600);
  const focusState = await evaluate(`(() => {
    const active = document.activeElement;
    const heading = document.getElementById("rincian-kejadian");
    return {
      activeId: active?.id ?? null,
      activeText: active?.textContent?.trim() ?? null,
      headingText: heading?.textContent?.trim() ?? null,
    };
  })()`);
  check(
    "P1: memilih baris memindahkan fokus ke rincian",
    focusState.activeId === "rincian-kejadian",
    { selectedTitle, focusState },
  );
  await screenshot("06-p1-terpilih-1440.png", "P1 terpilih 1440");
  await viewportScreenshot(390, 844, "07-p1-terpilih-390.png", "P1 terpilih 390");

  // ---------- T2 ----------
  await login("petugas@sialokasi.demo");
  await setViewport(1440, 1000);
  await navigate(`${baseUrl}/petugas/laporan/baru`, "Laporan baru");
  const stepRail = await evaluate(
    `[...document.querySelectorAll('nav[aria-label="Langkah laporan"] [aria-current="step"]')].map((n) => n.textContent.trim())`,
  );
  check("T2: rel langkah menandai langkah 1", stepRail[0] === "Titik & wilayah", stepRail);
  await screenshot("08-t2-laporan-baru-1440.png", "T2 1440");
  await viewportScreenshot(390, 844, "09-t2-laporan-baru-390.png", "T2 390");

  // ---------- T3: draf baru lalu estimasi ----------
  const master = await api("/api/master/options");
  const regionId = master.body?.regions?.[0]?.id;
  check("Ada kecamatan untuk draf", Boolean(regionId), master.body?.regions?.length);
  const created = await api("/api/petugas/incidents", "POST", {
    title: "Banjir di Wonokromo RW 03",
    disasterType: "BANJIR",
    occurredAt: new Date().toISOString(),
    lat: -7.3015,
    lng: 112.738,
    radiusM: 800,
    regionId,
  });
  check("Draf laporan dibuat", created.status === 201 || created.status === 200, created);
  const incidentId = created.body?.data?.id;
  await setViewport(1440, 1000);
  await navigate(`${baseUrl}/petugas/laporan/${incidentId}`, "Faktor lapangan");
  await screenshot("10-t3-faktor-1440.png", "T3 faktor 1440");

  const estimated = await api(`/api/petugas/incidents/${incidentId}/factors`, "POST", {
    affectedPeople: 420,
    damageLevel: "SEDANG",
    vulnerableBabies: 5,
    vulnerableElderly: 20,
    vulnerablePregnant: 4,
    vulnerableDisabled: 2,
    handlingDays: 3,
    roadAccess: "TERBUKA",
    weather: "CERAH",
    density: "SEDANG",
  });
  check("Estimasi berhasil dihitung", estimated.status === 200, estimated);
  await navigate(`${baseUrl}/petugas/laporan/${incidentId}`, "Estimasi bantuan");
  await screenshot("11-t3-hasil-1440.png", "T3 hasil 1440");
  await viewportScreenshot(390, 844, "12-t3-hasil-390.png", "T3 hasil 390");
  await setViewport(1440, 1000);
  await navigate(`${baseUrl}/petugas/laporan/${incidentId}/ajukan`, "Bantuan yang diajukan");
  await screenshot("31-t4-ajukan-1440.png", "T4 ajukan 1440");
  await logout();

  // ---------- L1/L2/L3 ----------
  await login("pimpinan@sialokasi.demo");
  await setViewport(1440, 1000);
  await navigate(`${baseUrl}/pimpinan`, "Perlu keputusan");
  await screenshot("13-l1-dasbor-1440.png", "L1 1440");
  await viewportScreenshot(390, 844, "14-l1-dasbor-390.png", "L1 390");

  const summary = await api("/api/pimpinan/summary");
  const waiting = summary.body?.queue?.[0];
  check("Ada laporan menunggu keputusan", Boolean(waiting), summary.body?.summary);
  await setViewport(1440, 1000);
  await navigate(`${baseUrl}/pimpinan/laporan/${waiting.id}`, "Rekomendasi bantuan");
  const sticky = await evaluate(`(() => {
    const el = document.querySelector('.fixed.inset-x-0.bottom-16');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { visible: rect.top < window.innerHeight && rect.bottom > 0, top: rect.top, bottom: rect.bottom };
  })()`);
  check("L2: bilah keputusan terlihat tanpa menggulir", sticky?.visible, sticky);
  await screenshot("15-l2-tinjau-1440.png", "L2 1440");

  const rejectOpened = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(
      (item) => item.textContent.trim() === 'Tolak',
    );
    if (!button) return false;
    button.click();
    return true;
  })()`);
  await delay(500);
  const rejectDialog = await evaluate(`Boolean(document.querySelector('[role="dialog"]'))`);
  check("L2: dialog penolakan terbuka", rejectOpened === true && rejectDialog === true, {
    rejectOpened,
    rejectDialog,
  });
  await screenshot("38-l2-tolak-1440.png", "L2 tolak 1440");

  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
    nativeVirtualKeyCode: 27,
  });
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
    nativeVirtualKeyCode: 27,
  });
  await delay(300);
  check(
    "L2: Escape menutup dialog penolakan",
    await evaluate(`!document.querySelector('[role="dialog"]')`),
  );

  await viewportScreenshot(390, 844, "16-l2-tinjau-390.png", "L2 390");

  const incidents = await api("/api/public/incidents");
  const approved = incidents.body?.incidents?.find((item) => item.status === "DISETUJUI");
  check("Ada izin distribusi untuk L3", Boolean(approved), incidents.body?.incidents);
  await setViewport(1440, 1000);
  await navigate(`${baseUrl}/pimpinan/izin/${approved.id}`, "Izin distribusi bantuan");
  await screenshot("17-l3-izin-1440.png", "L3 1440");
  await viewportScreenshot(390, 844, "18-l3-izin-390.png", "L3 390");
  await logout();

  // ---------- P2 ----------
  await setViewport(1440, 1000);
  await navigate(`${baseUrl}/lacak`, "Lacak laporan");
  await screenshot("19-p2-kode-1440.png", "P2 kode 1440");
  await navigate(`${baseUrl}/lacak?kode=${encodeURIComponent(approved.code)}`, "Status laporan");
  await screenshot("20-p2-hasil-1440.png", "P2 hasil 1440");
  await viewportScreenshot(390, 844, "21-p2-hasil-390.png", "P2 hasil 390");

  // ---------- D1-D7 ----------
  await login("admin@sialokasi.demo");
  const adminPages = [
    ["/admin", "Perlu tindakan", "22-d1-dasbor-1440.png", "D1 1440"],
    ["/admin/akun", "Daftar akun", "23-d2-akun-1440.png", "D2 1440"],
    ["/admin/bantuan", "Daftar jenis bantuan", "24-d3-bantuan-1440.png", "D3 1440"],
    ["/admin/wilayah", "Daftar kecamatan", "25-d4-wilayah-1440.png", "D4 1440"],
    ["/stok", "Matriks stok", "26-d5-stok-1440.png", "D5 1440"],
    ["/dev", "Waktu layanan", "27-d6-demo-1440.png", "D6 1440"],
    ["/admin/audit", "Catatan perubahan", "28-d7-audit-1440.png", "D7 1440"],
  ];
  await setViewport(1440, 1000);
  for (const [path, waitText, fileName, label] of adminPages) {
    await navigate(`${baseUrl}${path}`, waitText);
    await screenshot(fileName, label);
  }

  // ---------- Keyboard: skip link, fokus pindah, Escape menutup dialog ----------
  const skipLink = await evaluate(
    `document.querySelector('a[href="#isi-utama"]')?.textContent?.trim() ?? null`,
  );
  check("Skip link 'Lewati ke isi utama' tersedia", skipLink === "Lewati ke isi utama", skipLink);

  await navigate(`${baseUrl}/admin/akun`, "Daftar akun");
  const dialogOpened = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(
      (item) => item.textContent.trim() === 'Ubah peran',
    );
    if (!button) return false;
    button.click();
    return true;
  })()`);
  await delay(400);
  const dialogVisible = await evaluate(`Boolean(document.querySelector('[role="dialog"]'))`);
  check("Dialog ubah peran bisa dibuka", dialogOpened === true && dialogVisible === true, {
    dialogOpened,
    dialogVisible,
  });

  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
    nativeVirtualKeyCode: 27,
  });
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
    nativeVirtualKeyCode: 27,
  });
  await delay(300);
  check(
    "Escape menutup dialog",
    await evaluate(`!document.querySelector('[role="dialog"]')`),
  );

  await setViewport(390, 844);
  await navigate(`${baseUrl}/admin`, "Perlu tindakan");
  await screenshot("29-d1-dasbor-390.png", "D1 390");
  await navigate(`${baseUrl}/admin/akun`, "Daftar akun");
  await screenshot("30-d2-akun-390.png", "D2 390");

  const adminMobile = [
    ["/admin/bantuan", "Daftar jenis bantuan", "33-d3-bantuan-390.png", "D3 390"],
    ["/admin/wilayah", "Daftar kecamatan", "34-d4-wilayah-390.png", "D4 390"],
    ["/stok", "Matriks stok", "35-d5-stok-390.png", "D5 390"],
    ["/dev", "Waktu layanan", "36-d6-demo-390.png", "D6 390"],
    ["/admin/audit", "Catatan perubahan", "37-d7-audit-390.png", "D7 390"],
  ];
  for (const [path, waitText, fileName, label] of adminMobile) {
    await navigate(`${baseUrl}${path}`, waitText);
    await screenshot(fileName, label);
  }

  check("Tanpa kesalahan konsol", consoleErrors.length === 0, consoleErrors);
  check("Tanpa kesalahan halaman", pageErrors.length === 0, pageErrors);

  const failed = checks.filter((entry) => !entry.passed);
  const result = {
    date: new Date().toISOString(),
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    checks,
    screenshots,
    consoleErrors,
    pageErrors,
  };
  await writeFile(path.join(outputDir, "hasil-uji.json"), `${JSON.stringify(result, null, 2)}\n`);
  await fetch(`${cdpUrl}/json/close/${tab.id}`);
  cdp.close();
  console.log(`Selesai: ${result.passed}/${result.total} pemeriksaan lulus, ${failed.length} gagal.`);
  if (failed.length > 0) {
    console.log(JSON.stringify(failed, null, 2));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
