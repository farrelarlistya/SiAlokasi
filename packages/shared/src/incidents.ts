import type {
  DamageLevel,
  DensityLevel,
  DisasterType,
  IncidentStatus,
  RoadAccess,
  WeatherCondition,
} from "./domain";

/** Bentuk data yang aman ditampilkan ke petugas dan pimpinan. */
export type IncidentFactorsView = {
  affectedPeople: number;
  damageLevel: DamageLevel;
  vulnerableBabies: number;
  vulnerableElderly: number;
  vulnerablePregnant: number;
  vulnerableDisabled: number;
  roadAccess: RoadAccess;
  weather: WeatherCondition;
  density: DensityLevel;
};

export type RecommendationItemView = {
  id: string;
  aidItemId: string;
  name: string;
  icon: string;
  unit: string;
  baseQty: number;
  finalQty: number;
  reason: string;
  adjustReason: string | null;
};

export type RecommendationView = {
  id: string;
  modelVersion: string;
  totalPeople: number;
  generatedAt: string;
  items: RecommendationItemView[];
};

export type IncidentLogView = {
  id: string;
  fromStatus: IncidentStatus | null;
  toStatus: IncidentStatus;
  note: string | null;
  actorName: string | null;
  createdAt: string;
};

export type DecisionView = {
  id: string;
  decision: "APPROVE" | "REJECT";
  reason: string | null;
  decidedAt: string;
  deciderName: string;
};

export type PermitItemView = {
  id: string;
  aidItemId: string;
  name: string;
  unit: string;
  qty: number;
  reason: string | null;
};

export type PermitView = {
  id: string;
  number: string;
  issuedAt: string;
  validUntil: string | null;
  status: string;
  posko: { id: string; name: string; regionName: string };
  issuedBy: { name: string };
  items: PermitItemView[];
  /** Diisi bila izin ini sudah digantikan oleh izin koreksi. */
  supersededAt: string | null;
  supersededByNumber: string | null;
  /** Diisi bila izin ini adalah hasil koreksi dari izin sebelumnya. */
  replacesNumber: string | null;
};

export type CorrectionItemView = {
  aidItemId: string;
  name: string;
  unit: string;
  beforeQty: number;
  afterQty: number;
};

export type IncidentCorrectionView = {
  id: string;
  reason: string;
  actorName: string;
  createdAt: string;
  previousPermitNumber: string;
  newPermitNumber: string;
  items: CorrectionItemView[];
};

export type StockMovementView = {
  id: string;
  poskoId: string;
  poskoName: string;
  aidItemId: string;
  aidItemName: string;
  unit: string;
  qtyDelta: number;
  balanceAfter: number;
  kind: "RESERVE" | "RELEASE" | "ADJUST";
  permitNumber: string | null;
  actorName: string | null;
  note: string | null;
  createdAt: string;
};

export type IncidentDetailView = {
  id: string;
  code: string;
  title: string;
  disasterType: DisasterType;
  /** Keterangan bebas saat jenis bencana "Lainnya". */
  disasterDetail: string | null;
  lat: number;
  lng: number;
  radiusM: number;
  occurredAt: string;
  status: IncidentStatus;
  affectedPeople: number | null;
  region: { id: string; name: string } | null;
  reporter: { id: string; name: string } | null;
  factors: IncidentFactorsView | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  recommendation: RecommendationView | null;
  logs: IncidentLogView[];
  permit: PermitView | null;
  decision: DecisionView | null;
  corrections: IncidentCorrectionView[];
};

export type PoskoStockView = {
  id: string;
  name: string;
  regionName: string;
  stocks: { aidItemId: string; qty: number }[];
};

export type PimpinanIncidentDetailView = IncidentDetailView & {
  poskos: PoskoStockView[];
};

export type StockNeed = { aidItemId: string; qty: number };
export type StockRow = { aidItemId: string; qty: number };

export type StockComparison = {
  aidItemId: string;
  available: number;
  needed: number;
  shortage: number;
};

/** Membandingkan kebutuhan izin dengan stok satu posko tanpa mengubah data. */
export function compareStock(needs: StockNeed[], stocks: StockRow[]): StockComparison[] {
  const availableByItem = new Map<string, number>();
  for (const row of stocks) {
    availableByItem.set(row.aidItemId, row.qty);
  }

  return needs.map((need) => {
    const available = availableByItem.get(need.aidItemId) ?? 0;
    return {
      aidItemId: need.aidItemId,
      available,
      needed: need.qty,
      shortage: Math.max(0, need.qty - available),
    };
  });
}

/** Bentuk data lacak publik: tanpa identitas pelapor dan tanpa catatan internal. */
export type PublicIncidentTracking = {
  incident: {
    code: string;
    title: string;
    disasterType: DisasterType;
    disasterDetail: string | null;
    regionName: string | null;
    occurredAt: string;
    status: IncidentStatus;
    affectedPeople: number | null;
    radiusM: number;
    lat: number;
    lng: number;
  };
  timeline: { status: IncidentStatus; at: string }[];
  aid: {
    modelVersion: string;
    totalPeople: number;
    items: { name: string; unit: string; qty: number; reason: string }[];
  } | null;
  permit: {
    number: string;
    issuedAt: string;
    validUntil: string | null;
    poskoName: string;
    status: string;
  } | null;
  note: string;
};
