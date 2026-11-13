import { z } from "zod";
import { RECAP_GROUPS } from "./recap";
import {
  AID_ICON_NAMES,
  DAMAGE_LEVELS,
  DECISION_TYPES,
  DENSITY_LEVELS,
  DISASTER_DETAIL_MAX,
  DISASTER_TYPES,
  FACTOR_LIMITS,
  ROAD_ACCESS_OPTIONS,
  SURABAYA_BOUNDS,
  TRACKING_CODE_PATTERN,
  WEATHER_OPTIONS,
  roleSchema,
} from "./domain";

const requiredText = (label: string, min: number, max: number) =>
  z
    .string({ required_error: `${label} wajib diisi.` })
    .trim()
    .min(min, `${label} minimal ${min} karakter.`)
    .max(max, `${label} maksimal ${max} karakter.`);

export const emailSchema = z
  .string({ required_error: "Alamat email wajib diisi." })
  .trim()
  .min(1, "Alamat email wajib diisi.")
  .max(120, "Alamat email terlalu panjang.")
  .email("Tulis alamat email dengan format yang benar, contoh: nama@instansi.go.id.")
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string({ required_error: "Kata sandi wajib diisi." })
  .min(8, "Kata sandi minimal 8 karakter.")
  .max(72, "Kata sandi maksimal 72 karakter.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: "Kata sandi wajib diisi." })
    .min(1, "Kata sandi wajib diisi."),
});

export const registerPetugasSchema = z.object({
  name: requiredText("Nama lengkap", 3, 80),
  email: emailSchema,
  password: passwordSchema,
  regionId: z.string({ required_error: "Pilih kecamatan tempat bertugas." }).trim().min(
    1,
    "Pilih kecamatan tempat bertugas.",
  ),
});

export const trackingCodeSchema = z
  .string({ required_error: "Kode lacak wajib diisi." })
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(
    z
      .string()
      .regex(
        TRACKING_CODE_PATTERN,
        "Kode lacak terdiri dari SIA- lalu 5 huruf atau angka, contoh: SIA-7K2Q9.",
      ),
  );

const latitudeSchema = z.coerce
  .number({ invalid_type_error: "Titik lokasi belum dipilih di peta." })
  .min(-90, "Titik lokasi tidak valid.")
  .max(90, "Titik lokasi tidak valid.");

const longitudeSchema = z.coerce
  .number({ invalid_type_error: "Titik lokasi belum dipilih di peta." })
  .min(-180, "Titik lokasi tidak valid.")
  .max(180, "Titik lokasi tidak valid.");

const radiusSchema = z.coerce
  .number({ invalid_type_error: "Radius wilayah wajib diisi angka." })
  .int("Radius wilayah harus bilangan bulat meter.")
  .min(FACTOR_LIMITS.radiusM.min, `Radius minimal ${FACTOR_LIMITS.radiusM.min} meter.`)
  .max(FACTOR_LIMITS.radiusM.max, `Radius maksimal ${FACTOR_LIMITS.radiusM.max} meter.`);

const vulnerableCountSchema = z.coerce
  .number({ invalid_type_error: "Isi dengan angka 0 atau lebih." })
  .int("Jumlah harus bilangan bulat.")
  .min(FACTOR_LIMITS.vulnerable.min, "Jumlah tidak boleh negatif.")
  .max(FACTOR_LIMITS.vulnerable.max, `Jumlah maksimal ${FACTOR_LIMITS.vulnerable.max} jiwa.`);

const factorFields = {
  affectedPeople: z.coerce
    .number({ invalid_type_error: "Jumlah jiwa terdampak wajib diisi angka." })
    .int("Jumlah jiwa harus bilangan bulat.")
    .min(FACTOR_LIMITS.affectedPeople.min, "Jumlah jiwa terdampak minimal 1.")
    .max(
      FACTOR_LIMITS.affectedPeople.max,
      `Jumlah jiwa terdampak maksimal ${FACTOR_LIMITS.affectedPeople.max}.`,
    ),
  damageLevel: z.enum(DAMAGE_LEVELS, {
    required_error: "Pilih tingkat kerusakan rumah.",
  }),
  vulnerableBabies: vulnerableCountSchema,
  vulnerableElderly: vulnerableCountSchema,
  vulnerablePregnant: vulnerableCountSchema,
  vulnerableDisabled: vulnerableCountSchema,
  roadAccess: z.enum(ROAD_ACCESS_OPTIONS, { required_error: "Pilih kondisi akses jalan." }),
  weather: z.enum(WEATHER_OPTIONS, { required_error: "Pilih kondisi cuaca." }),
  density: z.enum(DENSITY_LEVELS, { required_error: "Pilih tingkat kepadatan penduduk." }),
};

type FactorData = {
  affectedPeople: number;
  vulnerableBabies: number;
  vulnerableElderly: number;
  vulnerablePregnant: number;
  vulnerableDisabled: number;
};

function checkVulnerableTotal(data: FactorData, ctx: z.RefinementCtx): void {
  const total =
    data.vulnerableBabies +
    data.vulnerableElderly +
    data.vulnerablePregnant +
    data.vulnerableDisabled;

  if (total > data.affectedPeople) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["vulnerableBabies"],
      message:
        "Jumlah kelompok rentan tidak boleh melebihi jumlah jiwa terdampak. Periksa kembali angka bayi, lansia, ibu hamil, dan disabilitas.",
    });
  }
}

export const incidentFactorsSchema = z.object(factorFields).superRefine(checkVulnerableTotal);
export type IncidentFactorsInput = z.infer<typeof incidentFactorsSchema>;

const incidentDraftFields = {
  title: requiredText("Judul laporan", 5, 120),
  disasterType: z.enum(DISASTER_TYPES, { required_error: "Pilih jenis bencana." }),
  disasterDetail: z
    .string()
    .trim()
    .max(DISASTER_DETAIL_MAX, `Keterangan jenis bencana maksimal ${DISASTER_DETAIL_MAX} karakter.`)
    .optional(),
  occurredAt: z
    .string({ required_error: "Waktu kejadian wajib diisi." })
    .min(1, "Waktu kejadian wajib diisi.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Waktu kejadian belum valid."),
  lat: latitudeSchema,
  lng: longitudeSchema,
  radiusM: radiusSchema,
  /**
   * Kecamatan tidak lagi dipilih petugas. Server mengisinya dari titik peta.
   * Kolom ini tetap diterima untuk impor data dan pengujian.
   */
  regionId: z.string().trim().min(1, "Kecamatan terdampak belum dikenali.").optional(),
};

function checkDisasterDetail(
  value: { disasterType?: string; disasterDetail?: string },
  ctx: z.RefinementCtx,
): void {
  if (value.disasterType !== "LAINNYA") return;

  const detail = value.disasterDetail?.trim() ?? "";
  if (detail.length < 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["disasterDetail"],
      message: "Sebutkan jenis bencananya, misalnya: letusan gunung atau tanah longsor.",
    });
  }
}

function checkIncidentInsideSurabaya(
  value: { lat?: number; lng?: number },
  ctx: z.RefinementCtx,
): void {
  if (value.lat === undefined || value.lng === undefined) return;

  const inside =
    value.lat >= SURABAYA_BOUNDS.minLat &&
    value.lat <= SURABAYA_BOUNDS.maxLat &&
    value.lng >= SURABAYA_BOUNDS.minLng &&
    value.lng <= SURABAYA_BOUNDS.maxLng;

  if (!inside) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lat"],
      message:
        "Titik kejadian harus berada di area Kota Surabaya. Geser titik di peta atau periksa angka lintang dan bujur.",
    });
  }
}

export const incidentDraftSchema = z
  .object(incidentDraftFields)
  .superRefine((value, ctx) => {
    checkDisasterDetail(value, ctx);
    checkIncidentInsideSurabaya(value, ctx);
  });

/** Dipakai saat petugas menyunting draf yang masih berstatus BARU. */
export const incidentPatchSchema = z
  .object(incidentDraftFields)
  .partial()
  .superRefine((value, ctx) => {
    checkDisasterDetail(value, ctx);
    checkIncidentInsideSurabaya(value, ctx);
  });

export const incidentFormSchema = z
  .object({ ...incidentDraftFields, ...factorFields })
  .superRefine((value, ctx) => {
    checkVulnerableTotal(value, ctx);
    checkDisasterDetail(value, ctx);
    checkIncidentInsideSurabaya(value, ctx);
  });

export const adjustRecommendationItemSchema = z.object({
  finalQty: z.coerce
    .number({ invalid_type_error: "Jumlah akhir wajib diisi angka." })
    .int("Jumlah akhir harus bilangan bulat.")
    .min(0, "Jumlah akhir tidak boleh negatif.")
    .max(1_000_000, "Jumlah akhir terlalu besar. Periksa kembali angka yang dimasukkan."),
  reason: requiredText("Alasan perubahan", 5, 300),
});

export const decisionInputSchema = z
  .object({
    decision: z.enum(DECISION_TYPES, {
      required_error: "Pilih keputusan yang ingin disimpan.",
    }),
    reason: z.string().trim().max(300, "Catatan keputusan maksimal 300 karakter.").optional(),
    poskoId: z
      .string()
      .trim()
      .min(1, "Pilih posko tujuan distribusi.")
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision === "REJECT" && (!value.reason || value.reason.length < 5)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message:
          "Tulis alasan penolakan minimal 5 karakter agar petugas tahu apa yang perlu diperbaiki.",
      });
    }

    if (value.decision === "APPROVE" && !value.poskoId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["poskoId"],
        message: "Pilih posko tujuan distribusi sebelum menyetujui laporan.",
      });
    }
  });

export type IncidentDraftInput = z.infer<typeof incidentDraftSchema>;
export type IncidentPatchInput = z.infer<typeof incidentPatchSchema>;
export type IncidentFormInput = z.infer<typeof incidentFormSchema>;
export type AdjustRecommendationItemInput = z.infer<typeof adjustRecommendationItemSchema>;
export type DecisionInput = z.infer<typeof decisionInputSchema>;

export const aidItemInputSchema = z.object({
  name: requiredText("Nama jenis bantuan", 2, 60),
  unit: requiredText("Satuan", 1, 20),
  icon: z.enum(AID_ICON_NAMES, {
    required_error: "Pilih ikon jenis bantuan.",
    invalid_type_error: "Pilih ikon dari daftar yang tersedia.",
  }),
  standardPerPerson: z.coerce
    .number({ invalid_type_error: "Standar per jiwa wajib diisi angka." })
    .min(0, "Standar per jiwa tidak boleh negatif.")
    .max(1_000, "Standar per jiwa terlalu besar."),
  isActive: z.boolean().optional(),
});

export const regionInputSchema = z.object({
  name: requiredText("Nama kecamatan", 2, 60),
  isActive: z.boolean().optional(),
});

export const poskoFieldsSchema = z.object({
  name: requiredText("Nama posko", 2, 80),
  regionId: z.string().trim().min(1, "Pilih kecamatan posko."),
  lat: latitudeSchema,
  lng: longitudeSchema,
  isActive: z.boolean().optional(),
});

function checkPoskoInsideSurabaya(
  value: { lat?: number; lng?: number },
  ctx: z.RefinementCtx,
): void {
  if (value.lat === undefined || value.lng === undefined) return;

  const inside =
    value.lat >= SURABAYA_BOUNDS.minLat &&
    value.lat <= SURABAYA_BOUNDS.maxLat &&
    value.lng >= SURABAYA_BOUNDS.minLng &&
    value.lng <= SURABAYA_BOUNDS.maxLng;

  if (!inside) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lat"],
      message:
        "Titik posko harus berada di area Kota Surabaya. Geser titik di peta atau periksa angka lintang dan bujur.",
    });
  }
}

/** Posko demo harus berada di area Kota Surabaya agar peta dan radius tetap masuk akal. */
export const poskoInputSchema = poskoFieldsSchema.superRefine(checkPoskoInsideSurabaya);

export const poskoUpdateSchema = poskoFieldsSchema
  .partial()
  .superRefine(checkPoskoInsideSurabaya);

export const publicIncidentFilterSchema = z.object({
  disasterType: z
    .preprocess((value) => (value === "" ? undefined : value), z.enum(DISASTER_TYPES).optional()),
  regionId: z
    .preprocess((value) => (value === "" ? undefined : value), z.string().trim().optional()),
});

export const userRoleInputSchema = z.object({
  role: roleSchema.optional(),
  isActive: z.boolean().optional(),
});

/** Petugas boleh membatalkan laporan tanpa menulis alasan; alasannya opsional. */
export const cancelIncidentSchema = z.object({
  reason: z.string().trim().max(300, "Alasan pembatalan maksimal 300 karakter.").optional(),
});

/** Pimpinan wajib menuliskan alasan saat membatalkan laporan yang sudah diajukan. */
export const pimpinanCancelSchema = z.object({
  reason: requiredText("Alasan pembatalan", 5, 300),
});

const correctionItemSchema = z.object({
  aidItemId: z.string({ required_error: "Jenis bantuan wajib dipilih." }).trim().min(1),
  qty: z.coerce
    .number({ invalid_type_error: "Jumlah koreksi wajib diisi angka." })
    .int("Jumlah koreksi harus bilangan bulat.")
    .min(0, "Jumlah koreksi tidak boleh negatif.")
    .max(1_000_000, "Jumlah koreksi terlalu besar. Periksa kembali angkanya."),
});

/**
 * Koreksi setelah izin terbit: izin lama ditandai digantikan, izin baru
 * diterbitkan. Semua baris boleh dikirim; baris yang tidak dikirim tetap.
 */
export const correctionInputSchema = z.object({
  reason: requiredText("Alasan koreksi", 5, 300),
  poskoId: z.string({ required_error: "Pilih posko tujuan koreksi." }).trim().min(1),
  items: z
    .array(correctionItemSchema)
    .min(1, "Kirim minimal satu baris bantuan yang dikoreksi.")
    .max(20, "Terlalu banyak baris bantuan dalam satu koreksi.")
    .superRefine((items, ctx) => {
      const seen = new Set<string>();
      for (const item of items) {
        if (seen.has(item.aidItemId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["items"],
            message: "Satu jenis bantuan hanya boleh muncul sekali dalam koreksi.",
          });
          return;
        }
        seen.add(item.aidItemId);
      }
    }),
});

const optionalQueryText = (max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const optionalQueryDate = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Tanggal rekap belum valid.")
    .optional(),
);

export const recapFilterSchema = z
  .object({
    from: optionalQueryDate,
    to: optionalQueryDate,
    regionId: optionalQueryText(80),
    disasterType: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.enum(DISASTER_TYPES).optional(),
    ),
    groupBy: z.preprocess(
      (value) => (value === "" || value === null || value === undefined ? "region" : value),
      z.enum(RECAP_GROUPS),
    ),
  })
  .superRefine((value, ctx) => {
    if (
      value.from &&
      value.to &&
      Date.parse(value.from) > Date.parse(value.to)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["from"],
        message: "Tanggal awal tidak boleh setelah tanggal akhir.",
      });
    }
  });

/** Panel demo hanya boleh memajukan waktu secara wajar (maksimal 30 hari). */
export const devClockSchema = z.object({
  offsetMinutes: z.coerce
    .number({ invalid_type_error: "Offset waktu wajib berupa angka." })
    .int("Offset waktu harus bilangan bulat menit.")
    .min(-7 * 24 * 60, "Waktu demo tidak boleh mundur lebih dari 7 hari.")
    .max(30 * 24 * 60, "Waktu demo tidak boleh maju lebih dari 30 hari."),
});

export type AidItemInput = z.infer<typeof aidItemInputSchema>;
export type RegionInput = z.infer<typeof regionInputSchema>;
export type PoskoInput = z.infer<typeof poskoInputSchema>;
export type CancelIncidentInput = z.infer<typeof cancelIncidentSchema>;
export type PimpinanCancelInput = z.infer<typeof pimpinanCancelSchema>;
export type CorrectionInput = z.infer<typeof correctionInputSchema>;
export type RecapFilter = z.infer<typeof recapFilterSchema>;
export type DevClockInput = z.infer<typeof devClockSchema>;
