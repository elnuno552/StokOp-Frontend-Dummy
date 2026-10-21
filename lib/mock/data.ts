// Sample data for the demo build. Everything here is made up. There is no database: the service modules in lib/
// read these records and return the same shapes the real application returns.
import type {
  ApprovalKind,
  ApprovalStatus,
  BorrowerType,
  BorrowingStatus,
  DisposalReason,
  DisposalStatus,
  ItemCondition,
  ItemStatus,
  ItemType,
  MaintenanceExecutor,
  MaintenanceStatus,
  OpnameMode,
  PurchasePlanStatus,
  StockOpnameStatus,
  TransactionType,
  VerificationStatus,
} from "@/lib/generated/prisma/enums";
import type { Capability } from "@/lib/permissions";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const now = Date.now();

/** A moment `days` days (and `hours` hours) before now. Negative values are in the future. */
const ago = (days: number, hours = 0) => new Date(now - days * DAY - hours * HOUR);
const date = (iso: string) => new Date(`${iso}T00:00:00+07:00`);

/** Ids are UUID-shaped because the query schemas validate them with z.uuid(). */
export function uid(kind: number, n: number): string {
  const hex = (value: number, width: number) => value.toString(16).padStart(width, "0");
  return `${hex(kind, 8)}-0000-4000-8000-${hex(n, 12)}`;
}

const K = { user: 1, role: 2, category: 3, location: 4, employee: 5, item: 6, borrowing: 7, approval: 8, opname: 9, plan: 10, field: 11, disposal: 12, log: 13, review: 14, tx: 15, maint: 16, note: 17, line: 18, opItem: 19, receipt: 20 };

export const CATEGORY_IDS = {
  laptop: uid(K.category, 1),
  pc: uid(K.category, 2),
  printer: uid(K.category, 3),
  furniture: uid(K.category, 4),
  ac: uid(K.category, 5),
  av: uid(K.category, 6),
  vehicle: uid(K.category, 7),
  paper: uid(K.category, 8),
  stationery: uid(K.category, 9),
  toner: uid(K.category, 10),
  folder: uid(K.category, 11),
  supplies: uid(K.category, 12),
};

export interface CategoryRec {
  id: string;
  name: string;
  type: ItemType;
  description: string | null;
  defaultMinimumStock: number | null;
}

export const categories: CategoryRec[] = [
  { id: CATEGORY_IDS.laptop, name: "Laptop", type: "BMN", description: "Komputer jinjing", defaultMinimumStock: null },
  { id: CATEGORY_IDS.pc, name: "Komputer PC", type: "BMN", description: null, defaultMinimumStock: null },
  { id: CATEGORY_IDS.printer, name: "Printer & Pemindai", type: "BMN", description: null, defaultMinimumStock: null },
  { id: CATEGORY_IDS.furniture, name: "Meja & Kursi", type: "BMN", description: "Mebel kantor", defaultMinimumStock: null },
  { id: CATEGORY_IDS.ac, name: "Pendingin Ruangan", type: "BMN", description: null, defaultMinimumStock: null },
  { id: CATEGORY_IDS.av, name: "Audio Visual", type: "BMN", description: "Proyektor, layar, kamera", defaultMinimumStock: null },
  { id: CATEGORY_IDS.vehicle, name: "Kendaraan Dinas", type: "BMN", description: null, defaultMinimumStock: null },
  { id: CATEGORY_IDS.paper, name: "Kertas", type: "ATK", description: null, defaultMinimumStock: 5 },
  { id: CATEGORY_IDS.stationery, name: "Alat Tulis", type: "ATK", description: null, defaultMinimumStock: 10 },
  { id: CATEGORY_IDS.toner, name: "Tinta & Toner", type: "ATK", description: null, defaultMinimumStock: 2 },
  { id: CATEGORY_IDS.folder, name: "Map & Folder", type: "ATK", description: null, defaultMinimumStock: 20 },
  { id: CATEGORY_IDS.supplies, name: "Perlengkapan Kantor", type: "ATK", description: null, defaultMinimumStock: null },
];

export interface LocationRec {
  id: string;
  name: string;
  building: string | null;
  floor: string | null;
  room: string | null;
  description: string | null;
}

export const LOCATION_IDS = {
  lobby: uid(K.location, 1),
  tu: uid(K.location, 2),
  keuangan: uid(K.location, 3),
  it: uid(K.location, 4),
  rapat: uid(K.location, 5),
  gudang: uid(K.location, 6),
  kepala: uid(K.location, 7),
  aula: uid(K.location, 8),
  parkir: uid(K.location, 9),
};

export const locations: LocationRec[] = [
  { id: LOCATION_IDS.lobby, name: "Lobi Utama", building: "Gedung A", floor: "1", room: "101", description: "Resepsionis dan ruang tunggu" },
  { id: LOCATION_IDS.tu, name: "Ruang Tata Usaha", building: "Gedung A", floor: "1", room: "104", description: null },
  { id: LOCATION_IDS.keuangan, name: "Ruang Keuangan", building: "Gedung A", floor: "2", room: "201", description: null },
  { id: LOCATION_IDS.it, name: "Ruang Teknologi Informasi", building: "Gedung A", floor: "2", room: "205", description: "Server kecil dan bengkel perangkat" },
  { id: LOCATION_IDS.kepala, name: "Ruang Kepala Kantor", building: "Gedung A", floor: "3", room: "301", description: null },
  { id: LOCATION_IDS.rapat, name: "Ruang Rapat Anggrek", building: "Gedung B", floor: "1", room: "B-12", description: "Kapasitas 20 orang" },
  { id: LOCATION_IDS.aula, name: "Aula Serbaguna", building: "Gedung B", floor: "2", room: "B-21", description: "Kapasitas 120 orang" },
  { id: LOCATION_IDS.gudang, name: "Gudang Persediaan", building: "Gedung C", floor: "1", room: "G-01", description: "ATK dan perlengkapan habis pakai" },
  { id: LOCATION_IDS.parkir, name: "Area Parkir Dinas", building: null, floor: null, room: null, description: "Kendaraan dinas" },
];

export interface EmployeeRec {
  id: string;
  employeeNumber: string | null;
  name: string;
  unit: string | null;
  golongan: string | null;
  position: string | null;
  workLocation: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
}

export const EMPLOYEE_IDS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => uid(K.employee, n));

export const employees: EmployeeRec[] = [
  { id: EMPLOYEE_IDS[0], employeeNumber: "198503122010011004", name: "Ahmad Fauzi", unit: "Sub Bagian Umum", golongan: "III/c", position: "Pengelola BMN", workLocation: "Gedung A", phone: "0812-5550-0101", email: "ahmad.fauzi@demo.local", isActive: true },
  { id: EMPLOYEE_IDS[1], employeeNumber: "199001252015022001", name: "Nur Aisyah", unit: "Bagian Keuangan", golongan: "III/b", position: "Bendahara Pengeluaran", workLocation: "Gedung A", phone: "0812-5550-0102", email: "nur.aisyah@demo.local", isActive: true },
  { id: EMPLOYEE_IDS[2], employeeNumber: "198807142012121003", name: "Hendra Wijaya", unit: "Teknologi Informasi", golongan: "III/d", position: "Pranata Komputer", workLocation: "Gedung A", phone: "0812-5550-0103", email: "hendra.wijaya@demo.local", isActive: true },
  { id: EMPLOYEE_IDS[3], employeeNumber: "199205302018012002", name: "Maya Puspita", unit: "Sub Bagian Umum", golongan: "III/a", position: "Pengadministrasi Umum", workLocation: "Gedung A", phone: null, email: "maya.puspita@demo.local", isActive: true },
  { id: EMPLOYEE_IDS[4], employeeNumber: "197911082005011006", name: "Slamet Riyadi", unit: "Kepala Bagian Umum", golongan: "IV/a", position: "Kepala Bagian", workLocation: "Gedung A", phone: "0812-5550-0105", email: null, isActive: true },
  { id: EMPLOYEE_IDS[5], employeeNumber: "199312172019031001", name: "Rizky Pratama", unit: "Bagian Program", golongan: "III/a", position: "Analis Kebijakan", workLocation: "Gedung B", phone: null, email: "rizky.pratama@demo.local", isActive: true },
  { id: EMPLOYEE_IDS[6], employeeNumber: "198204192008012005", name: "Lina Marlina", unit: "Bagian Program", golongan: "III/d", position: "Perencana", workLocation: "Gedung B", phone: "0812-5550-0107", email: "lina.marlina@demo.local", isActive: true },
  { id: EMPLOYEE_IDS[7], employeeNumber: "197506232000031002", name: "Teguh Santoso", unit: "Sub Bagian Umum", golongan: "II/c", position: "Pengemudi", workLocation: "Area Parkir", phone: null, email: null, isActive: false },
];

export interface ItemRec {
  id: string;
  code: string;
  name: string;
  type: ItemType;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  quantity: number;
  unit: string | null;
  minimumStock: number | null;
  status: ItemStatus;
  condition: ItemCondition;
  acquisitionDate: Date | null;
  acquisitionPrice: number | null;
  fundingSource: string | null;
  description: string | null;
  kodeSatker: string | null;
  kodeBarang: string | null;
  nup: number | null;
  kodeRegister: string | null;
  umurAset: number | null;
  tanggalBukuPertama: Date | null;
  nilaiPerolehanPertama: number | null;
  nilaiMutasi: number | null;
  nilaiPenyusutan: number | null;
  nilaiBuku: number | null;
  statusPenggunaan: string | null;
  noPsp: string | null;
  tanggalPsp: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customValues: Record<string, string | number | boolean>;
  categoryId: string | null;
  locationId: string | null;
  picId: string | null;
  picName: string | null;
}

const SATKER = "524834";

interface BmnSeed {
  n: number;
  name: string;
  brand: string;
  model: string;
  category: keyof typeof CATEGORY_IDS;
  location: keyof typeof LOCATION_IDS;
  pic: number | null;
  status?: ItemStatus;
  condition?: ItemCondition;
  price: number;
  acquired: string;
  kodeBarang: string;
  serial: string;
  custom?: Record<string, string | number | boolean>;
  manualPic?: string;
}

const bmnSeeds: BmnSeed[] = [
  { n: 1, name: "Laptop ASUS ExpertBook B1", brand: "ASUS", model: "B1402CBA", category: "laptop", location: "tu", pic: 3, status: "IN_USE", price: 12_850_000, acquired: "2023-03-14", kodeBarang: "3100102001", serial: "R9N0CV12K884" },
  { n: 2, name: "Laptop Lenovo ThinkPad E14", brand: "Lenovo", model: "E14 Gen 4", category: "laptop", location: "keuangan", pic: 2, status: "IN_USE", price: 14_200_000, acquired: "2023-06-02", kodeBarang: "3100102001", serial: "PF3QX8L2" },
  { n: 3, name: "Laptop Acer Aspire 5", brand: "Acer", model: "A515-57", category: "laptop", location: "it", pic: 3, status: "BORROWED", price: 9_750_000, acquired: "2022-11-21", kodeBarang: "3100102001", serial: "NXK3JSN00A" },
  { n: 4, name: "Laptop HP ProBook 440", brand: "HP", model: "440 G9", category: "laptop", location: "it", pic: 3, status: "UNDER_MAINTENANCE", condition: "MINOR_DAMAGE", price: 13_400_000, acquired: "2022-08-09", kodeBarang: "3100102001", serial: "5CD2301QX2" },
  { n: 5, name: "PC Desktop Dell OptiPlex 3000", brand: "Dell", model: "OptiPlex 3000 SFF", category: "pc", location: "tu", pic: 4, status: "IN_USE", price: 10_900_000, acquired: "2021-05-18", kodeBarang: "3100101001", serial: "DLX3000-0087" },
  { n: 6, name: "PC Desktop Dell OptiPlex 3000", brand: "Dell", model: "OptiPlex 3000 SFF", category: "pc", location: "keuangan", pic: 2, status: "IN_USE", price: 10_900_000, acquired: "2021-05-18", kodeBarang: "3100101001", serial: "DLX3000-0088" },
  { n: 7, name: "PC All-in-One HP 24", brand: "HP", model: "24-cb1010d", category: "pc", location: "lobby", pic: 4, status: "IN_USE", price: 9_300_000, acquired: "2022-02-10", kodeBarang: "3100101001", serial: "8CC2290KJL" },
  { n: 8, name: "Printer Epson L3250", brand: "Epson", model: "L3250", category: "printer", location: "tu", pic: 1, status: "IN_USE", price: 3_150_000, acquired: "2023-01-30", kodeBarang: "3100203001", serial: "X7TA011234" },
  { n: 9, name: "Printer Laser Brother HL-L5100DN", brand: "Brother", model: "HL-L5100DN", category: "printer", location: "keuangan", pic: 2, status: "IN_USE", price: 6_450_000, acquired: "2022-09-05", kodeBarang: "3100203001", serial: "U64392M9N1" },
  { n: 10, name: "Pemindai Canon DR-C225", brand: "Canon", model: "DR-C225 II", category: "printer", location: "tu", pic: 4, status: "AVAILABLE", price: 8_700_000, acquired: "2021-12-01", kodeBarang: "3100204001", serial: "AKSV21090" },
  { n: 11, name: "Meja Kerja Staf 120 cm", brand: "Chitose", model: "MK-120", category: "furniture", location: "tu", pic: 4, status: "IN_USE", price: 1_850_000, acquired: "2020-04-22", kodeBarang: "3050104001", serial: "MK120-004" },
  { n: 12, name: "Kursi Kerja Ergonomis", brand: "Ergotec", model: "ET-205", category: "furniture", location: "keuangan", pic: 2, status: "IN_USE", condition: "MINOR_DAMAGE", price: 1_450_000, acquired: "2020-04-22", kodeBarang: "3050104002", serial: "ET205-011" },
  { n: 13, name: "Meja Rapat Oval 3 m", brand: "Olympic", model: "MR-300", category: "furniture", location: "rapat", pic: 1, status: "IN_USE", price: 7_900_000, acquired: "2019-08-13", kodeBarang: "3050104003", serial: "MR300-001" },
  { n: 14, name: "AC Split Daikin 2 PK", brand: "Daikin", model: "FTKC50", category: "ac", location: "aula", pic: 1, status: "IN_USE", price: 9_600_000, acquired: "2019-08-13", kodeBarang: "3050202001", serial: "DK50-2019-17" },
  { n: 15, name: "AC Split Panasonic 1 PK", brand: "Panasonic", model: "CS-PN9WKJ", category: "ac", location: "kepala", pic: 5, status: "IN_USE", price: 5_700_000, acquired: "2021-03-04", kodeBarang: "3050202001", serial: "PN9-2021-04" },
  { n: 16, name: "Proyektor Epson EB-X500", brand: "Epson", model: "EB-X500", category: "av", location: "rapat", pic: 1, status: "BORROWED", price: 8_250_000, acquired: "2022-06-27", kodeBarang: "3100401001", serial: "X5HK400187" },
  { n: 17, name: "Kamera Mirrorless Sony A6400", brand: "Sony", model: "ILCE-6400", category: "av", location: "lobby", pic: 6, status: "AVAILABLE", price: 15_900_000, acquired: "2023-09-19", kodeBarang: "3100401002", serial: "3871120" },
  { n: 18, name: "Mobil Dinas Toyota Innova", brand: "Toyota", model: "Innova 2.4 G", category: "vehicle", location: "parkir", pic: 1, status: "IN_USE", price: 412_000_000, acquired: "2018-02-26", kodeBarang: "2020104001", serial: "MHFXW8EM2J5", custom: { [uid(K.field, 1)]: "B 1234 XYZ", [uid(K.field, 2)]: "2018-02-26" } },
  { n: 19, name: "Laptop Dell Latitude 3420 (hilang)", brand: "Dell", model: "Latitude 3420", category: "laptop", location: "tu", pic: null, status: "LOST", condition: "LOST", price: 11_800_000, acquired: "2021-10-11", kodeBarang: "3100102001", serial: "DL3420-9981" },
  { n: 20, name: "Printer Canon PIXMA G2010 (rusak berat)", brand: "Canon", model: "G2010", category: "printer", location: "gudang", pic: null, status: "AVAILABLE", condition: "MAJOR_DAMAGE", price: 2_300_000, acquired: "2019-03-07", kodeBarang: "3100203001", serial: "KMHB04412", manualPic: "Petugas Gudang" },
];

function bmnItem(s: BmnSeed): ItemRec {
  const acquired = date(s.acquired);
  const age = Math.max(0, new Date(now).getFullYear() - acquired.getFullYear());
  const lifespan = s.category === "vehicle" ? 10 : s.category === "furniture" ? 8 : 5;
  const depreciation = Math.min(s.price, Math.round((s.price / lifespan) * age));
  return {
    id: uid(K.item, s.n),
    code: `BMN-2026-${String(s.n).padStart(5, "0")}`,
    name: s.name,
    type: "BMN",
    brand: s.brand,
    model: s.model,
    serialNumber: s.serial,
    quantity: 1,
    unit: "unit",
    minimumStock: null,
    status: s.status ?? "IN_USE",
    condition: s.condition ?? "GOOD",
    acquisitionDate: acquired,
    acquisitionPrice: s.price,
    fundingSource: "APBN",
    description: null,
    kodeSatker: SATKER,
    kodeBarang: s.kodeBarang,
    nup: s.n,
    kodeRegister: `${SATKER}${s.kodeBarang}${String(s.n).padStart(4, "0")}`,
    umurAset: age,
    tanggalBukuPertama: acquired,
    nilaiPerolehanPertama: s.price,
    nilaiMutasi: 0,
    nilaiPenyusutan: depreciation,
    nilaiBuku: s.price - depreciation,
    statusPenggunaan: "Digunakan sendiri untuk operasional",
    noPsp: s.n % 3 === 0 ? `PSP-${100 + s.n}/KN/2023` : null,
    tanggalPsp: s.n % 3 === 0 ? date("2023-07-15") : null,
    createdAt: ago(120 - s.n * 3),
    updatedAt: ago(Math.max(1, 40 - s.n)),
    customValues: s.custom ?? {},
    categoryId: CATEGORY_IDS[s.category],
    locationId: LOCATION_IDS[s.location],
    picId: s.pic ? EMPLOYEE_IDS[s.pic - 1] : null,
    picName: s.manualPic ?? null,
  };
}

interface AtkSeed {
  n: number;
  name: string;
  brand: string | null;
  category: keyof typeof CATEGORY_IDS;
  unit: string;
  qty: number;
  min: number | null;
  price: number;
}

const atkSeeds: AtkSeed[] = [
  { n: 21, name: "Kertas HVS A4 70 gsm", brand: "Sinar Dunia", category: "paper", unit: "rim", qty: 42, min: 20, price: 52_000 },
  { n: 22, name: "Kertas HVS F4 70 gsm", brand: "Sinar Dunia", category: "paper", unit: "rim", qty: 6, min: 10, price: 58_000 },
  { n: 23, name: "Kertas HVS A3 80 gsm", brand: "PaperOne", category: "paper", unit: "rim", qty: 0, min: 3, price: 112_000 },
  { n: 24, name: "Pulpen Standard AE7 hitam", brand: "Standard", category: "stationery", unit: "pak", qty: 18, min: 10, price: 24_000 },
  { n: 25, name: "Pulpen Gel Pilot G-2 biru", brand: "Pilot", category: "stationery", unit: "pak", qty: 4, min: 6, price: 78_000 },
  { n: 26, name: "Spidol Papan Tulis Snowman hitam", brand: "Snowman", category: "stationery", unit: "pak", qty: 9, min: 4, price: 46_000 },
  { n: 27, name: "Stapler Joyko HD-50", brand: "Joyko", category: "stationery", unit: "buah", qty: 15, min: 5, price: 22_000 },
  { n: 28, name: "Isi Staples No. 10", brand: "Max", category: "stationery", unit: "kotak", qty: 2, min: 12, price: 4_500 },
  { n: 29, name: "Tinta Epson 003 hitam", brand: "Epson", category: "toner", unit: "botol", qty: 7, min: 4, price: 92_000 },
  { n: 30, name: "Tinta Epson 003 magenta", brand: "Epson", category: "toner", unit: "botol", qty: 1, min: 3, price: 92_000 },
  { n: 31, name: "Toner Brother TN-3478", brand: "Brother", category: "toner", unit: "buah", qty: 3, min: 2, price: 1_180_000 },
  { n: 32, name: "Map Plastik Kancing F4", brand: null, category: "folder", unit: "pak", qty: 55, min: 20, price: 31_000 },
  { n: 33, name: "Ordner Folio Bantex", brand: "Bantex", category: "folder", unit: "buah", qty: 11, min: 12, price: 38_000 },
  { n: 34, name: "Lakban Bening 2 inci", brand: "Daimaru", category: "supplies", unit: "roll", qty: 30, min: null, price: 12_500 },
  { n: 35, name: "Baterai AA Alkaline", brand: "ABC", category: "supplies", unit: "pak", qty: 0, min: null, price: 28_000 },
];

function atkItem(s: AtkSeed): ItemRec {
  return {
    id: uid(K.item, s.n),
    code: `ATK-2026-${String(s.n - 20).padStart(5, "0")}`,
    name: s.name,
    type: "ATK",
    brand: s.brand,
    model: null,
    serialNumber: null,
    quantity: s.qty,
    unit: s.unit,
    minimumStock: s.min,
    status: s.qty > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
    condition: "GOOD",
    acquisitionDate: date("2026-02-10"),
    acquisitionPrice: s.price,
    fundingSource: "DIPA",
    description: null,
    kodeSatker: null,
    kodeBarang: null,
    nup: null,
    kodeRegister: null,
    umurAset: null,
    tanggalBukuPertama: null,
    nilaiPerolehanPertama: null,
    nilaiMutasi: null,
    nilaiPenyusutan: null,
    nilaiBuku: null,
    statusPenggunaan: null,
    noPsp: null,
    tanggalPsp: null,
    createdAt: ago(100 - s.n),
    updatedAt: ago(s.n % 9),
    customValues: {},
    categoryId: CATEGORY_IDS[s.category],
    locationId: LOCATION_IDS.gudang,
    picId: null,
    picName: null,
  };
}

export const items: ItemRec[] = [...bmnSeeds.map(bmnItem), ...atkSeeds.map(atkItem)];

export const ITEM_IDS = Object.fromEntries(items.map((i) => [i.code, i.id])) as Record<string, string>;
export const itemById = (id: string) => items.find((i) => i.id === id);
export const categoryById = (id: string | null) => categories.find((c) => c.id === id) ?? null;
export const locationById = (id: string | null) => locations.find((l) => l.id === id) ?? null;
export const employeeById = (id: string | null) => employees.find((e) => e.id === id) ?? null;

export interface UserRec {
  id: string;
  name: string;
  username: string;
  email: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  role: { name: string };
}

export const users: UserRec[] = [
  { id: "u-hyper", name: "Rina Kusumawati", username: "hyperadmin", email: "hyperadmin@demo.local", isActive: true, lastLoginAt: ago(0, 2), createdAt: ago(200), role: { name: "HYPER_ADMIN" } },
  { id: "u-super", name: "Budi Santoso", username: "superadmin", email: "superadmin@demo.local", isActive: true, lastLoginAt: ago(1), createdAt: ago(190), role: { name: "SUPER_ADMIN" } },
  { id: "u-bmn", name: "Dewi Lestari", username: "adminbmn", email: "adminbmn@demo.local", isActive: true, lastLoginAt: ago(0, 6), createdAt: ago(150), role: { name: "ADMIN_BMN" } },
  { id: "u-atk", name: "Agus Prasetyo", username: "adminatk", email: "adminatk@demo.local", isActive: true, lastLoginAt: ago(2), createdAt: ago(150), role: { name: "ADMIN_ATK" } },
  { id: "u-staff", name: "Siti Nurhaliza", username: "staf", email: "staf@demo.local", isActive: true, lastLoginAt: ago(5), createdAt: ago(90), role: { name: "STAFF" } },
  { id: "u-staff2", name: "Yoga Permana", username: "yoga", email: "yoga@demo.local", isActive: false, lastLoginAt: ago(60), createdAt: ago(120), role: { name: "STAFF" } },
];
export const userName = (id: string | null) => users.find((u) => u.id === id)?.name ?? null;

export interface BorrowingRec {
  id: string;
  itemId: string;
  status: BorrowingStatus;
  borrowerType: BorrowerType;
  borrowerId: string | null;
  externalParty: string | null;
  basisDocument: string | null;
  usageType: string | null;
  notes: string | null;
  requestedById: string | null;
  approvedById: string | null;
  rejectedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  borrowedAt: Date;
  expectedReturnAt: Date | null;
  returnedAt: Date | null;
}

const bid = (n: number) => uid(K.borrowing, n);
const itemId = (n: number) => uid(K.item, n);

export const borrowings: BorrowingRec[] = [
  { id: bid(1), itemId: itemId(3), status: "BORROWED", borrowerType: "EMPLOYEE", borrowerId: EMPLOYEE_IDS[5], externalParty: null, basisDocument: "ND-112/BU/2026", usageType: "Perjalanan dinas", notes: "Dipakai untuk monitoring lapangan", requestedById: "u-bmn", approvedById: "u-super", rejectedReason: null, createdAt: ago(6), updatedAt: ago(6), borrowedAt: ago(6), expectedReturnAt: ago(-2), returnedAt: null },
  { id: bid(2), itemId: itemId(16), status: "BORROWED", borrowerType: "EMPLOYEE", borrowerId: EMPLOYEE_IDS[6], externalParty: null, basisDocument: "ND-118/BU/2026", usageType: "Rapat koordinasi", notes: null, requestedById: "u-bmn", approvedById: "u-bmn", rejectedReason: null, createdAt: ago(9), updatedAt: ago(9), borrowedAt: ago(9), expectedReturnAt: ago(2), returnedAt: null },
  { id: bid(3), itemId: itemId(17), status: "PENDING", borrowerType: "EMPLOYEE", borrowerId: EMPLOYEE_IDS[3], externalParty: null, basisDocument: null, usageType: "Dokumentasi kegiatan", notes: "Untuk acara sosialisasi", requestedById: "u-atk", approvedById: null, rejectedReason: null, createdAt: ago(0, 5), updatedAt: ago(0, 5), borrowedAt: ago(-1), expectedReturnAt: ago(-4), returnedAt: null },
  { id: bid(4), itemId: itemId(10), status: "PENDING", borrowerType: "EXTERNAL", borrowerId: null, externalParty: "Dinas Kearsipan Daerah", basisDocument: "Surat 045/DKD/2026", usageType: "Digunakan sementara oleh pihak lain", notes: null, requestedById: "u-bmn", approvedById: null, rejectedReason: null, createdAt: ago(1), updatedAt: ago(1), borrowedAt: ago(-2), expectedReturnAt: ago(-9), returnedAt: null },
  { id: bid(5), itemId: itemId(8), status: "RETURNED", borrowerType: "EMPLOYEE", borrowerId: EMPLOYEE_IDS[0], externalParty: null, basisDocument: "ND-091/BU/2026", usageType: "Kegiatan sosialisasi", notes: null, requestedById: "u-bmn", approvedById: "u-super", rejectedReason: null, createdAt: ago(30), updatedAt: ago(24), borrowedAt: ago(30), expectedReturnAt: ago(25), returnedAt: ago(24) },
  { id: bid(6), itemId: itemId(13), status: "REJECTED", borrowerType: "EXTERNAL", borrowerId: null, externalParty: "Komunitas Pemuda Mandiri", basisDocument: null, usageType: null, notes: null, requestedById: "u-bmn", approvedById: "u-super", rejectedReason: "Dijadwalkan untuk rapat internal pada tanggal yang sama.", createdAt: ago(18), updatedAt: ago(17), borrowedAt: ago(16), expectedReturnAt: ago(15), returnedAt: null },
  { id: bid(7), itemId: itemId(1), status: "CANCELLED", borrowerType: "EMPLOYEE", borrowerId: EMPLOYEE_IDS[4], externalParty: null, basisDocument: null, usageType: null, notes: "Dibatalkan oleh pemohon", requestedById: "u-bmn", approvedById: null, rejectedReason: null, createdAt: ago(21), updatedAt: ago(21), borrowedAt: ago(20), expectedReturnAt: ago(18), returnedAt: null },
];

export interface TransactionRec {
  id: string;
  itemId: string;
  type: TransactionType;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  fromLocationId: string | null;
  toLocationId: string | null;
  fromPicId: string | null;
  toPicId: string | null;
  fromPicName: string | null;
  toPicName: string | null;
  description: string | null;
  performedById: string;
  createdAt: Date;
}

let txn = 0;
const tx = (r: Omit<TransactionRec, "id" | "fromLocationId" | "toLocationId" | "fromPicId" | "toPicId" | "fromPicName" | "toPicName"> & Partial<TransactionRec>): TransactionRec => ({
  fromLocationId: null,
  toLocationId: null,
  fromPicId: null,
  toPicId: null,
  fromPicName: null,
  toPicName: null,
  ...r,
  id: uid(K.tx, ++txn),
});

export const transactions: TransactionRec[] = [
  tx({ itemId: itemId(21), type: "OUT", quantity: 6, quantityBefore: 48, quantityAfter: 42, description: "Permintaan Sub Bagian Umum", performedById: "u-atk", createdAt: ago(0, 3) }),
  tx({ itemId: itemId(22), type: "OUT", quantity: 4, quantityBefore: 10, quantityAfter: 6, description: "Permintaan Bagian Keuangan", performedById: "u-atk", createdAt: ago(0, 8) }),
  tx({ itemId: itemId(3), type: "BORROW", quantity: 1, quantityBefore: 1, quantityAfter: 1, toPicId: EMPLOYEE_IDS[5], description: "Dipinjam Rizky Pratama", performedById: "u-super", createdAt: ago(6) }),
  tx({ itemId: itemId(29), type: "IN", quantity: 5, quantityBefore: 2, quantityAfter: 7, description: "Pembelian RAB-2026-001", performedById: "u-atk", createdAt: ago(2) }),
  tx({ itemId: itemId(16), type: "BORROW", quantity: 1, quantityBefore: 1, quantityAfter: 1, toPicId: EMPLOYEE_IDS[6], description: "Dipinjam Lina Marlina", performedById: "u-bmn", createdAt: ago(9) }),
  tx({ itemId: itemId(1), type: "TRANSFER", quantity: 1, quantityBefore: 1, quantityAfter: 1, fromLocationId: LOCATION_IDS.it, toLocationId: LOCATION_IDS.tu, fromPicId: EMPLOYEE_IDS[2], toPicId: EMPLOYEE_IDS[2], description: "Pindah ruang kerja", performedById: "u-bmn", createdAt: ago(12) }),
  tx({ itemId: itemId(25), type: "ADJUSTMENT", quantity: 4, quantityBefore: 6, quantityAfter: 4, description: "Penyesuaian hasil stock opname", performedById: "u-atk", createdAt: ago(14) }),
  tx({ itemId: itemId(8), type: "RETURN", quantity: 1, quantityBefore: 1, quantityAfter: 1, fromPicId: EMPLOYEE_IDS[0], description: "Dikembalikan Ahmad Fauzi", performedById: "u-bmn", createdAt: ago(24) }),
  tx({ itemId: itemId(30), type: "OUT", quantity: 2, quantityBefore: 3, quantityAfter: 1, description: "Pemakaian cetak laporan", performedById: "u-atk", createdAt: ago(3) }),
  tx({ itemId: itemId(23), type: "OUT", quantity: 1, quantityBefore: 1, quantityAfter: 0, description: "Kebutuhan cetak peta", performedById: "u-atk", createdAt: ago(5) }),
].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

export interface MaintenanceRec {
  id: string;
  itemId: string;
  problem: string;
  actionTaken: string | null;
  technician: string | null;
  executorType: MaintenanceExecutor;
  vendorName: string | null;
  status: MaintenanceStatus;
  cost: number | null;
  createdAt: Date;
  completedAt: Date | null;
}

export const maintenance: MaintenanceRec[] = [
  { id: uid(K.maint, 1), itemId: itemId(4), problem: "Layar berkedip dan engsel kiri longgar", actionTaken: null, technician: "Hendra Wijaya", executorType: "INTERNAL", vendorName: null, status: "IN_PROGRESS", cost: null, createdAt: ago(4), completedAt: null },
  { id: uid(K.maint, 2), itemId: itemId(14), problem: "Kompresor berisik dan kurang dingin", actionTaken: "Isi ulang freon dan servis unit", technician: null, executorType: "VENDOR", vendorName: "CV Sejuk Abadi", status: "COMPLETED", cost: 850_000, createdAt: ago(40), completedAt: ago(37) },
  { id: uid(K.maint, 3), itemId: itemId(12), problem: "Sandaran kursi goyang", actionTaken: null, technician: null, executorType: "INTERNAL", vendorName: null, status: "REPORTED", cost: null, createdAt: ago(1), completedAt: null },
];

export interface NoteRec {
  id: string;
  itemId: string;
  content: string;
  userId: string;
  createdAt: Date;
}

export const notes: NoteRec[] = [
  { id: uid(K.note, 1), itemId: itemId(4), content: "Sudah dicek: kabel fleksibel layar perlu diganti, menunggu suku cadang.", userId: "u-bmn", createdAt: ago(2) },
  { id: uid(K.note, 2), itemId: itemId(1), content: "Baterai masih sehat 92%.", userId: "u-bmn", createdAt: ago(15) },
];

export interface DisposalRec {
  id: string;
  itemId: string;
  status: DisposalStatus;
  reasonType: DisposalReason;
  reason: string | null;
  proposalNumber: string | null;
  proposalDate: Date | null;
  decisionNumber: string | null;
  decisionDate: Date | null;
  decisionNotes: string | null;
  completedAt: Date | null;
  createdAt: Date;
}

export const disposals: DisposalRec[] = [
  { id: uid(K.disposal, 1), itemId: itemId(20), status: "PROPOSED", reasonType: "DAMAGED", reason: "Kepala cetak rusak dan biaya perbaikan melebihi nilai buku.", proposalNumber: "UP-014/BU/2026", proposalDate: ago(8), decisionNumber: null, decisionDate: null, decisionNotes: null, completedAt: null, createdAt: ago(8) },
];

export interface ApprovalRec {
  id: string;
  kind: ApprovalKind;
  status: ApprovalStatus;
  summary: string;
  requestedById: string | null;
  decidedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  decidedAt: Date | null;
  rejectedReason: string | null;
  itemId: string | null;
  planId: string | null;
}

export const approvals: ApprovalRec[] = [
  { id: uid(K.approval, 1), kind: "STOCK_ADJUSTMENT", status: "PENDING", summary: "Penyesuaian stok Isi Staples No. 10: 5 → 2 kotak (hasil hitung fisik)", requestedById: "u-atk", decidedById: null, createdAt: ago(0, 4), updatedAt: ago(0, 4), decidedAt: null, rejectedReason: null, itemId: itemId(28), planId: null },
  { id: uid(K.approval, 2), kind: "BMN_TRANSFER", status: "PENDING", summary: "Pemindahan Proyektor Epson EB-X500 dari Ruang Rapat Anggrek ke Aula Serbaguna", requestedById: "u-bmn", decidedById: null, createdAt: ago(1), updatedAt: ago(1), decidedAt: null, rejectedReason: null, itemId: itemId(16), planId: null },
  { id: uid(K.approval, 3), kind: "DISPOSAL_DECISION", status: "APPROVED", summary: "Keputusan usulan penghapusan Laptop Dell Latitude 3420", requestedById: "u-bmn", decidedById: "u-super", createdAt: ago(20), updatedAt: ago(18), decidedAt: ago(18), rejectedReason: null, itemId: itemId(19), planId: null },
  { id: uid(K.approval, 4), kind: "STOCK_ADJUSTMENT", status: "REJECTED", summary: "Penyesuaian stok Pulpen Gel Pilot G-2 biru: 6 → 12 pak", requestedById: "u-atk", decidedById: "u-super", createdAt: ago(25), updatedAt: ago(24), decidedAt: ago(24), rejectedReason: "Jumlah tidak sesuai berita acara.", itemId: itemId(25), planId: null },
];

export interface OpnameItemRec {
  id: string;
  itemId: string;
  systemQuantity: number;
  actualQuantity: number;
  discrepancy: number;
  systemLocationId: string | null;
  actualLocationId: string | null;
  systemCondition: ItemCondition | null;
  actualCondition: ItemCondition | null;
  verificationStatus: VerificationStatus;
  notes: string | null;
}

export interface OpnameRec {
  id: string;
  code: string;
  status: StockOpnameStatus;
  mode: OpnameMode;
  bmnApplied: boolean;
  notes: string | null;
  locationId: string | null;
  createdById: string;
  startedAt: Date;
  completedAt: Date | null;
  items: OpnameItemRec[];
}

const opItem = (n: number, o: Partial<OpnameItemRec> & { itemN: number; system: number; actual: number; status: VerificationStatus }): OpnameItemRec => ({
  id: uid(K.opItem, n),
  itemId: itemId(o.itemN),
  systemQuantity: o.system,
  actualQuantity: o.actual,
  discrepancy: o.actual - o.system,
  systemLocationId: items.find((i) => i.id === itemId(o.itemN))?.locationId ?? null,
  actualLocationId: items.find((i) => i.id === itemId(o.itemN))?.locationId ?? null,
  systemCondition: "GOOD",
  actualCondition: "GOOD",
  verificationStatus: o.status,
  notes: null,
  ...o,
});

export const opnames: OpnameRec[] = [
  {
    id: uid(K.opname, 1),
    code: "OPN-2026-002",
    status: "IN_PROGRESS",
    mode: "STANDARD",
    bmnApplied: false,
    notes: "Opname ATK triwulan III",
    locationId: LOCATION_IDS.gudang,
    createdById: "u-atk",
    startedAt: ago(1),
    completedAt: null,
    items: [
      opItem(1, { itemN: 21, system: 42, actual: 42, status: "MATCH" }),
      opItem(2, { itemN: 22, system: 6, actual: 6, status: "MATCH" }),
      opItem(3, { itemN: 28, system: 5, actual: 2, status: "MISMATCH", notes: "Sebagian dipakai belum tercatat" }),
      opItem(4, { itemN: 29, system: 7, actual: 0, status: "NOT_VERIFIED" }),
      opItem(5, { itemN: 30, system: 1, actual: 0, status: "NOT_VERIFIED" }),
    ],
  },
  {
    id: uid(K.opname, 2),
    code: "OPN-2026-001",
    status: "COMPLETED",
    mode: "STANDARD",
    bmnApplied: true,
    notes: "Opname BMN Gedung A semester I",
    locationId: LOCATION_IDS.tu,
    createdById: "u-bmn",
    startedAt: ago(75),
    completedAt: ago(73),
    items: [
      opItem(11, { itemN: 1, system: 1, actual: 1, status: "MATCH" }),
      opItem(12, { itemN: 5, system: 1, actual: 1, status: "MATCH" }),
      opItem(13, { itemN: 8, system: 1, actual: 1, status: "MATCH" }),
      opItem(14, { itemN: 19, system: 1, actual: 0, status: "NOT_FOUND", notes: "Tidak ditemukan, diusulkan hilang" }),
    ],
  },
];

export interface PlanLineRec {
  id: string;
  lineNo: number;
  itemId: string | null;
  description: string;
  volume: number;
  unit: string;
  unitPrice: number;
  shippingCost: number;
  link: string | null;
  hasImage: boolean;
  receivedQuantity: number | null;
}

export interface PlanReceiptRec {
  id: string;
  receiptNo: number;
  receivedAt: Date;
  notes: string | null;
  createdById: string | null;
  lines: { id: string; lineNo: number; quantity: number }[];
}

export interface PlanRec {
  id: string;
  code: string;
  title: string;
  planDate: Date;
  priceFactor: number;
  ppnRate: number;
  rounding: number | null;
  status: PurchasePlanStatus;
  notes: string | null;
  createdById: string;
  lines: PlanLineRec[];
  receipts: PlanReceiptRec[];
}

export const plans: PlanRec[] = [
  {
    id: uid(K.plan, 1),
    code: "RAB-2026-002",
    title: "Pengadaan ATK triwulan IV",
    planDate: ago(3),
    priceFactor: 1,
    ppnRate: 0.11,
    rounding: null,
    status: "DRAFT",
    notes: "Menunggu konfirmasi anggaran",
    createdById: "u-atk",
    lines: [
      { id: uid(K.line, 1), lineNo: 1, itemId: itemId(23), description: "Kertas HVS A3 80 gsm", volume: 6, unit: "rim", unitPrice: 112_000, shippingCost: 25_000, link: null, hasImage: false, receivedQuantity: null },
      { id: uid(K.line, 2), lineNo: 2, itemId: itemId(30), description: "Tinta Epson 003 magenta", volume: 5, unit: "botol", unitPrice: 92_000, shippingCost: 0, link: null, hasImage: false, receivedQuantity: null },
      { id: uid(K.line, 3), lineNo: 3, itemId: itemId(28), description: "Isi Staples No. 10", volume: 24, unit: "kotak", unitPrice: 4_500, shippingCost: 0, link: null, hasImage: false, receivedQuantity: null },
    ],
    receipts: [],
  },
  {
    id: uid(K.plan, 2),
    code: "RAB-2026-001",
    title: "Pengadaan tinta dan kertas semester I",
    planDate: ago(40),
    priceFactor: 1,
    ppnRate: 0.11,
    rounding: null,
    status: "PARTIAL",
    notes: null,
    createdById: "u-atk",
    lines: [
      { id: uid(K.line, 11), lineNo: 1, itemId: itemId(29), description: "Tinta Epson 003 hitam", volume: 10, unit: "botol", unitPrice: 92_000, shippingCost: 20_000, link: null, hasImage: false, receivedQuantity: 5 },
      { id: uid(K.line, 12), lineNo: 2, itemId: itemId(21), description: "Kertas HVS A4 70 gsm", volume: 40, unit: "rim", unitPrice: 52_000, shippingCost: 50_000, link: null, hasImage: false, receivedQuantity: 40 },
    ],
    receipts: [
      { id: uid(K.receipt, 1), receiptNo: 1, receivedAt: ago(30), notes: "Penerimaan tahap 1", createdById: "u-atk", lines: [{ id: uid(K.receipt, 101), lineNo: 1, quantity: 5 }, { id: uid(K.receipt, 102), lineNo: 2, quantity: 40 }] },
    ],
  },
];

export interface HistoryRec {
  id: string;
  createdAt: Date;
  userName: string;
  role: string;
  action: string;
  module: string;
  description: string;
  ipAddress: string | null;
  oldValue: unknown;
  newValue: unknown;
}

let logN = 0;
const log = (daysAgo: number, userName: string, role: string, action: string, module: string, description: string, extra: Partial<HistoryRec> = {}): HistoryRec => ({
  id: uid(K.log, ++logN),
  createdAt: ago(daysAgo),
  userName,
  role,
  action,
  module,
  description,
  ipAddress: "10.20.1.15",
  oldValue: null,
  newValue: null,
  ...extra,
});

export const historyLogs: HistoryRec[] = [
  log(0.1, "Agus Prasetyo", "ADMIN_ATK", "STOCK_OUT", "Inventory", "Barang keluar: Kertas HVS A4 70 gsm (6 rim)", { oldValue: { quantity: 48 }, newValue: { quantity: 42 } }),
  log(0.3, "Agus Prasetyo", "ADMIN_ATK", "STOCK_OUT", "Inventory", "Barang keluar: Kertas HVS F4 70 gsm (4 rim)", { oldValue: { quantity: 10 }, newValue: { quantity: 6 } }),
  log(0.5, "Dewi Lestari", "ADMIN_BMN", "LOGIN", "Auth", "Dewi Lestari masuk ke sistem"),
  log(1, "Dewi Lestari", "ADMIN_BMN", "UPDATE", "Approval", "Mengajukan pemindahan Proyektor Epson EB-X500"),
  log(2, "Agus Prasetyo", "ADMIN_ATK", "STOCK_IN", "Inventory", "Barang masuk: Tinta Epson 003 hitam (5 botol)", { oldValue: { quantity: 2 }, newValue: { quantity: 7 } }),
  log(4, "Dewi Lestari", "ADMIN_BMN", "MAINTENANCE", "Maintenance", "Melaporkan kerusakan Laptop HP ProBook 440"),
  log(6, "Budi Santoso", "SUPER_ADMIN", "APPROVE", "Borrowing", "Menyetujui peminjaman Laptop Acer Aspire 5 oleh Rizky Pratama"),
  log(8, "Dewi Lestari", "ADMIN_BMN", "UPDATE", "Disposal", "Mengusulkan penghapusan Printer Canon PIXMA G2010"),
  log(9, "Dewi Lestari", "ADMIN_BMN", "BORROW", "Borrowing", "Meminjamkan Proyektor Epson EB-X500 kepada Lina Marlina"),
  log(12, "Dewi Lestari", "ADMIN_BMN", "TRANSFER", "Inventory", "Memindahkan Laptop ASUS ExpertBook B1 ke Ruang Tata Usaha", { oldValue: { location: "Ruang Teknologi Informasi" }, newValue: { location: "Ruang Tata Usaha" } }),
  log(18, "Budi Santoso", "SUPER_ADMIN", "REJECT", "Borrowing", "Menolak peminjaman Meja Rapat Oval 3 m oleh Komunitas Pemuda Mandiri"),
  log(24, "Dewi Lestari", "ADMIN_BMN", "RETURN", "Borrowing", "Pengembalian Printer Epson L3250 oleh Ahmad Fauzi"),
  log(30, "Rina Kusumawati", "HYPER_ADMIN", "CREATE", "User", "Membuat akun staf"),
  log(45, "Rina Kusumawati", "HYPER_ADMIN", "UPDATE", "Settings", "Mengubah pengaturan sistem", { oldValue: { reminderDays: 5 }, newValue: { reminderDays: 3 } }),
  log(60, "Budi Santoso", "SUPER_ADMIN", "IMPORT", "Inventory", "Impor 20 aset BMN dari berkas SIMAN"),
];

export interface ReviewRec {
  id: string;
  createdAt: Date;
  reviewerName: string;
  rating: number;
  comment: string;
  userName: string;
  username: string;
}

export const reviews: ReviewRec[] = [
  { id: uid(K.review, 1), createdAt: ago(1), reviewerName: "Maya Puspita", rating: 5, comment: "Mudah dipakai, pencarian cepat. Hitung stok jadi lebih rapi.", userName: "Siti Nurhaliza", username: "staf" },
  { id: uid(K.review, 2), createdAt: ago(6), reviewerName: "Anonim", rating: 4, comment: "Tampilan jelas. Mohon ditambahkan cetak label QR untuk aset.", userName: "Agus Prasetyo", username: "adminatk" },
  { id: uid(K.review, 3), createdAt: ago(14), reviewerName: "Ahmad Fauzi", rating: 4, comment: "Peminjaman dan persetujuan sudah jelas alurnya.", userName: "Dewi Lestari", username: "adminbmn" },
];

export interface FieldDefRec {
  id: string;
  categoryId: string;
  label: string;
  type: "TEXT" | "NUMBER" | "DATE" | "SELECT" | "BOOLEAN";
  options: string[];
  required: boolean;
  sortOrder: number;
  showInList: boolean;
  filterable: boolean;
  archivedAt: Date | null;
  createdAt: Date;
}

export const fieldDefs: FieldDefRec[] = [
  { id: uid(K.field, 1), categoryId: CATEGORY_IDS.vehicle, label: "Nomor polisi", type: "TEXT", options: [], required: true, sortOrder: 1, showInList: true, filterable: false, archivedAt: null, createdAt: ago(100) },
  { id: uid(K.field, 2), categoryId: CATEGORY_IDS.vehicle, label: "Masa berlaku STNK", type: "DATE", options: [], required: false, sortOrder: 2, showInList: true, filterable: false, archivedAt: null, createdAt: ago(100) },
  { id: uid(K.field, 3), categoryId: CATEGORY_IDS.laptop, label: "Sistem operasi", type: "SELECT", options: ["Windows 10", "Windows 11", "Linux"], required: false, sortOrder: 1, showInList: false, filterable: true, archivedAt: null, createdAt: ago(90) },
];

export interface RoleRec {
  name: string;
  label: string;
  isSystem: boolean;
  capabilities: Capability[];
}
