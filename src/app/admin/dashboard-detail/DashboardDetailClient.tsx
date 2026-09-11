"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Pegawai } from "../types";

import {
  getGender,
  getUsia,
  getGenerasi,
  getKategoriUsia,
  getKategoriCuti,
  getKategoriGolongan,
  getKategoriPensiun,
  getKategoriFungsional,
  getJenjang,
  getSisaPensiun,
  getTotalSisaCuti,
  getTotalCutiTerpakai,
  isSatpel,
  getUnit,
} from "../dashboard-utils";

interface Props {
  initialData: Pegawai[];
  filter: string;
  value: string;
  category: string;

  /*
   * Filter yang diwariskan dari dashboard utama
   */
  baseStatus?: string;
  baseUnit?: string;
  baseSearch?: string;
}

const currentYear = new Date().getFullYear();

const SATPEL_DAERAH = ["SATPEL Mamuju", "SATPEL Majene", "SATPEL Palu"];

/*
|--------------------------------------------------------------------------
| NORMALISASI
|--------------------------------------------------------------------------
*/

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/*
|--------------------------------------------------------------------------
| FORMAT TANGGAL
|--------------------------------------------------------------------------
*/

function formatTanggal(value: string | Date | null | undefined): string {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

/*
|--------------------------------------------------------------------------
| TITLE
|--------------------------------------------------------------------------
*/

function getTitle(filter: string, value: string, category: string): string {
  if (filter === "status") {
    return value === "ASN" ? "Seluruh Pegawai ASN" : `Pegawai ${value}`;
  }

  if (filter === "unit") {
    return `Pegawai Unit ${value}`;
  }

  if (filter === "satpel") {
    return value;
  }

  if (filter === "generasi") {
    return `Generasi ${value}`;
  }

  if (filter === "usia") {
    return `Pegawai Usia ${value}`;
  }

  if (filter === "gender") {
    return value === "L" ? "Pegawai Laki-Laki" : "Pegawai Perempuan";
  }

  if (filter === "cuti") {
    return `Cuti ${value}`;
  }

  if (filter === "pensiun") {
    return `Proyeksi Pensiun ${value}`;
  }

  if (filter === "golongan") {
    return `Pegawai ${value}`;
  }

  if (filter === "golongan-pppk") {
    return `Pegawai PPPK Golongan ${value}`;
  }

  if (filter === "pangkat") {
    return `Pegawai Pangkat ${value}`;
  }

  if (filter === "pendidikan") {
    return `Pendidikan ${value}`;
  }

  if (filter === "fungsional") {
    if (category) {
      return `${category} — ${value}`;
    }

    return `Jabatan Fungsional ${value}`;
  }

  if (filter === "jabatan-unit") {
    if (category === "Satpel") {
      return `${value} — SATPEL`;
    }

    if (category === "Pusat") {
      return `${value} — BBPVP Makassar`;
    }

    return value;
  }

  if (filter === "jabatan") {
    return value;
  }

  if (filter === "cuti-bulan") {
    return `Penggunaan Cuti Bulan ${value}`;
  }

  if (filter === "pensiun-risk") {
    return "Pegawai dengan Risiko Pensiun 0–2 Tahun";
  }

  return "Detail Pegawai";
}

/*
|--------------------------------------------------------------------------
| PRIORITAS STATUS
|--------------------------------------------------------------------------
|
| Status digunakan sebagai urutan terakhir setelah jabatan dan pangkat.
|
| PNS → PPPK → Non ASN
|
*/

function getPrioritasStatus(status: string | undefined): number {
  const normalized = normalizeText(status);

  if (normalized === "pns") {
    return 1;
  }

  if (normalized === "pppk") {
    return 2;
  }

  if (normalized === "non asn") {
    return 3;
  }

  return 99;
}

/*
|--------------------------------------------------------------------------
| PRIORITAS JABATAN
|--------------------------------------------------------------------------
|
| Semakin kecil angka = semakin tinggi prioritas.
|
| Struktur dibuat berdasarkan jabatan yang memang muncul pada database.
|
*/

function getPrioritasJabatan(jabatan: string | undefined): number {
  const value = normalizeText(jabatan);

  if (!value) {
    return 999;
  }

  /*
   * PIMPINAN
   */
  if (value === "kepala bbpvp makassar") {
    return 1;
  }

  if (value.includes("kabag umum") || value.includes("kepala bagian umum")) {
    return 2;
  }

  /*
   * KOORDINASI
   */
  if (value.includes("koordinator")) {
    return 3;
  }

  if (value.includes("subkoordinator")) {
    return 4;
  }

  /*
   * JENJANG FUNGSIONAL
   */
  if (value.includes("ahli utama")) {
    return 10;
  }

  if (value.includes("ahli madya")) {
    return 20;
  }

  if (value.includes("ahli muda")) {
    return 30;
  }

  if (value.includes("ahli pertama")) {
    return 40;
  }

  if (value.includes("penyelia")) {
    return 50;
  }

  if (value.includes("mahir")) {
    return 60;
  }

  if (value.includes("terampil")) {
    return 70;
  }

  /*
   * JABATAN FUNGSIONAL / PELAKSANA TEKNIS
   */
  if (value.includes("instruktur")) {
    return 80;
  }

  if (value.includes("pengantar kerja")) {
    return 81;
  }

  if (value.includes("perencana")) {
    return 82;
  }

  if (value.includes("arsiparis")) {
    return 83;
  }

  if (value.includes("analis")) {
    return 84;
  }

  if (value.includes("penelaah")) {
    return 85;
  }

  if (value.includes("pranata")) {
    return 86;
  }

  if (value.includes("penata")) {
    return 87;
  }

  /*
   * PELAKSANA
   */
  if (value.includes("pengelola")) {
    return 90;
  }

  if (value.includes("operator")) {
    return 91;
  }

  if (value.includes("teknisi")) {
    return 92;
  }

  if (value.includes("pengadministrasi")) {
    return 93;
  }

  /*
   * NON ASN / SUPPORT
   */
  if (value.includes("security")) {
    return 110;
  }

  if (value.includes("cleaning")) {
    return 120;
  }

  if (value.includes("driver")) {
    return 130;
  }

  if (value.includes("pramubakti")) {
    return 140;
  }

  return 999;
}

/*
|--------------------------------------------------------------------------
| KOMPONEN GOLONGAN PNS
|--------------------------------------------------------------------------
|
| Database:
|
| IV/c: Pembina Utama Muda
| IV/b: Pembina Tingkat I
| IV/a: Pembina
| III/d: Penata Tingkat I
| III/c: Penata
| III/b: Penata Muda Tingkat I
| III/a: Penata Muda
| II/d: Pengatur Tingkat I
| II/c: Pengatur
| II/a: Pengatur Muda
|
| Urutan:
|
| IV/d → IV/c → IV/b → IV/a
| III/d → III/c → III/b → III/a
| II/d → II/c → II/b → II/a
| I/d → I/c → I/b → I/a
|
*/

interface GolonganPNS {
  tingkat: number;
  sub: number;
}

function getKomponenGolonganPNS(pangkat: string | undefined): GolonganPNS {
  const value = String(pangkat ?? "")
    .trim()
    .toUpperCase();

  const match = value.match(/^([IV]+)\/([A-D])(?:\s*:)?/);

  if (!match) {
    return {
      tingkat: 999,
      sub: 999,
    };
  }

  const tingkatMap: Record<string, number> = {
    IV: 1,
    III: 2,
    II: 3,
    I: 4,
  };

  const subMap: Record<string, number> = {
    D: 1,
    C: 2,
    B: 3,
    A: 4,
  };

  return {
    tingkat: tingkatMap[match[1]] ?? 999,
    sub: subMap[match[2]] ?? 999,
  };
}

/*
|--------------------------------------------------------------------------
| PRIORITAS GOLONGAN PPPK
|--------------------------------------------------------------------------
|
| PPPK menggunakan angka Romawi:
|
| XI → X → IX → VIII → VII → VI → V → IV → III → II → I
|
*/

function getPrioritasGolonganPPPK(pangkat: string | undefined): number {
  const value = String(pangkat ?? "")
    .trim()
    .toUpperCase();

  const prioritas: Record<string, number> = {
    XI: 1,
    X: 2,
    IX: 3,
    VIII: 4,
    VII: 5,
    VI: 6,
    V: 7,
    IV: 8,
    III: 9,
    II: 10,
    I: 11,
  };

  return prioritas[value] ?? 999;
}

/*
|--------------------------------------------------------------------------
| PRIORITAS PANGKAT
|--------------------------------------------------------------------------
*/

function getPrioritasPangkat(pegawai: Pegawai): number {
  const status = normalizeText(pegawai.status_kepegawaian);

  if (status === "pns") {
    const golongan = getKomponenGolonganPNS(pegawai.pangkat_golongan);

    return golongan.tingkat * 100 + golongan.sub;
  }

  if (status === "pppk") {
    return 500 + getPrioritasGolonganPPPK(pegawai.pangkat_golongan);
  }

  /*
   * Non ASN biasanya menggunakan "-"
   */
  return 999;
}

/*
|--------------------------------------------------------------------------
| KUNCI SORTING LENGKAP
|--------------------------------------------------------------------------
|
| 1. Jabatan
| 2. Pangkat
| 3. Status
| 4. Nama
|
*/

function comparePegawai(a: Pegawai, b: Pegawai): number {
  /*
   * 1. JABATAN
   */
  const jabatanA = getPrioritasJabatan(a.jabatan);
  const jabatanB = getPrioritasJabatan(b.jabatan);

  if (jabatanA !== jabatanB) {
    return jabatanA - jabatanB;
  }

  /*
   * Jika prioritas jabatan sama,
   * gunakan nama jabatan sebagai pembeda.
   */
  const namaJabatanA = normalizeText(a.jabatan);
  const namaJabatanB = normalizeText(b.jabatan);

  const compareJabatan = namaJabatanA.localeCompare(namaJabatanB, "id", {
    sensitivity: "base",
  });

  if (compareJabatan !== 0) {
    return compareJabatan;
  }

  /*
   * 2. PANGKAT
   */
  const pangkatA = getPrioritasPangkat(a);
  const pangkatB = getPrioritasPangkat(b);

  if (pangkatA !== pangkatB) {
    return pangkatA - pangkatB;
  }

  /*
   * 3. STATUS
   *
   * PNS → PPPK → Non ASN
   */
  const statusA = getPrioritasStatus(a.status_kepegawaian);

  const statusB = getPrioritasStatus(b.status_kepegawaian);

  if (statusA !== statusB) {
    return statusA - statusB;
  }

  /*
   * 4. NAMA
   */
  return normalizeText(a.nama).localeCompare(normalizeText(b.nama), "id", {
    sensitivity: "base",
  });
}

/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

export default function DashboardDetailClient({ initialData, filter, value, category, baseStatus = "", baseUnit = "", baseSearch = "" }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  /*
  |--------------------------------------------------------------------------
  | FILTER DATA
  |--------------------------------------------------------------------------
  |
  | SEMUA FILTER HARUS TERAKUMULASI:
  |
  | baseStatus
  | AND
  | baseUnit
  | AND
  | baseSearch
  | AND
  | filter drill-down
  |
  */

  const filteredData = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const normalizedBaseSearch = baseSearch.trim().toLowerCase();

    return initialData.filter((pegawai) => {
      /*
       * =====================================================
       * 1. FILTER STATUS DARI DASHBOARD UTAMA
       * =====================================================
       */
      const cocokBaseStatus = !baseStatus || baseStatus === "Semua" || (baseStatus === "ASN" && (pegawai.status_kepegawaian === "PNS" || pegawai.status_kepegawaian === "PPPK")) || pegawai.status_kepegawaian === baseStatus;

      if (!cocokBaseStatus) {
        return false;
      }

      /*
       * =====================================================
       * 2. FILTER UNIT DARI DASHBOARD UTAMA
       * =====================================================
       */
      const bidangPegawai = String(pegawai.bidang ?? "").trim();

      const pegawaiIsSatpel = SATPEL_DAERAH.includes(bidangPegawai);

      const cocokBaseUnit = !baseUnit || baseUnit === "Semua" || (baseUnit === "Satpel" && pegawaiIsSatpel) || (baseUnit === "Pusat" && !pegawaiIsSatpel);

      if (!cocokBaseUnit) {
        return false;
      }

      /*
       * =====================================================
       * 3. SEARCH DARI DASHBOARD UTAMA
       * =====================================================
       */
      if (normalizedBaseSearch) {
        const nama = normalizeText(pegawai.nama);

        const nip = normalizeText(pegawai.nip);

        const jabatan = normalizeText(pegawai.jabatan);

        const status = normalizeText(pegawai.status_kepegawaian);

        const bidang = normalizeText(pegawai.bidang);

        const pangkat = normalizeText(pegawai.pangkat_golongan);

        const unit = normalizeText(getUnit(pegawai));

        const cocokBaseSearch =
          nama.includes(normalizedBaseSearch) ||
          nip.includes(normalizedBaseSearch) ||
          jabatan.includes(normalizedBaseSearch) ||
          status.includes(normalizedBaseSearch) ||
          bidang.includes(normalizedBaseSearch) ||
          pangkat.includes(normalizedBaseSearch) ||
          unit.includes(normalizedBaseSearch);

        if (!cocokBaseSearch) {
          return false;
        }
      }

      /*
       * =====================================================
       * 4. FILTER DRILL-DOWN
       * =====================================================
       */

      let cocokFilter = true;

      /*
       * STATUS
       */
      if (filter === "status") {
        if (value === "ASN") {
          cocokFilter = pegawai.status_kepegawaian === "PNS" || pegawai.status_kepegawaian === "PPPK";
        } else {
          cocokFilter = pegawai.status_kepegawaian === value;
        }
      }

      /*
       * UNIT
       */
      if (filter === "unit") {
        cocokFilter = (value === "Satpel" && pegawaiIsSatpel) || (value === "Pusat" && !pegawaiIsSatpel);
      }

      /*
       * SATPEL
       */
      if (filter === "satpel") {
        cocokFilter = bidangPegawai === value;
      }

      /*
       * GENERASI
       */
      if (filter === "generasi") {
        cocokFilter = getGenerasi(pegawai) === value;
      }

      /*
       * USIA
       */
      if (filter === "usia") {
        cocokFilter = getKategoriUsia(pegawai) === value;
      }

      /*
       * GENDER
       */
      if (filter === "gender") {
        cocokFilter = getGender(pegawai) === value;
      }

      /*
       * CUTI
       */
      if (filter === "cuti") {
        cocokFilter = getKategoriCuti(pegawai) === value;
      }

      /*
       * PENSIUN
       */
      if (filter === "pensiun") {
        cocokFilter = getKategoriPensiun(pegawai, currentYear) === value;
      }

      /*
       * GOLONGAN PNS
       */
      if (filter === "golongan") {
        cocokFilter = getKategoriGolongan(pegawai) === value;
      }

      /*
       * GOLONGAN PPPK
       */
      if (filter === "golongan-pppk") {
        cocokFilter =
          pegawai.status_kepegawaian === "PPPK" &&
          String(pegawai.pangkat_golongan ?? "")
            .trim()
            .toUpperCase() === String(value).trim().toUpperCase();
      }

      /*
       * PANGKAT
       */
      if (filter === "pangkat") {
        cocokFilter = String(pegawai.pangkat_golongan ?? "").trim() === value;
      }

      /*
       * FUNGSIONAL
       */
      if (filter === "fungsional") {
        const cocokJenjang = getJenjang(pegawai) === value;

        const cocokKategori = !category || getKategoriFungsional(pegawai) === category;

        cocokFilter = cocokJenjang && cocokKategori;
      }

      /*
       * JABATAN
       */
      if (filter === "jabatan") {
        cocokFilter = String(pegawai.jabatan ?? "").trim() === value;
      }

      /*
       * JABATAN + UNIT
       */
      if (filter === "jabatan-unit") {
        const cocokJabatan = String(pegawai.jabatan ?? "").trim() === value;

        let cocokUnit = true;

        if (category === "Satpel") {
          cocokUnit = pegawaiIsSatpel;
        }

        if (category === "Pusat") {
          cocokUnit = !pegawaiIsSatpel;
        }

        cocokFilter = cocokJabatan && cocokUnit;
      }

      /*
       * RISIKO PENSIUN
       */
      if (filter === "pensiun-risk") {
        const sisa = getSisaPensiun(pegawai, currentYear);

        cocokFilter = sisa !== null && sisa >= 0 && sisa <= 2;
      }

      /*
       * CUTI PER BULAN
       */
      if (filter === "cuti-bulan") {
        const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

        const bulanIndex = bulan.indexOf(value);

        if (bulanIndex === -1) {
          cocokFilter = false;
        } else {
          cocokFilter = (pegawai.riwayat_cuti ?? []).some((record) => Number(record.tahun) === currentYear && Number(record.bulan_angka) === bulanIndex + 1);
        }
      }

      if (!cocokFilter) {
        return false;
      }

      /*
       * =====================================================
       * 5. SEARCH LOKAL DI HALAMAN DETAIL
       * =====================================================
       */
      if (!normalizedSearch) {
        return true;
      }

      const nama = normalizeText(pegawai.nama);

      const nip = normalizeText(pegawai.nip);

      const jabatan = normalizeText(pegawai.jabatan);

      const status = normalizeText(pegawai.status_kepegawaian);

      const bidang = normalizeText(pegawai.bidang);

      const pangkat = normalizeText(pegawai.pangkat_golongan);

      const unit = normalizeText(getUnit(pegawai));

      return (
        nama.includes(normalizedSearch) ||
        nip.includes(normalizedSearch) ||
        jabatan.includes(normalizedSearch) ||
        status.includes(normalizedSearch) ||
        bidang.includes(normalizedSearch) ||
        pangkat.includes(normalizedSearch) ||
        unit.includes(normalizedSearch)
      );
    });
  }, [initialData, filter, value, category, baseStatus, baseUnit, baseSearch, searchQuery]);

  /*
  |--------------------------------------------------------------------------
  | SORTING
  |--------------------------------------------------------------------------
  |
  | PENTING:
  |
  | Jangan pernah sort langsung filteredData karena useMemo tersebut
  | menghasilkan array yang menjadi sumber filter.
  |
  | Kita clone menggunakan [...filteredData].
  |
  */

  const sortedData = useMemo(() => {
    return [...filteredData].sort(comparePegawai);
  }, [filteredData]);

  /*
  |--------------------------------------------------------------------------
  | LABEL FILTER AKTIF
  |--------------------------------------------------------------------------
  */

  const activeFilters = useMemo(() => {
    const filters: string[] = [];

    if (baseStatus && baseStatus !== "Semua") {
      filters.push(baseStatus);
    }

    if (baseUnit && baseUnit !== "Semua") {
      filters.push(baseUnit === "Satpel" ? "SATPEL" : "BBPVP Makassar");
    }

    if (baseSearch.trim()) {
      filters.push(`Pencarian: "${baseSearch}"`);
    }

    if (value) {
      filters.push(value);
    }

    if (category) {
      filters.push(category === "Satpel" ? "SATPEL" : category === "Pusat" ? "BBPVP Makassar" : category);
    }

    return filters;
  }, [baseStatus, baseUnit, baseSearch, value, category]);

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6 md:px-24  font-sans">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-up {
          animation: fadeUp 0.4s ease-out forwards;
        }
      `}</style>

      <div className="max-w-[1500px] mx-auto animate-fade-up">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-6 flex flex-col md:flex-row justify-between md:items-end gap-5">
          <div className="flex items-start gap-4">
            <Link href="/" className="mt-1 w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-[#15406A] hover:border-blue-200 shadow-sm transition-all group">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 text-[10px] font-black tracking-widest uppercase mb-2 border border-blue-100">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Drill-Down Data
              </div>

              <h1 className="text-2xl md:text-3xl font-black text-[#15406A] tracking-tight">{getTitle(filter, value, category)}</h1>

              <p className="text-sm text-slate-500 mt-1 font-medium">Menampilkan rincian data pegawai berdasarkan kombinasi filter yang dipilih dari dashboard utama.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 px-6 py-4 shadow-sm flex flex-col items-end min-w-[180px]">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Total Hasil</p>

            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-[#15406A]">{sortedData.length}</span>

              <span className="text-sm font-bold text-slate-400">orang</span>
            </div>
          </div>
        </div>

        {/* =====================================================
            FILTER INFO
        ===================================================== */}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-3 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>

              <span className="text-[11px] uppercase tracking-widest font-black">Filter Aktif:</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeFilters.length > 0 ? (
                activeFilters.map((item, index) => (
                  <span key={`${item}-${index}`} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 shadow-sm">
                    {item}
                  </span>
                ))
              ) : (
                <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">Semua Pegawai</span>
              )}
            </div>
          </div>
        </div>

        {/* =====================================================
            SEARCH
        ===================================================== */}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m2.1-5.4a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
              </svg>

              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari nama, NIP, jabatan, status, unit, atau pangkat..."
                className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                  aria-label="Hapus pencarian"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Hasil</span>

              <span className="px-3 py-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 text-xs font-black">{sortedData.length} pegawai</span>
            </div>
          </div>

          {searchQuery && (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
              <span className="font-medium">Menampilkan hasil pencarian:</span>

              <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-bold">{searchQuery}</span>
            </div>
          )}
        </div>

        {/* =====================================================
            SORT INFO
        ===================================================== */}

        <div className="flex flex-wrap items-center gap-2 mb-3 px-1">
          <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Urutan:</span>

          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-600">1. Jabatan</span>

          <span className="text-slate-300">→</span>

          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-600">2. Pangkat</span>

          <span className="text-slate-300">→</span>

          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-600">3. Status</span>

          <span className="text-slate-300">→</span>

          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-600">4. Nama</span>
        </div>

        {/* =====================================================
            TABLE
        ===================================================== */}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar max-h-[650px]">
            <table className="w-full min-w-[1200px] text-left border-collapse">
              <thead className="bg-slate-50/95 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500 w-16">No</th>

                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">NIP</th>

                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Nama Pegawai</th>

                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>

                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Jabatan</th>

                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Pangkat / Golongan</th>

                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Unit / Satpel</th>

                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Detail Info</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {/*
                 * =================================================
                 * PENTING:
                 *
                 * SEBELUMNYA:
                 *
                 * filteredData.map(...)
                 *
                 * SEKARANG:
                 *
                 * sortedData.map(...)
                 *
                 * Ini yang membuat sorting benar-benar tampil.
                 * =================================================
                 */}

                {sortedData.map((pegawai, index) => {
                  const usia = getUsia(pegawai, currentYear);

                  const sisaCuti = getTotalSisaCuti(pegawai);

                  const sisaPensiun = getSisaPensiun(pegawai, currentYear);

                  const initial = pegawai.nama ? pegawai.nama.charAt(0).toUpperCase() : "?";

                  return (
                    <tr key={pegawai.id} className="hover:bg-slate-50 transition-colors group">
                      {/* NO */}

                      <td className="px-5 py-4 text-xs font-bold text-slate-400">{index + 1}</td>

                      {/* NIP */}

                      <td className="px-5 py-4 text-xs font-mono font-semibold text-slate-500">{pegawai.nip || "-"}</td>

                      {/* NAMA */}

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-50 border border-blue-200 text-[#15406A] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">{initial}</div>

                          <Link href={`data-pegawai/${pegawai.id}`} className="text-sm font-bold text-[#15406A] hover:text-blue-600 hover:underline line-clamp-1">
                            {pegawai.nama || "-"}
                          </Link>
                        </div>
                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold ring-1 ring-inset ${
                            pegawai.status_kepegawaian === "PNS"
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                              : pegawai.status_kepegawaian === "PPPK"
                                ? "bg-blue-50 text-blue-700 ring-blue-600/20"
                                : "bg-amber-50 text-amber-700 ring-amber-600/20"
                          }`}
                        >
                          {pegawai.status_kepegawaian || "-"}
                        </span>
                      </td>

                      {/* JABATAN */}

                      <td className="px-5 py-4">
                        <span className="text-xs font-medium text-slate-600 line-clamp-2 leading-relaxed">{pegawai.jabatan || "-"}</span>
                      </td>

                      {/* PANGKAT */}

                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-black text-slate-700">{pegawai.pangkat_golongan || "-"}</span>

                          {pegawai.status_kepegawaian === "PNS" && pegawai.pangkat_golongan && <span className="text-[9px] text-slate-400">Golongan PNS</span>}

                          {pegawai.status_kepegawaian === "PPPK" && pegawai.pangkat_golongan && <span className="text-[9px] text-slate-400">Golongan PPPK</span>}
                        </div>
                      </td>

                      {/* UNIT */}

                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-slate-700">{isSatpel(pegawai) ? "SATPEL" : "BBPVP Makassar"}</span>

                          <span className="text-[10px] font-medium text-slate-400 line-clamp-1">{pegawai.bidang || "-"}</span>
                        </div>
                      </td>

                      {/* DETAIL */}

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {(filter === "usia" || filter === "generasi") && usia !== null && (
                            <span className="inline-flex px-2 py-1 rounded-md bg-teal-50 text-teal-700 text-[10px] font-bold ring-1 ring-inset ring-teal-600/20">{usia} tahun</span>
                          )}

                          {filter === "generasi" && <span className="inline-flex px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold ring-1 ring-inset ring-indigo-600/20">{getGenerasi(pegawai)}</span>}

                          {(filter === "cuti" || filter === "cuti-bulan") && <span className="inline-flex px-2 py-1 rounded-md bg-sky-50 text-sky-700 text-[10px] font-bold ring-1 ring-inset ring-sky-600/20">Sisa {sisaCuti} hari</span>}

                          {filter === "pensiun" && sisaPensiun !== null && (
                            <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold ring-1 ring-inset ${sisaPensiun <= 0 ? "bg-red-50 text-red-700 ring-red-600/20" : "bg-orange-50 text-orange-700 ring-orange-600/20"}`}>
                              {sisaPensiun <= 0 ? "Tahun Ini" : `${sisaPensiun} tahun lagi`}
                            </span>
                          )}

                          {filter === "gender" && (
                            <span className="inline-flex px-2 py-1 rounded-md bg-pink-50 text-pink-700 text-[10px] font-bold ring-1 ring-inset ring-pink-600/20">{getGender(pegawai) === "L" ? "Laki-Laki" : "Perempuan"}</span>
                          )}

                          {filter === "fungsional" && (
                            <>
                              <span className="inline-flex px-2 py-1 rounded-md bg-violet-50 text-violet-700 text-[10px] font-bold ring-1 ring-inset ring-violet-600/20">{getJenjang(pegawai) || "-"}</span>

                              <span className="inline-flex px-2 py-1 rounded-md bg-slate-50 text-slate-600 text-[10px] font-bold ring-1 ring-inset ring-slate-500/10">{getKategoriFungsional(pegawai) || "-"}</span>
                            </>
                          )}

                          {(filter === "golongan" || filter === "golongan-pppk") && (
                            <span className="inline-flex px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold ring-1 ring-inset ring-emerald-600/20">{pegawai.pangkat_golongan || "-"}</span>
                          )}

                          {filter === "jabatan" && <span className="inline-flex px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold ring-1 ring-inset ring-amber-600/20">{pegawai.jabatan || "-"}</span>}

                          {filter === "cuti-bulan" && (
                            <span className="inline-flex px-2 py-1 rounded-md bg-sky-50 text-sky-700 text-[10px] font-bold ring-1 ring-inset ring-sky-600/20">{getTotalCutiTerpakai(pegawai, currentYear)} hari tahun ini</span>
                          )}

                          {!filter && <span className="text-xs text-slate-300 font-medium">-</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* =================================================
                    EMPTY STATE
                ================================================= */}

                {sortedData.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-20 bg-slate-50/30">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mb-4">
                          <span className="text-3xl">🔍</span>
                        </div>

                        <h3 className="text-sm font-black text-slate-700 mb-1">Tidak ada pegawai ditemukan</h3>

                        <p className="text-xs text-slate-500 font-medium max-w-md">Tidak terdapat data pegawai yang sesuai dengan kombinasi filter yang sedang aktif.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* =====================================================
            FOOTER
        ===================================================== */}

        <div className="mt-6 flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center px-2">
          <p className="text-[11px] font-bold text-slate-400">
            Menampilkan <span className="text-slate-700">{sortedData.length}</span> dari <span className="text-slate-700">{initialData.length}</span> data pegawai
          </p>

          <Link href="/" className="px-5 py-2.5 rounded-xl bg-[#15406A] text-white text-xs font-bold hover:bg-[#0f2d4a] hover:shadow-lg hover:shadow-blue-900/20 transition-all focus:ring-4 focus:ring-blue-900/10">
            Kembali ke Dashboard Utama
          </Link>
        </div>
      </div>
    </main>
  );
}
