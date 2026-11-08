import type {
  AuthMeResponse,
  LoginResponse,
  MutationResponse,
  RequestCodeResponse,
  Role,
} from "@sialokasi/shared";
import type { AidItemInput, IncidentStatus, PoskoInput, RegionInput } from "@sialokasi/shared";

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

export type MasterOptions = {
  aidItems: {
    id: string;
    name: string;
    unit: string;
    icon: string;
    standardPerPerson: number;
  }[];
  regions: { id: string; name: string }[];
  poskos: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    region: { id: string; name: string };
  }[];
};

export type PublicIncident = {
  id: string;
  code: string;
  title: string;
  disasterType: string;
  lat: number;
  lng: number;
  radiusM: number;
  occurredAt: string;
  status: IncidentStatus;
  affectedPeople: number;
  region: { id: string; name: string } | null;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  region: { id: string; name: string } | null;
};

export type AdminUserList = {
  users: AdminUser[];
  summary: { total: number; pending: number };
};

export type AdminAidItem = {
  id: string;
  name: string;
  unit: string;
  icon: string;
  standardPerPerson: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  usageCount: number;
  stockRows: number;
};

export type AdminAidItemList = {
  items: AdminAidItem[];
  summary: { total: number; active: number; inactive: number };
};

export type AdminRegion = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  poskoCount: number;
  incidentCount: number;
  userCount: number;
};

export type AdminRegionList = {
  regions: AdminRegion[];
  summary: { total: number; active: number };
};

export type AdminPosko = {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  regionActive: boolean;
  lat: number;
  lng: number;
  isActive: boolean;
  createdAt: string;
  stockRows: number;
  permitCount: number;
};

export type AdminPoskoList = {
  poskos: AdminPosko[];
  summary: { total: number; active: number };
};

export type StockSummary = {
  aidItems: { id: string; name: string; unit: string; icon: string; sortOrder: number }[];
  poskos: {
    id: string;
    name: string;
    regionName: string;
    stocks: { aidItemId: string; qty: number }[];
  }[];
  note: string;
};

export type AdminSummaryResponse = {
  summary: {
    pendingUsers: number;
    activeUsers: number;
    activeAidItems: number;
    activeRegions: number;
    activePoskos: number;
    incidents: number;
    recommendations: number;
    permits: number;
  };
  audit: {
    id: string;
    entity: string;
    entityId: string;
    action: string;
    actorName: string;
    createdAt: string;
  }[];
};

export type PetugasDashboard = {
  counts: Record<IncidentStatus, number>;
  total: number;
  recent: {
    id: string;
    code: string;
    title: string;
    disasterType: string;
    status: IncidentStatus;
    occurredAt: string;
    affectedPeople: number;
    region: { name: string } | null;
  }[];
  profile: { name: string; regionName: string | null } | null;
};

export type PimpinanSummary = {
  summary: {
    waitingCount: number;
    activeCount: number;
    affectedPeople: number;
    permitsToday: number;
    lowStockCount: number;
  };
  queue: {
    id: string;
    code: string;
    title: string;
    disasterType: string;
    status: IncidentStatus;
    occurredAt: string;
    affectedPeople: number;
    radiusM: number;
    lat: number;
    lng: number;
    region: { name: string } | null;
    reporter: { name: string };
  }[];
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      credentials: "same-origin",
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch {
    throw new ApiError(
      "Layanan belum bisa dihubungi. Periksa koneksi, lalu tekan Coba lagi.",
      0,
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

    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

function withQuery(path: string, query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export const api = {
  health: () => request<HealthResponse>("/api/health"),
  masterSummary: () => request<MasterSummary>("/api/master/summary"),
  masterOptions: () => request<MasterOptions>("/api/master/options"),

  requestCode: (email: string) =>
    request<RequestCodeResponse>("/api/auth/request-code", {
      method: "POST",
      body: { email },
    }),
  login: (email: string, code: string) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: { email, code },
    }),
  me: () => request<AuthMeResponse>("/api/auth/me"),
  logout: () => request<{ message: string }>("/api/auth/logout", { method: "POST" }),
  register: (body: { name: string; email: string; regionId: string }) =>
    request<{ message: string }>("/api/auth/register", { method: "POST", body }),

  publicIncidents: (filters: { disasterType?: string; regionId?: string } = {}) =>
    request<{ incidents: PublicIncident[]; total: number; note: string }>(
      withQuery("/api/public/incidents", filters),
    ),

  petugasDashboard: () => request<PetugasDashboard>("/api/petugas/dashboard"),
  pimpinanSummary: () => request<PimpinanSummary>("/api/pimpinan/summary"),
  stockSummary: () => request<StockSummary>("/api/stock/summary"),

  adminSummary: () => request<AdminSummaryResponse>("/api/admin/summary"),
  adminUsers: (filters: { search?: string; role?: string; status?: string } = {}) =>
    request<AdminUserList>(withQuery("/api/admin/users", filters)),
  updateUser: (id: string, body: { role?: Role; isActive?: boolean }) =>
    request<MutationResponse<AdminUser>>(`/api/admin/users/${id}`, {
      method: "PATCH",
      body,
    }),

  adminAidItems: () => request<AdminAidItemList>("/api/admin/aid-items"),
  createAidItem: (body: AidItemInput) =>
    request<MutationResponse<AdminAidItem>>("/api/admin/aid-items", {
      method: "POST",
      body,
    }),
  updateAidItem: (id: string, body: Partial<AidItemInput>) =>
    request<MutationResponse<AdminAidItem>>(`/api/admin/aid-items/${id}`, {
      method: "PATCH",
      body,
    }),

  adminRegions: () => request<AdminRegionList>("/api/admin/regions"),
  createRegion: (body: RegionInput) =>
    request<MutationResponse<AdminRegion>>("/api/admin/regions", {
      method: "POST",
      body,
    }),
  updateRegion: (id: string, body: Partial<RegionInput>) =>
    request<MutationResponse<AdminRegion>>(`/api/admin/regions/${id}`, {
      method: "PATCH",
      body,
    }),

  adminPoskos: () => request<AdminPoskoList>("/api/admin/poskos"),
  createPosko: (body: PoskoInput) =>
    request<MutationResponse<AdminPosko>>("/api/admin/poskos", {
      method: "POST",
      body,
    }),
  updatePosko: (id: string, body: Partial<PoskoInput>) =>
    request<MutationResponse<AdminPosko>>(`/api/admin/poskos/${id}`, {
      method: "PATCH",
      body,
    }),
};
