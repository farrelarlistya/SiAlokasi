import type {
  AdjustRecommendationItemInput,
  AidItemInput,
  AuthMeResponse,
  CancelIncidentInput,
  CorrectionInput,
  DecisionInput,
  IncidentDetailView,
  IncidentDraftInput,
  IncidentFactorsInput,
  IncidentPatchInput,
  IncidentStatus,
  LoginResponse,
  MutationResponse,
  NotificationListResponse,
  NotificationReadInput,
  PimpinanCancelInput,
  PimpinanIncidentDetailView,
  PoskoInput,
  PublicIncidentTracking,
  RecapFilter,
  RecapResponse,
  RegionInput,
  Role,
  StockMovementView,
} from "@sialokasi/shared";

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
  disasterDetail: string | null;
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

export type StockMovementList = {
  movements: StockMovementView[];
  note: string;
};

export type AdminAuditEntry = {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  before: unknown;
  after: unknown;
  actorName: string;
  actorRole: Role | null;
  createdAt: string;
};

export type AdminAuditList = {
  entries: AdminAuditEntry[];
  total: number;
  limit: number;
  offset: number;
  options: { entities: string[]; actions: string[] };
  note: string;
};

export type AdminIncidentLog = {
  id: string;
  fromStatus: IncidentStatus | null;
  toStatus: IncidentStatus;
  note: string | null;
  actorName: string;
  incidentId: string;
  incidentCode: string;
  incidentTitle: string;
  createdAt: string;
};

export type AdminIncidentLogList = {
  logs: AdminIncidentLog[];
  total: number;
  limit: number;
  offset: number;
  note: string;
};

export type DevStatus = {
  demoMode: boolean;
  offsetMinutes: number;
  bisnisNow: string;
  counts: { incidents: number; permits: number; auditLogs: number; movements: number; notifications: number };
  examples: { code: string; title: string; target: string }[];
};

export type DevClockResponse = {
  offsetMinutes: number;
  bisnisNow: string;
  message: string;
};

export type DevResetResponse = {
  result: { users: number; regions: number; poskos: number; aidItems: number; stocks: number; incidents: number };
  elapsedMs: number;
  message: string;
};

export type DevSeedExamplesResponse = {
  incidents: number;
  elapsedMs: number;
  message: string;
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
    lowStockCount: number;
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
    disasterDetail: string | null;
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
  /** Rincian bantuan yang menunggu keputusan, per jenis dan satuan. */
  waitingAid: {
    itemCount: number;
    items: { name: string; unit: string; qty: number }[];
  };
  queue: {
    id: string;
    code: string;
    title: string;
    disasterType: string;
    disasterDetail: string | null;
    status: IncidentStatus;
    occurredAt: string;
    affectedPeople: number;
    radiusM: number;
    lat: number;
    lng: number;
    region: { name: string } | null;
    reporter: { name: string };
  }[];
  /** Laporan yang sudah disetujui dan menunggu penandaan selesai. */
  approved: {
    id: string;
    code: string;
    title: string;
    disasterType: string;
    disasterDetail: string | null;
    occurredAt: string;
    approvedAt: string;
    regionName: string | null;
    permitNumber: string | null;
    poskoName: string | null;
  }[];
};

export type PetugasIncidentList = {
  incidents: {
    id: string;
    code: string;
    title: string;
    disasterType: string;
    disasterDetail: string | null;
    status: IncidentStatus;
    occurredAt: string;
    affectedPeople: number;
    radiusM: number;
    region: { name: string } | null;
  }[];
  total: number;
};

export type IncidentMutation = {
  data: IncidentDetailView;
  message: string;
};

export type PimpinanIncidentMutation = {
  data: PimpinanIncidentDetailView;
  message: string;
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

  login: (email: string, password: string) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  me: () => request<AuthMeResponse>("/api/auth/me"),
  logout: () => request<{ message: string }>("/api/auth/logout", { method: "POST" }),
  register: (body: { name: string; email: string; password: string; regionId: string }) =>
    request<{ message: string }>("/api/auth/register", { method: "POST", body }),

  publicIncidents: (filters: { disasterType?: string; regionId?: string } = {}) =>
    request<{ incidents: PublicIncident[]; total: number; note: string }>(
      withQuery("/api/public/incidents", filters),
    ),

  petugasDashboard: () => request<PetugasDashboard>("/api/petugas/dashboard"),  petugasIncidents: () => request<PetugasIncidentList>("/api/petugas/incidents"),
  petugasIncident: (id: string) =>
    request<{ data: IncidentDetailView }>(`/api/petugas/incidents/${id}`),
  createIncident: (body: IncidentDraftInput) =>
    request<IncidentMutation>("/api/petugas/incidents", { method: "POST", body }),
  updateIncident: (id: string, body: IncidentPatchInput) =>
    request<IncidentMutation>(`/api/petugas/incidents/${id}`, { method: "PATCH", body }),
  estimateIncident: (id: string, body: IncidentFactorsInput) =>
    request<IncidentMutation>(`/api/petugas/incidents/${id}/factors`, {
      method: "POST",
      body,
    }),
  submitIncident: (id: string) =>
    request<IncidentMutation>(`/api/petugas/incidents/${id}/submit`, { method: "POST" }),
  cancelIncident: (id: string, body: CancelIncidentInput = {}) =>
    request<IncidentMutation>(`/api/petugas/incidents/${id}/cancel`, {
      method: "POST",
      body,
    }),

  pimpinanSummary: () => request<PimpinanSummary>("/api/pimpinan/summary"),
  pimpinanIncident: (id: string) =>
    request<{ data: PimpinanIncidentDetailView }>(`/api/pimpinan/incidents/${id}`),
  adjustIncidentItem: (id: string, itemId: string, body: AdjustRecommendationItemInput) =>
    request<PimpinanIncidentMutation>(`/api/pimpinan/incidents/${id}/items/${itemId}`, {
      method: "PATCH",
      body,
    }),
  decideIncident: (id: string, body: DecisionInput) =>
    request<PimpinanIncidentMutation>(`/api/pimpinan/incidents/${id}/decision`, {
      method: "POST",
      body,
    }),
  completeIncident: (id: string) =>
    request<PimpinanIncidentMutation>(`/api/pimpinan/incidents/${id}/complete`, {
      method: "POST",
    }),
  cancelIncidentByPimpinan: (id: string, body: PimpinanCancelInput) =>
    request<PimpinanIncidentMutation>(`/api/pimpinan/incidents/${id}/cancel`, {
      method: "POST",
      body,
    }),
  correctIncidentPermit: (id: string, body: CorrectionInput) =>
    request<PimpinanIncidentMutation>(`/api/pimpinan/incidents/${id}/corrections`, {
      method: "POST",
      body,
    }),
  recap: (filters: RecapFilter) =>
    request<RecapResponse>(
      withQuery("/api/pimpinan/recap", {
        from: filters.from,
        to: filters.to,
        regionId: filters.regionId,
        disasterType: filters.disasterType,
        groupBy: filters.groupBy,
      }),
    ),

  publicTracking: (code: string) =>
    request<PublicIncidentTracking>(`/api/public/incidents/${encodeURIComponent(code)}`),

  notifications: (options: { limit?: number; unreadOnly?: boolean } = {}) =>
    request<NotificationListResponse>(
      withQuery("/api/notifications", {
        limit: String(options.limit ?? 20),
        unread: options.unreadOnly ? "1" : undefined,
      }),
    ),
  markNotificationsRead: (body: NotificationReadInput) =>
    request<{ updated: number; message: string }>("/api/notifications/read", {
      method: "POST",
      body,
    }),

  stockSummary: () => request<StockSummary>("/api/stock/summary"),
  stockMovements: (limit = 40) =>
    request<StockMovementList>(withQuery("/api/stock/movements", { limit: String(limit) })),

  adminSummary: () => request<AdminSummaryResponse>("/api/admin/summary"),
  adminAudit: (filters: { entity?: string; action?: string; search?: string; limit?: number; offset?: number } = {}) =>
    request<AdminAuditList>(
      withQuery("/api/admin/audit", {
        entity: filters.entity,
        action: filters.action,
        search: filters.search,
        limit: filters.limit?.toString(),
        offset: filters.offset?.toString(),
      }),
    ),
  adminIncidentLogs: (limit = 30, offset = 0) =>
    request<AdminIncidentLogList>(
      withQuery("/api/admin/incident-logs", {
        limit: String(limit),
        offset: String(offset),
      }),
    ),
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

  devStatus: () => request<DevStatus>("/api/dev/status"),
  devSetClock: (offsetMinutes: number) =>
    request<DevClockResponse>("/api/dev/clock", {
      method: "PATCH",
      body: { offsetMinutes },
    }),
  devReset: () => request<DevResetResponse>("/api/dev/reset", { method: "POST" }),
  devSeedExamples: () =>
    request<DevSeedExamplesResponse>("/api/dev/seed-examples", { method: "POST" }),
};

/** Tautan langsung untuk mengunduh CSV rekap; cookie sesi ikut terkirim. */
export function recapCsvUrl(filters: RecapFilter): string {
  return withQuery("/api/pimpinan/recap/export.csv", {
    from: filters.from,
    to: filters.to,
    regionId: filters.regionId,
    disasterType: filters.disasterType,
    groupBy: filters.groupBy,
  });
}
