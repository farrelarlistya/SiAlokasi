import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Uji revisi formulir laporan & dasbor pimpinan di Chrome sungguhan lewat
 * DevTools Protocol, sekaligus menyimpan tangkapan layar bukti.
 * Jalankan setelah `npm run dev` menyala dan Chrome dengan
 * `--remote-debugging-port=9222` terbuka.
 *
 *   node scripts/capture-revisi.mjs
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const outputDir = path.join(root, "docs/bukti/revisi-2026-11-13");
const baseUrl = process.env.WEB_URL ?? "http://localhost:5173";
const cdpUrl = process.env.CDP_URL ?? "http://127.0.0.1:9222";

const consoleErrors = [];
const pageErrors = [];
const checks = [];

function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`  ${ok ? "OK  " : "GAGAL"} ${name}${detail ? ` (${detail})` : ""}`);
}

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

  async function setViewport(width, height) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
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

  async function screenshot(name, width = 1440, height = 1000) {
    await setViewport(width, height);
    await delay(700);
    const result = await cdp.send("Page.captureScreenshot", { format: "png" });
    await writeFile(path.join(outputDir, name), Buffer.from(result.data, "base64"));
    console.log(`  Tangkapan layar: docs/bukti/revisi-2026-11-13/${name}`);
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

  try {
    await setViewport(1440, 1000);
    await navigate(`${baseUrl}/`, "Kejadian aktif");

    console.log("\n[0] Masuk lewat form email + kata sandi");
    await navigate(`${baseUrl}/masuk`, "Masuk ke SiAlokasi");
    check(
      "halaman masuk menampilkan kata sandi demo",
      await evaluate(`document.body.innerText.includes("Sialokasi#2026")`),
    );
    await setField("#login-email", "petugas@sialokasi.demo");
    await setField("#login-password", "Sialokasi#2026");
    await clickText("button", "Masuk");
    await waitForText("Laporan terbaru");
    check("masuk dengan email + kata sandi berhasil", true);

    console.log("\n[1] Formulir laporan baru");
    await evaluate(`window.localStorage.removeItem("sialokasi.draft.laporan-baru")`);
    await navigate(`${baseUrl}/petugas/laporan/baru`, "Laporan baru");
    await cdp.send("Page.reload");
    await delay(1_500);
    await waitForText("Laporan baru");

    check(
      "tidak ada kotak koordinat gabungan",
      await evaluate(`!document.body.innerText.includes("Belum ada titik")`),
    );
    check(
      "radius hanya memakai geser (tanpa kolom ketikan)",
      (await evaluate(`document.querySelector("#incident-radius-number") === null`)),
    );
    check(
      "pilihan kecamatan manual sudah dilepas",
      (await evaluate(`document.querySelector("#incident-region") === null`)),
    );

    await setField("#incident-title", "Banjir di Wonokromo RW 03");
    await setField("#incident-lat", "-7.3002");
    await setField("#incident-lng", "112.7382");
    await setField("#incident-radius", "1200");
    await waitForText("Kecamatan terdampak");
    await waitForText("Wonokromo");
    check("kecamatan terdeteksi otomatis dari titik", true, "Wonokromo");
    await screenshot("01-formulir-titik-otomatis.png");

    await setField("#incident-disaster", "LAINNYA");
    await evaluate(
      `new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`,
    );
    check(
      "kolom jenis bencana lainnya muncul saat memilih Lainnya",
      await evaluate(`document.querySelector("#incident-disaster-detail") !== null`),
    );
    await setField("#incident-disaster-detail", "Tanah longsor");
    await screenshot("02-formulir-lainnya.png");

    console.log("\n[2] Faktor & estimasi");
    await clickText("button", "Simpan & lanjut");
    await waitForText("Faktor lapangan");
    check(
      "kolom perkiraan lama penanganan sudah dihapus",
      await evaluate(`document.querySelector("#factor-days") === null`),
    );

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
    check("perhitungan otomatis tetap jalan tanpa lama penanganan", true);
    check(
      "jenis bencana Lainnya tampil dengan keterangan petugas",
      await evaluate(`document.body.innerText.includes("Tanah longsor")`),
    );
    await screenshot("03-faktor-estimasi.png");

    console.log("\n[3] Pengajuan dan dasbor pimpinan");
    await clickText("a", "Ajukan ke pimpinan");
    await waitForText("Ajukan laporan ke pimpinan");
    await clickText("button", "Ajukan ke pimpinan");
    await waitForText("Ajukan laporan ini ke pimpinan?");
    await clickText("button", "Ya, ajukan sekarang");
    await waitForText("Menunggu keputusan pimpinan");

    await loginAs("pimpinan@sialokasi.demo");
    await navigate(`${baseUrl}/pimpinan`, "Antrian keputusan");
    await waitForText("Banjir di Wonokromo RW 03");
    await waitForText("Bantuan menunggu keputusan");
    check(
      "angka gabungan 'Bantuan menunggu' diganti rincian per jenis",
      await evaluate(
        `document.body.innerText.includes("Jenis bantuan menunggu") && document.body.innerText.includes("Bantuan menunggu keputusan")`,
      ),
    );
    await screenshot("04-dasbor-antrian.png");

    console.log("\n[4] Menyetujui lalu membuka laporan dari dasbor");
    await clickText("a", "Tinjau laporan");
    await waitForText("Rekomendasi bantuan");
    await evaluate(
      `new Promise((resolve, reject) => {
        const started = Date.now();
        const timer = setInterval(() => {
          const select = document.querySelector("#posko-tujuan");
          if (select && select.options.length > 0) {
            clearInterval(timer);
            resolve(true);
          } else if (Date.now() - started > 15_000) {
            clearInterval(timer);
            reject(new Error("Pilihan posko tujuan belum siap."));
          }
        }, 200);
      })`,
    );
    await setField("#posko-tujuan", "posko_balai_kota");
    await clickText("button", "Setujui & terbitkan izin");
    await waitForText("Setujui laporan dan terbitkan izin?");
    await clickText("button", "Ya, setujui & terbitkan");
    await waitForText("Izin Distribusi Bantuan");

    await navigate(`${baseUrl}/pimpinan`, "Menunggu distribusi");
    await waitForText("Banjir di Wonokromo RW 03");
    check(
      "laporan yang disetujui muncul di daftar menunggu distribusi",
      await evaluate(`document.body.innerText.includes("Buka untuk menandai selesai")`),
    );
    await screenshot("05-dasbor-menunggu-distribusi.png");

    await clickText("a", "Buka untuk menandai selesai");
    await waitForText("Rekomendasi bantuan");
    await waitForText("Izin distribusi");
    await clickText("button", "Tandai distribusi selesai");
    await waitForText("Tandai distribusi selesai?");
    await clickText("button", "Ya, tandai selesai");
    await waitForText("Distribusi laporan ini sudah selesai.");
    check("bisa menandai selesai langsung dari laporan yang dibuka", true);
    await screenshot("06-laporan-selesai.png");

    await navigate(`${baseUrl}/pimpinan`, "Antrian keputusan");
    await evaluate(
      `new Promise((resolve) => setTimeout(() => resolve(document.body.innerText.includes("Menunggu distribusi")), 800))`,
    ).then((stillListed) => check("laporan selesai hilang dari daftar", !stillListed));

    console.log("\nHasil pemeriksaan:");
    const failed = checks.filter((item) => !item.ok);
    console.log(`  ${checks.length - failed.length} lulus, ${failed.length} gagal`);
    console.log(`Kesalahan konsol: ${consoleErrors.length}`);
    for (const error of consoleErrors) console.log(`  - ${error}`);
    console.log(`Kesalahan halaman: ${pageErrors.length}`);
    for (const error of pageErrors) console.log(`  - ${error}`);

    if (failed.length > 0) process.exitCode = 1;
  } finally {
    cdp.close();
  }
}

main().catch((error) => {
  console.error("Uji peramban gagal.");
  console.error(error);
  process.exitCode = 1;
});
