import { z } from "zod";
import {
  DAMAGE_LEVELS,
  DENSITY_LEVELS,
  DISASTER_TYPES,
  FACTOR_LIMITS,
  ROAD_ACCESS_OPTIONS,
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

export const otpCodeSchema = z
  .string({ required_error: "Kode masuk wajib diisi." })
  .trim()
  .regex(/^\d{6}$/, "Kode masuk terdiri dari 6 angka.");

export const loginSchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
});

export const otpRequestSchema = z.object({
  email: emailSchema,
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
  handlingDays: z.coerce
    .number({ invalid_type_error: "Perkiraan lama penanganan wajib diisi angka." })
    .int("Lama penanganan harus bilangan bulat hari.")
    .min(FACTOR_LIMITS.handlingDays.min, "Lama penanganan minimal 1 hari.")
    .max(FACTOR_LIMITS.handlingDays.max, "Lama penanganan maksimal 30 hari."),
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

export const incidentDraftSchema = z.object({
  title: requiredText("Judul laporan", 5, 120),
  disasterType: z.enum(DISASTER_TYPES, { required_error: "Pilih jenis bencana." }),
  occurredAt: z
    .string({ required_error: "Waktu kejadian wajib diisi." })
    .min(1, "Waktu kejadian wajib diisi.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Waktu kejadian belum valid."),
  lat: latitudeSchema,
  lng: longitudeSchema,
  radiusM: radiusSchema,
  regionId: z.string().trim().min(1, "Pilih kecamatan terdampak.").optional(),
});

export const incidentFormSchema = incidentDraftSchema
  .extend(factorFields)
  .superRefine(checkVulnerableTotal);

export type IncidentDraftInput = z.infer<typeof incidentDraftSchema>;
export type IncidentFormInput = z.infer<typeof incidentFormSchema>;

export const aidItemInputSchema = z.object({
  name: requiredText("Nama jenis bantuan", 2, 60),
  unit: requiredText("Satuan", 1, 20),
  icon: requiredText("Ikon", 1, 60),
  standardPerPerson: z.coerce
    .number({ invalid_type_error: "Standar per jiwa wajib diisi angka." })
    .min(0, "Standar per jiwa tidak boleh negatif.")
    .max(1_000, "Standar per jiwa terlalu besar."),
  isActive: z.boolean().optional(),
});

export const regionInputSchema = z.object({
  name: requiredText("Nama kecamatan", 2, 60),
});

export const poskoInputSchema = z.object({
  name: requiredText("Nama posko", 2, 80),
  regionId: z.string().trim().min(1, "Pilih kecamatan posko."),
  lat: latitudeSchema,
  lng: longitudeSchema,
  isActive: z.boolean().optional(),
});

export const userRoleInputSchema = z.object({
  role: roleSchema,
  isActive: z.boolean().optional(),
});

export type AidItemInput = z.infer<typeof aidItemInputSchema>;
export type RegionInput = z.infer<typeof regionInputSchema>;
export type PoskoInput = z.infer<typeof poskoInputSchema>;
