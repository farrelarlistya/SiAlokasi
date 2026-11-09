import localtunnel from "localtunnel";

/**
 * Membuka akses lintas perangkat lewat tunnel ke server web Vite.
 * Jalankan `npm run dev` lebih dahulu di terminal lain, lalu `npm run share`.
 *
 * Vite mem-proxy /api ke server lokal, jadi satu tunnel cukup untuk web + API.
 */

const port = Number(process.env.SHARE_PORT ?? 5173);
const localUrl = process.env.SHARE_URL ?? `http://localhost:${port}`;
const smokeTest = process.env.SHARE_SMOKE === "1";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkServer() {
  try {
    const response = await fetch(`${localUrl}/api/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      throw new Error(`Layanan menjawab ${response.status}.`);
    }
    return true;
  } catch (error) {
    console.error(`Server web/API belum siap di ${localUrl}.`);
    console.error("Jalankan `npm run dev` di terminal lain, lalu ulangi `npm run share`.");
    if (error instanceof Error) console.error(`Penyebab: ${error.message}`);
    return false;
  }
}

async function tunnelPassword() {
  try {
    const response = await fetch("https://loca.lt/mytunnelpassword", {
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const text = (await response.text()).trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

async function main() {
  if (!(await checkServer())) {
    process.exitCode = 1;
    return;
  }

  console.log(`Membuka tunnel untuk ${localUrl} ...`);

  let tunnel;
  try {
    tunnel = await localtunnel({
      port,
      local_host: process.env.SHARE_LOCAL_HOST ?? "localhost",
      subdomain: process.env.SHARE_SUBDOMAIN?.trim() || undefined,
    });
  } catch (error) {
    console.error("Tunnel belum bisa dibuka.");
    console.error(error instanceof Error ? error.message : error);
    console.error("");
    console.error("Periksa koneksi internet. Alternatif yang bisa dipakai:");
    console.error("  cloudflared tunnel --url http://localhost:5173");
    console.error("  ngrok http 5173");
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("Akses lintas perangkat sudah terbuka:");
  console.log(`  ${tunnel.url}`);
  console.log("");
  console.log("Buka alamat itu dari HP atau laptop lain yang terhubung internet.");
  console.log("Masuk memakai akun demo, kode selalu 123456 saat DEMO_MODE=true.");

  const password = await tunnelPassword();
  if (password) {
    console.log("");
    console.log("Jika muncul halaman pengingat localtunnel, isi kata sandi:");
    console.log(`  ${password}`);
  }

  console.log("");
  console.log("Tekan Ctrl+C untuk menutup tunnel.");

  tunnel.on("error", (error) => {
    console.error("Tunnel mengalami gangguan:", error?.message ?? error);
  });

  tunnel.on("close", () => {
    console.log("Tunnel ditutup.");
  });

  const close = () => {
    tunnel?.close();
  };

  process.on("SIGINT", () => {
    close();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    close();
    process.exit(0);
  });

  if (smokeTest) {
    console.log("");
    console.log("Uji singkat aktif (SHARE_SMOKE=1): tunnel akan ditutup otomatis.");
    await delay(8_000);
    close();
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("Akses lintas perangkat gagal disiapkan.");
  console.error(error);
  process.exitCode = 1;
});
