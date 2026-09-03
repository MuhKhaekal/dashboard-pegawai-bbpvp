import type { Pegawai } from "./types";

export const SATPEL_DAERAH = ["SATPEL Mamuju", "SATPEL Majene", "SATPEL Palu"];

export const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export const JENJANG = ["Ahli Utama", "Ahli Madya", "Ahli Muda", "Ahli Pertama", "Mahir", "Terampil"];

export const KATEGORI = [
  { key: "Instruktur", label: "Instruktur" },
  { key: "SDM", label: "Analis SDM" },
  { key: "PengantarKerja", label: "Pengantar Kerja" },
  { key: "Perencana", label: "Perencana" },
  { key: "Arsiparis", label: "Arsiparis" },
  { key: "Prakom", label: "Pranata Komputer" },
  { key: "Keuangan", label: "Keuangan APBN" },
  { key: "Barang", label: "Penata Laksana Barang" },
];

export const PELAKSANA = [
  "Penelaah Teknis Kebijakan",
  "Teknisi Sarana dan Prasarana",
  "Penata Kelola Sistem dan Teknologi Informasi",
  "Konselor SDM",
  "Penata Layanan Operasional",
  "Pengelola Layanan Operasional",
  "Pengadministrasi Perkantoran",
  "Operator Layanan Operasional",
  "Pengelola Umum Operasional",
];

export function getGender(pegawai: Pegawai): "L" | "P" | null {
  const nip = pegawai.nip ? String(pegawai.nip).replace(/\D/g, "") : "";

  if ((pegawai.status_kepegawaian === "PNS" || pegawai.status_kepegawaian === "PPPK") && nip.length >= 15) {
    const code = nip.charAt(14);

    if (code === "1") return "L";
    if (code === "2") return "P";
  }

  return null;
}

export function getUsia(pegawai: Pegawai, currentYear = new Date().getFullYear()): number | null {
  if (!pegawai.tanggal_lahir) return null;

  const tahunLahir = new Date(pegawai.tanggal_lahir).getFullYear();

  return currentYear - tahunLahir;
}

export function getKategoriUsia(pegawai: Pegawai, currentYear = new Date().getFullYear()): string | null {
  const umur = getUsia(pegawai, currentYear);

  if (umur === null) return null;

  if (umur < 30) return "Di bawah 30";
  if (umur <= 40) return "30–40";
  if (umur <= 50) return "41–50";

  return "Di atas 50";
}

export function getGenerasi(pegawai: Pegawai): string | null {
  if (!pegawai.tanggal_lahir) return null;

  const tahunLahir = new Date(pegawai.tanggal_lahir).getFullYear();

  if (tahunLahir <= 1964) return "Baby Boomer";
  if (tahunLahir <= 1980) return "Gen X";
  if (tahunLahir <= 1996) return "Milenial";

  return "Gen Z";
}

export function getBatasPensiun(pegawai: Pegawai): number {
  let batasUsia = 58;

  if (pegawai.jabatan?.includes("Utama")) {
    batasUsia = 65;
  } else if (pegawai.jabatan?.includes("Madya") || pegawai.jabatan === "Kepala BBPVP Makassar") {
    batasUsia = 60;
  }

  return batasUsia;
}

export function getSisaPensiun(pegawai: Pegawai, currentYear = new Date().getFullYear()): number | null {
  if (pegawai.status_kepegawaian === "Non ASN" || !pegawai.tanggal_lahir) {
    return null;
  }

  const tahunLahir = new Date(pegawai.tanggal_lahir).getFullYear();

  return tahunLahir + getBatasPensiun(pegawai) - currentYear;
}

export function getKategoriPensiun(pegawai: Pegawai, currentYear = new Date().getFullYear()): string | null {
  const sisa = getSisaPensiun(pegawai, currentYear);

  if (sisa === null) return null;

  if (sisa <= 0) return "Tahun Ini";
  if (sisa <= 2) return "1–2 Tahun";
  if (sisa <= 5) return "3–5 Tahun";

  return "> 5 Tahun";
}

export function getTotalSisaCuti(pegawai: Pegawai): number {
  return (Number(pegawai.sisa_cuti_tahun_lalu) || 0) + (Number(pegawai.cuti_tahun_ini) || 0);
}

export function getKategoriCuti(pegawai: Pegawai): string {
  const total = getTotalSisaCuti(pegawai);

  if (total <= 3) return "Kritis";
  if (total <= 6) return "Menipis";
  if (total <= 12) return "Aman";

  return "Berlebih";
}

export function getTotalCutiTerpakai(pegawai: Pegawai, currentYear = new Date().getFullYear()): number {
  return (pegawai.riwayat_cuti || []).filter((record) => record.tahun === currentYear).reduce((total, record) => total + Number(record.durasi || 0), 0);
}

export function getKategoriGolongan(pegawai: Pegawai): string {
  const pangkat = pegawai.pangkat_golongan || "";

  if (pangkat.startsWith("I/")) return "Gol I";
  if (pangkat.startsWith("II/")) return "Gol II";
  if (pangkat.startsWith("III/")) return "Gol III";
  if (pangkat.startsWith("IV/")) return "Gol IV";

  return "Lainnya";
}

// export function getKategoriPendidikan(pegawai: Pegawai) {
//   const nama = (pegawai.nama || "").toUpperCase();

//   if (nama.includes("DR. ") || nama.startsWith("DR.") || nama.includes("PH.D")) {
//     return "S3";
//   }

//   if (nama.includes(", M.") || nama.includes(",M.")) {
//     return "S2";
//   }

//   if (nama.includes(", S.") || nama.includes(",S.") || nama.includes("S.ST") || nama.includes("S.TR")) {
//     return "S1 / D4";
//   }

//   if (nama.includes("A.MD") || nama.includes("A.MA")) {
//     return "D1–D3";
//   }

//   return "SMA / Umum";
// }

export function getJenjang(pegawai: Pegawai): string | null {
  const jabatan = pegawai.jabatan || "";

  for (const jenjang of JENJANG) {
    if (jabatan.includes(jenjang)) {
      return jenjang;
    }
  }

  return null;
}

export function getKategoriFungsional(pegawai: Pegawai): string | null {
  const jabatan = pegawai.jabatan || "";

  if (jabatan.includes("Instruktur")) {
    return "Instruktur";
  }

  if (jabatan.includes("Sumber Daya Manusia Aparatur")) {
    return "SDM";
  }

  if (jabatan.includes("Pengantar Kerja")) {
    return "PengantarKerja";
  }

  if (jabatan.includes("Perencana")) {
    return "Perencana";
  }

  if (jabatan.includes("Arsiparis")) {
    return "Arsiparis";
  }

  if (jabatan.includes("Pranata Komputer")) {
    return "Prakom";
  }

  if (jabatan.includes("Keuangan APBN")) {
    return "Keuangan";
  }

  if (jabatan.includes("Penata Laksana Barang")) {
    return "Barang";
  }

  return null;
}

export function isSatpel(pegawai: Pegawai): boolean {
  return SATPEL_DAERAH.includes(pegawai.bidang || "");
}

export function getUnit(pegawai: Pegawai): "Satpel" | "Pusat" {
  return isSatpel(pegawai) ? "Satpel" : "Pusat";
}
