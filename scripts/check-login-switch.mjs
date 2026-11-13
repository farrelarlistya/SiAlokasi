import process from "node:process";

/**
 * Pemeriksaan alur ganti akun: keluar dari halaman pimpinan, masuk sebagai
 * petugas, dan memastikan tujuan lama tidak membawa ke halaman peran lain.
 *
 * Jalankan `npm run dev` dan Chrome dengan `--remote-debugging-port=9222`,
 * lalu `npm run verify:login`.
 */

const baseUrl = process.env.WEB_URL ?? "http://localhost:5173";
const cdpUrl = process.env.CDP_URL ?? "http://127.0.0.1:9222";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    let nextId = 0;

    socket.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          nextId += 1;
          const id = nextId;
          socket.send(JSON.stringify({ id, method, params }));
          return new Promise((ok, fail) => pending.set(id, { ok, fail }));
        },
        close() {
          socket.close();
        },
      });
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      if (message.error) entry.fail(new Error(message.error.message));
      else entry.ok(message.result);
    });

    socket.addEventListener("error", () => reject(new Error("Koneksi DevTools gagal.")));
  });
}

async function main() {
  const tab = await openTab(`${baseUrl}/`);
  const cdp = await connect(tab.webSocketDebuggerUrl);

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Page.navigate", { url: `${baseUrl}/` });
  await delay(1_200);
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  async function evaluate(expression) {
    const result = await cdp.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? "Evaluasi halaman gagal.");
    }
    return result.result.value;
  }

  async function navigate(url, waitText) {
    await cdp.send("Page.navigate", { url });
    await delay(1_000);
    if (waitText) await waitForText(waitText);
  }

  async function waitForText(text, timeout = 15_000) {
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

  async function loginAs(email) {
    const result = await evaluate(`fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ${JSON.stringify(email)}, password: "Sialokasi#2026" })
    }).then(async (response) => ({ status: response.status, body: await response.json() }))`);
    if (result.status !== 200) {
      throw new Error(`Gagal masuk sebagai ${email}: ${JSON.stringify(result.body)}`);
    }
  }

  async function pathNow() {
    return evaluate("location.pathname + location.search");
  }

  async function waitForPath(expected, timeout = 15_000) {
    await evaluate(`new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (location.pathname + location.search === ${JSON.stringify(expected)}) {
          clearInterval(timer);
          resolve(true);
        } else if (Date.now() - started > ${timeout}) {
          clearInterval(timer);
          reject(new Error("Alamat tidak menjadi " + ${JSON.stringify(expected)} + ", sekarang " + location.pathname + location.search));
        }
      }, 200);
    })`);
  }

  const checks = [];
  function check(label, ok, detail = "") {
    checks.push({ label, ok, detail });
    console.log(`  ${ok ? "OK   " : "GAGAL"} ${label}${detail ? ` (${detail})` : ""}`);
  }

  try {
    console.log("Pemeriksaan ganti akun\n");

    console.log("[1] Masuk pimpinan lalu keluar dari halaman /pimpinan");
    await loginAs("pimpinan@sialokasi.demo");
    await navigate(`${baseUrl}/pimpinan`, "Antrian keputusan");
    check("pimpinan berada di /pimpinan", (await pathNow()).startsWith("/pimpinan"));

    await evaluate(`document.querySelector('button[aria-label="Keluar dari akun"]')?.click()`);
    await waitForPath("/");
    check("keluar tidak menyisakan ?next=/pimpinan", (await pathNow()) === "/", await pathNow());
    await navigate(`${baseUrl}/`, "Kejadian aktif");

    console.log("\n[2] Masuk petugas dengan alamat tujuan lama /pimpinan");
    await loginAs("petugas@sialokasi.demo");
    await navigate(`${baseUrl}/masuk?next=%2Fpimpinan`);
    await waitForPath("/petugas");
    const forbidden = await evaluate(
      `document.body.innerText.includes("Halaman ini bukan untuk peran Anda")`,
    );
    check("petugas diarahkan ke dasbornya", (await pathNow()) === "/petugas", await pathNow());
    check("halaman bukan untuk peran tidak muncul", forbidden === false);

    console.log("\n[3] Tujuan lintas peran lain");
    await navigate(`${baseUrl}/masuk?next=%2Fadmin`);
    await waitForPath("/petugas");
    check("petugas tidak diarahkan ke /admin", (await pathNow()) === "/petugas");

    await navigate(`${baseUrl}/masuk?next=%2F%2Fevil.example`);
    await waitForPath("/petugas");
    check("alamat luar diabaikan", (await pathNow()) === "/petugas");

    await navigate(`${baseUrl}/masuk?next=%2Fnotifikasi`);
    await waitForPath("/notifikasi");
    check("halaman yang diizinkan tetap dibuka", (await pathNow()) === "/notifikasi");

    console.log("\n[4] Pimpinan tetap memakai tujuan yang sah");
    await loginAs("pimpinan@sialokasi.demo");
    await navigate(`${baseUrl}/masuk?next=%2Fpimpinan`);
    await waitForPath("/pimpinan");
    check("pimpinan tetap ke /pimpinan", (await pathNow()) === "/pimpinan");

    const failed = checks.filter((item) => !item.ok);
    console.log(`\nRingkasan: ${checks.length - failed.length} lulus, ${failed.length} gagal`);
    if (failed.length > 0) process.exitCode = 1;
  } finally {
    cdp.close();
  }
}

main().catch((error) => {
  console.error("\nPemeriksaan ganti akun gagal.");
  console.error(error);
  process.exitCode = 1;
});
