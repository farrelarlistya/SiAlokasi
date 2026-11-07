export type HealthResponse = {
  ok: boolean;
  service: string;
  version: string;
  time: string;
  demoMode: boolean;
  database: "ok" | "down";
};

export type MasterSummary = {
  aidItems: number;
  regions: number;
  poskos: number;
  incidents: number;
};

async function request<T>(path: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, { headers: { Accept: "application/json" } });
  } catch {
    throw new Error(
      "Layanan belum bisa dihubungi. Periksa koneksi, lalu tekan Coba lagi.",
    );
  }

  if (!response.ok) {
    let message = "Data belum bisa dimuat. Coba lagi sebentar, atau hubungi admin.";

    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) {
        message = body.error.message;
      }
    } catch {
      // Pesan bawaan dipertahankan bila respons bukan JSON.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export const api = {
  health: () => request<HealthResponse>("/api/health"),
  masterSummary: () => request<MasterSummary>("/api/master/summary"),
};
