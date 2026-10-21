import { z } from "zod";
import { emptyToUndefined } from "./item";

export const MASTER_ENTITIES = ["locations", "categories", "employees"] as const;
export type MasterEntity = (typeof MASTER_ENTITIES)[number];

export const MASTER_LABELS: Record<MasterEntity, { plural: string; singular: string }> = {
  locations: { plural: "Lokasi", singular: "lokasi" },
  categories: { plural: "Kategori", singular: "kategori" },
  employees: { plural: "Pegawai (PIC)", singular: "pegawai" },
};

export function isMasterEntity(value: string): value is MasterEntity {
  return (MASTER_ENTITIES as readonly string[]).includes(value);
}

const text = (max: number, label: string) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max, `${label} maksimal ${max} karakter.`).optional());

const requiredText = (max: number, label: string) =>
  z
    .string({ error: `${label} wajib diisi.` })
    .trim()
    .min(1, `${label} wajib diisi.`)
    .max(max, `${label} maksimal ${max} karakter.`);

export const locationSchema = z.object({
  name: requiredText(150, "Nama lokasi"),
  building: text(150, "Gedung"),
  floor: text(50, "Lantai"),
  room: text(100, "Ruang"),
  description: text(1000, "Keterangan"),
});

export const categorySchema = z.object({
  name: requiredText(150, "Nama kategori"),
  type: z.enum(["BMN", "ATK"], { error: "Pilih tipe kategori." }),
  description: text(1000, "Keterangan"),
});

/** Offices an employee can work from (Data master > Pegawai > Lokasi). */
export const EMPLOYEE_LOCATIONS = ["Jakarta", "Bandung"] as const;

export const employeeSchema = z.object({
  employeeNumber: text(100, "NIP / nomor pegawai"),
  name: requiredText(150, "Nama pegawai"),
  unit: text(150, "Unit"),
  golongan: text(100, "Golongan"),
  position: text(150, "Jabatan"),
  workLocation: z.preprocess(emptyToUndefined, z.enum(EMPLOYEE_LOCATIONS, { error: "Pilih Jakarta atau Bandung." }).optional()),
  phone: text(50, "Telepon"),
  email: z.preprocess(emptyToUndefined, z.email("Email tidak valid.").max(255, "Email maksimal 255 karakter.").optional()),
  // Checkbox: present ("on") when ticked.
  isActive: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
});

export const MASTER_SCHEMAS = { locations: locationSchema, categories: categorySchema, employees: employeeSchema } as const;

export type LocationInput = z.output<typeof locationSchema>;
export type CategoryInput = z.output<typeof categorySchema>;
export type EmployeeInput = z.output<typeof employeeSchema>;
