"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Pegawai, LeaveRecord } from "./types";

type Props = {
  dataPegawai: Pegawai[];
};

const SATPEL_DAERAH = ["SATPEL Mamuju", "SATPEL Majene", "SATPEL Palu"];

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const JENJANG = ["Ahli Utama", "Ahli Madya", "Ahli Muda", "Ahli Pertama", "Mahir", "Terampil"];

const KATEGORI = [
  { key: "Instruktur", label: "Instruktur" },
  { key: "SDM", label: "Analis SDM" },
  { key: "PengantarKerja", label: "Pengantar Kerja" },
  { key: "Perencana", label: "Perencana" },
  { key: "Arsiparis", label: "Arsiparis" },
  { key: "Prakom", label: "Pranata Komputer" },
  { key: "Keuangan", label: "Keuangan APBN" },
  { key: "Barang", label: "Penata Laksana Barang" },
];

const PELAKSANA = [
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

export default function DashboardClient({ dataPegawai }: Props) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const [statusFilter, setStatusFilter] = useState("Semua");
  const [unitFilter, setUnitFilter] = useState("Semua");
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const [showAllLeave, setShowAllLeave] = useState(false);
  const [showAllRetirement, setShowAllRetirement] = useState(false);
  const [expandedMatrix, setExpandedMatrix] = useState(false);
  const [filterBidang, setFilterBidang] = useState("");
  const [filterJabatan, setFilterJabatan] = useState("");
  const [filterPangkat, setFilterPangkat] = useState("");

  const openDetail = (filter: string, value: string, category?: string) => {
    const params = new URLSearchParams();

    // Filter drill-down yang diklik
    params.set("filter", filter);
    params.set("value", value);

    if (category) {
      params.set("category", category);
    }

    // =====================================================
    // WARISKAN FILTER DARI DASHBOARD UTAMA
    // =====================================================

    if (statusFilter !== "Semua") {
      params.set("baseStatus", statusFilter);
    }

    if (unitFilter !== "Semua") {
      params.set("baseUnit", unitFilter);
    }

    if (search.trim()) {
      params.set("baseSearch", search.trim());
    }

    router.push(`dashboard-detail?${params.toString()}`);
  };
  const openDataPegawai = (filter: string) => {
    const params = new URLSearchParams();

    // Filter drill-down yang diklik
    params.set("filter", filter);

    router.push(`data-pegawai`);
  };
  /*
  |--------------------------------------------------------------------------
  | FILTER DATA
  |--------------------------------------------------------------------------
  */

  const filteredData = useMemo(() => {
    return dataPegawai.filter((p) => {
      const statusMatch = statusFilter === "Semua" || p.status_kepegawaian === statusFilter;

      const isSatpel = SATPEL_DAERAH.includes(p.bidang);

      const unitMatch = unitFilter === "Semua" || (unitFilter === "Satpel" && isSatpel) || (unitFilter === "Pusat" && !isSatpel);

      const searchMatch = !search || p.nama?.toLowerCase().includes(search.toLowerCase()) || p.nip?.includes(search) || p.jabatan?.toLowerCase().includes(search.toLowerCase()) || p.bidang?.toLowerCase().includes(search.toLowerCase());

      return statusMatch && unitMatch && searchMatch;
    });
  }, [dataPegawai, statusFilter, unitFilter, search]);

  /*
  |--------------------------------------------------------------------------
  | STATISTIK UTAMA
  |--------------------------------------------------------------------------
  */

  const totalPegawai = filteredData.length;

  const totalPNS = filteredData.filter((p) => p.status_kepegawaian === "PNS").length;

  const totalPPPK = filteredData.filter((p) => p.status_kepegawaian === "PPPK").length;

  const totalNonASN = filteredData.filter((p) => p.status_kepegawaian === "Non ASN").length;

  const totalASN = totalPNS + totalPPPK;

  const persen = (value: number) => (totalPegawai > 0 ? Math.round((value / totalPegawai) * 100) : 0);

  /*
  |--------------------------------------------------------------------------
  | UNIT KERJA
  |--------------------------------------------------------------------------
  */

  const totalPusat = filteredData.filter((p) => !SATPEL_DAERAH.includes(p.bidang)).length;

  const totalSatpel = filteredData.filter((p) => SATPEL_DAERAH.includes(p.bidang)).length;

  const satpelStats = SATPEL_DAERAH.map((nama) => ({
    nama,
    total: filteredData.filter((p) => p.bidang === nama).length,
  }));

  /*
  |--------------------------------------------------------------------------
  | GENDER
  |--------------------------------------------------------------------------
  */

  const gender = {
    laki: 0,
    perempuan: 0,
  };

  /*
  |--------------------------------------------------------------------------
  | USIA & GENERASI
  |--------------------------------------------------------------------------
  */

  const usia = {
    "Di bawah 30": 0,
    "30–40": 0,
    "41–50": 0,
    "Di atas 50": 0,
  };

  const generasi = {
    "Baby Boomer": 0,
    "Gen X": 0,
    Milenial: 0,
    "Gen Z": 0,
  };

  /*
  |--------------------------------------------------------------------------
  | PENSIUN
  |--------------------------------------------------------------------------
  */

  const pensiun = {
    "Tahun Ini": 0,
    "1–2 Tahun": 0,
    "3–5 Tahun": 0,
    "> 5 Tahun": 0,
  };

  const pensiunWatchlist: {
    id: number;
    nama: string;
    jabatan: string;
    sisaTahun: number;
  }[] = [];

  /*
  |--------------------------------------------------------------------------
  | CUTI
  |--------------------------------------------------------------------------
  */

  const cuti = {
    kritis: 0,
    menipis: 0,
    aman: 0,
    berlebih: 0,
  };

  let totalSisaCuti = 0;

  const cutiWatchlist: {
    id: number;
    nama: string;
    jabatan: string;
    total: number;
  }[] = [];

  /*
  |--------------------------------------------------------------------------
  | MASA KERJA
  |--------------------------------------------------------------------------
  */

  const masaKerja = {
    baru: 0,
    berkembang: 0,
    senior: 0,
    veteran: 0,
  };

  /*
  |--------------------------------------------------------------------------
  | GOLONGAN
  |--------------------------------------------------------------------------
  */

  const golonganPNS = {
    "Gol I": 0,
    "Gol II": 0,
    "Gol III": 0,
    "Gol IV": 0,
  };
  const golonganPPPK = {
    I: 0,
    IV: 0,
    V: 0,
    VI: 0,
    VII: 0,
    IX: 0,
    X: 0,
    XI: 0,
  };

  /*
  |--------------------------------------------------------------------------
  | PENDIDIKAN
  |--------------------------------------------------------------------------
  */

  const pendidikan = {
    S3: 0,
    S2: 0,
    "S1 / D4": 0,
    D3: 0,
    "D1 / SMA / Umum": 0,
  };

  filteredData.forEach((p) => {
    /*
     * GENDER + MASA KERJA
     */

    const nip = p.nip ? String(p.nip).replace(/\D/g, "") : "";

    if ((p.status_kepegawaian === "PNS" || p.status_kepegawaian === "PPPK") && nip.length >= 15) {
      const genderCode = nip.charAt(14);

      if (genderCode === "1") {
        gender.laki++;
      }

      if (genderCode === "2") {
        gender.perempuan++;
      }

      const tahunMasuk = Number(nip.substring(8, 12));

      if (tahunMasuk > 1900) {
        const mk = currentYear - tahunMasuk;

        if (mk < 5) masaKerja.baru++;
        else if (mk <= 10) masaKerja.berkembang++;
        else if (mk <= 20) masaKerja.senior++;
        else masaKerja.veteran++;
      }
    }

    /*
     * USIA
     */

    if (p.tanggal_lahir) {
      const tahunLahir = new Date(p.tanggal_lahir).getFullYear();

      const umur = currentYear - tahunLahir;

      if (umur < 30) usia["Di bawah 30"]++;
      else if (umur <= 40) usia["30–40"]++;
      else if (umur <= 50) usia["41–50"]++;
      else usia["Di atas 50"]++;

      /*
       * GENERASI
       */

      if (tahunLahir <= 1964) {
        generasi["Baby Boomer"]++;
      } else if (tahunLahir <= 1980) {
        generasi["Gen X"]++;
      } else if (tahunLahir <= 1996) {
        generasi["Milenial"]++;
      } else {
        generasi["Gen Z"]++;
      }

      /*
       * PENSIUN
       */

      if (p.status_kepegawaian !== "Non ASN") {
        let batasUsia = 58;

        if (p.jabatan?.includes("Utama")) {
          batasUsia = 65;
        } else if (p.jabatan?.includes("Madya") || p.jabatan === "Kepala BBPVP Makassar") {
          batasUsia = 60;
        }

        const tahunPensiun = tahunLahir + batasUsia;

        const sisaTahun = tahunPensiun - currentYear;

        if (sisaTahun <= 0) {
          pensiun["Tahun Ini"]++;
        } else if (sisaTahun <= 2) {
          pensiun["1–2 Tahun"]++;
        } else if (sisaTahun <= 5) {
          pensiun["3–5 Tahun"]++;
        } else {
          pensiun["> 5 Tahun"]++;
        }

        if (sisaTahun >= 0 && sisaTahun <= 2) {
          pensiunWatchlist.push({
            id: p.id,
            nama: p.nama,
            jabatan: p.jabatan,
            sisaTahun,
          });
        }
      }
    }

    /*
     * GOLONGAN
     */

    const pangkat = p.pangkat_golongan || "ts";

    if (pangkat.startsWith("I/")) {
      golonganPNS["Gol I"]++;
    } else if (pangkat.startsWith("II/")) {
      golonganPNS["Gol II"]++;
    } else if (pangkat.startsWith("III/")) {
      golonganPNS["Gol III"]++;
    } else {
      golonganPNS["Gol IV"]++;
    }

    // Pastikan nilai pangkat disamakan formatnya (misal: huruf kapital semua)
    const pangkatBersih = pangkat.trim().toUpperCase();

    switch (pangkatBersih) {
      case "I":
        golonganPPPK["I"]++;
        break;
      case "IV":
        golonganPPPK["IV"]++;
        break;
      case "V":
        golonganPPPK["V"]++;
        break;
      case "VI":
        golonganPPPK["VI"]++;
        break;
      case "VII":
        golonganPPPK["VII"]++;
        break;
      case "IX":
        golonganPPPK["IX"]++;
        break;
      case "X":
        golonganPPPK["X"]++;
        break;
      case "XI":
        golonganPPPK["XI"]++;
        break;
      default:
        // Opsional: Tangani jika input tidak sesuai dengan daftar di atas
        break;
    }

    /*
     * PENDIDIKAN
     */

    const nama = (p.nama || "").toUpperCase();

    if (nama.includes("DR. ") || nama.startsWith("DR.") || nama.includes("PH.D")) {
      pendidikan.S3++;
    } else if (nama.includes(", M.") || nama.includes(",M.")) {
      pendidikan.S2++;
    } else if (nama.includes(", S.") || nama.includes(",S.") || nama.includes("S.ST") || nama.includes("S.TR")) {
      pendidikan["S1 / D4"]++;
    } else if (nama.includes("A.MD") || nama.includes("A.MA")) {
      pendidikan["D3"]++;
    } else {
      pendidikan["D1 / SMA / Umum"]++;
    }

    /*
     * CUTI
     */

    const sisaLalu = Number(p.sisa_cuti_tahun_lalu) || 0;

    const sisaTahunIni = Number(p.cuti_tahun_ini) || 0;

    const total = sisaLalu + sisaTahunIni;

    totalSisaCuti += total;

    if (total <= 3) {
      cuti.kritis++;
    } else if (total <= 6) {
      cuti.menipis++;
    } else if (total <= 12) {
      cuti.aman++;
    } else {
      cuti.berlebih++;

      cutiWatchlist.push({
        id: p.id,
        nama: p.nama,
        jabatan: p.jabatan,
        total,
      });
    }
  });

  pensiunWatchlist.sort((a, b) => a.sisaTahun - b.sisaTahun);

  cutiWatchlist.sort((a, b) => b.total - a.total);

  const rataCuti = totalPegawai > 0 ? Math.round(totalSisaCuti / totalPegawai) : 0;

  /*
  |--------------------------------------------------------------------------
  | RIWAYAT CUTI BULANAN
  |--------------------------------------------------------------------------
  */

  const monthlyLeave = BULAN.map((_, index) => {
    return filteredData.reduce((total, pegawai) => {
      const records = pegawai.riwayat_cuti || [];

      return total + records.filter((r) => r.tahun === currentYear && r.bulan_angka === index + 1).reduce((sum, r) => sum + Number(r.durasi || 0), 0);
    }, 0);
  });

  const maxMonthlyLeave = Math.max(...monthlyLeave, 1);

  /*
  |--------------------------------------------------------------------------
  | TOTAL CUTI YANG TELAH DIGUNAKAN
  |--------------------------------------------------------------------------
  */

  const totalCutiTerpakai = filteredData.reduce((total, pegawai) => {
    return total + (pegawai.riwayat_cuti || []).filter((r) => r.tahun === currentYear).reduce((sum, r) => sum + Number(r.durasi || 0), 0);
  }, 0);

  /*
  |--------------------------------------------------------------------------
  | HEALTH SCORE
  |--------------------------------------------------------------------------
  */

  const retirementRisk = pensiun["Tahun Ini"] + pensiun["1–2 Tahun"];

  const criticalLeave = cuti.kritis;

  let healthScore = 100;

  if (totalPegawai > 0) {
    healthScore -= Math.round((retirementRisk / totalPegawai) * 25);

    healthScore -= Math.round((criticalLeave / totalPegawai) * 20);

    healthScore = Math.max(0, Math.min(100, healthScore));
  }

  const healthLabel = healthScore >= 85 ? "Sangat Baik" : healthScore >= 70 ? "Baik" : healthScore >= 50 ? "Perlu Perhatian" : "Kritis";

  /*
  |--------------------------------------------------------------------------
  | MATRIX JABATAN
  |--------------------------------------------------------------------------
  */

  const matrixStats: Record<string, Record<string, number>> = {};

  JENJANG.forEach((j) => {
    matrixStats[j] = {};

    KATEGORI.forEach((k) => {
      matrixStats[j][k.key] = 0;
    });

    matrixStats[j].Total = 0;
  });

  const matrixTotals: Record<string, number> = {};

  KATEGORI.forEach((k) => {
    matrixTotals[k.key] = 0;
  });

  matrixTotals.Total = 0;

  filteredData.forEach((p) => {
    if (p.status_kepegawaian === "Non ASN") {
      return;
    }

    const jabatan = p.jabatan || "";

    let jenjang: string | null = null;

    for (const j of JENJANG) {
      if (jabatan.includes(j)) {
        jenjang = j;
        break;
      }
    }

    if (!jenjang) return;

    let kategori: string | null = null;

    if (jabatan.includes("Instruktur")) kategori = "Instruktur";
    else if (jabatan.includes("Sumber Daya Manusia Aparatur")) kategori = "SDM";
    else if (jabatan.includes("Pengantar Kerja")) kategori = "PengantarKerja";
    else if (jabatan.includes("Perencana")) kategori = "Perencana";
    else if (jabatan.includes("Arsiparis")) kategori = "Arsiparis";
    else if (jabatan.includes("Pranata Komputer")) kategori = "Prakom";
    else if (jabatan.includes("Keuangan APBN")) kategori = "Keuangan";
    else if (jabatan.includes("Penata Laksana Barang")) kategori = "Barang";

    if (!kategori) return;

    matrixStats[jenjang][kategori]++;
    matrixStats[jenjang].Total++;

    matrixTotals[kategori]++;
    matrixTotals.Total++;
  });

  /*
  |--------------------------------------------------------------------------
  | PELAKSANA
  |--------------------------------------------------------------------------
  */

  const pelaksanaStats: Record<
    string,
    {
      pusat: number;
      satpel: number;
      total: number;
    }
  > = {};

  PELAKSANA.forEach((jabatan) => {
    pelaksanaStats[jabatan] = {
      pusat: 0,
      satpel: 0,
      total: 0,
    };
  });

  filteredData.forEach((p) => {
    if (p.status_kepegawaian !== "PNS") return;

    const jabatan = p.jabatan || "";

    if (!PELAKSANA.includes(jabatan)) return;

    if (SATPEL_DAERAH.includes(p.bidang)) {
      pelaksanaStats[jabatan].satpel++;
    } else {
      pelaksanaStats[jabatan].pusat++;
    }

    pelaksanaStats[jabatan].total++;
  });

  const filteredPegawai = useMemo(() => {
    return dataPegawai.filter((pegawai) => {
      const cocokBidang = !filterBidang || pegawai.bidang === filterBidang;

      const cocokJabatan = !filterJabatan || pegawai.jabatan === filterJabatan;

      const cocokPangkat = !filterPangkat || pegawai.pangkat_golongan === filterPangkat;

      return cocokBidang && cocokJabatan && cocokPangkat;
    });
  }, [dataPegawai, filterBidang, filterJabatan, filterPangkat]);

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-800 overflow-x-hidden">
      {/* =====================================================
          GLOBAL STYLE
      ===================================================== */}

      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(25px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes pulseGlow {
          0%,
          100% {
            box-shadow: 0 0 0 rgba(59, 130, 246, 0);
          }
          50% {
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.15);
          }
        }

        @keyframes growWidth {
          from {
            width: 0;
          }
        }

        @keyframes growHeight {
          from {
            transform: scaleY(0);
          }
          to {
            transform: scaleY(1);
          }
        }

        .dashboard-card {
          animation: fadeUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .floating {
          animation: float 5s ease-in-out infinite;
        }

        .glow {
          animation: pulseGlow 3s ease-in-out infinite;
        }

        .bar-grow {
          animation: growWidth 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .column-grow {
          transform-origin: bottom;
          animation: growHeight 1s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .hide-scrollbar {
          scrollbar-width: none;
        }
      `}</style>

      {/* =====================================================
          BACKGROUND DECORATION
      ===================================================== */}

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-blue-300/10 rounded-full blur-3xl" />
        <div className="absolute top-[35%] -left-40 w-[400px] h-[400px] bg-indigo-300/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-[20%] w-[350px] h-[350px] bg-emerald-300/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-[1600px] mx-auto px-4 md:px-6 lg:px-24 py-6 lg:py-8">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <section className="dashboard-card mb-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0f3557] via-[#15406A] to-[#1d5d91] p-6 md:p-8 lg:p-10 text-white shadow-2xl">
            <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-blue-300/10 translate-y-1/2" />

            <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur mb-4">
                  <span className="text-[10px] font-black uppercase tracking-[.2em]">Balai Besar Pelatihan Produktivitas dan Vokasi Makassar</span>
                </div>

                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight">Dashboard SDM</h1>

                <p className="mt-2 text-blue-100 max-w-2xl text-sm md:text-base">Pusat analitik dan monitoring sumber daya manusia secara real-time.</p>
                <Link href="/login" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur mt-4">
                  <span className="text-[10px] font-black uppercase tracking-[.2em]">➡️ Masuk sebagai Administrator</span>
                </Link>
              </div>

              {/* HEALTH SCORE */}

              <div className="floating flex items-center gap-5 bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl px-5 py-4 self-start">
                <div className="relative w-20 h-20">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      background: `conic-gradient(#34d399 0% ${healthScore}%, rgba(255,255,255,.12) ${healthScore}% 100%)`,
                    }}
                  >
                    <div className="w-14 h-14 rounded-full bg-[#15406A] flex items-center justify-center">
                      <span className="text-xl font-black">{healthScore}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-widest text-blue-200 font-bold">HR Health Score</p>

                  <p className="text-xl font-black mt-1">{healthLabel}</p>

                  <p className="text-[10px] text-blue-200 mt-1">Berdasarkan indikator SDM</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            FILTER BAR
        ===================================================== */}

        <section className="dashboard-card bg-white rounded-3xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between">
            <div className="flex gap-2 flex-wrap">
              {["Semua", "PNS", "PPPK", "Non ASN"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${statusFilter === status ? "bg-[#15406A] text-white shadow-lg shadow-blue-900/20" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setUnitFilter("Semua")} className={`px-4 py-2 rounded-xl text-xs font-bold ${unitFilter === "Semua" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                Semua Unit
              </button>

              <button onClick={() => setUnitFilter("Pusat")} className={`px-4 py-2 rounded-xl text-xs font-bold ${unitFilter === "Pusat" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                BBPVP Makassar
              </button>

              <button onClick={() => setUnitFilter("Satpel")} className={`px-4 py-2 rounded-xl text-xs font-bold ${unitFilter === "Satpel" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                SATPEL
              </button>
            </div>

            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari pegawai, NIP, jabatan..."
                className="w-full lg:w-72 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            KPI CARDS
        ===================================================== */}

        <section className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
          <KpiCard title="Total Pegawai" value={totalPegawai} subtitle="Pegawai terdata" icon="👥" gradient="from-[#15406A] to-[#2876ad]" onClick={() => openDataPegawai("")} />

          <KpiCard title="PNS" value={totalPNS} subtitle={`${persen(totalPNS)}% dari total`} icon="🛡️" gradient="from-emerald-500 to-teal-600" onClick={() => openDetail("status", "PNS")} />

          <KpiCard title="PPPK" value={totalPPPK} subtitle={`${persen(totalPPPK)}% dari total`} icon="📋" gradient="from-blue-500 to-indigo-600" onClick={() => openDetail("status", "PPPK")} />

          <KpiCard title="Non ASN" value={totalNonASN} subtitle={`${persen(totalNonASN)}% dari total`} icon="👤" gradient="from-amber-400 to-orange-500" onClick={() => openDetail("status", "Non ASN")} />

          <KpiCard title="ASN" value={totalASN} subtitle={`${persen(totalASN)}% dari total`} icon="🏛️" gradient="from-violet-500 to-purple-600" onClick={() => openDetail("status", "ASN")} />
        </section>

        {/* =====================================================
            QUICK INSIGHT
        ===================================================== */}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <InsightCard type="danger" title="Perhatian Pensiun" value={`${retirementRisk} pegawai`} description="Memasuki masa pensiun tahun ini atau maksimal 2 tahun lagi." onClick={() => openDetail("pensiun-risk", "0–2 Tahun")} />
          <InsightCard type="warning" title="Cuti Kritis" value={`${criticalLeave} pegawai`} description="Memiliki sisa cuti maksimal 3 hari." onClick={() => openDetail("cuti", "Kritis")} />
          <InsightCard type="success" title="Cuti Terpakai" value={`${totalCutiTerpakai} hari`} description={`Total penggunaan cuti selama tahun ${currentYear}.`} />
        </section>

        {/* =====================================================
            UNIT + GENERATION
        ===================================================== */}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* UNIT */}

          <div className="dashboard-card bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <SectionTitle color="blue" title="Sebaran Unit Kerja" subtitle="Distribusi pegawai berdasarkan lokasi kerja." />

            <div className="space-y-5 mt-6">
              <ProgressRow label="BBPVP Makassar" value={totalPusat} total={totalPegawai} color="bg-blue-600" onClick={() => openDetail("unit", "Pusat")} />

              <ProgressRow label="Satpel Daerah" value={totalSatpel} total={totalPegawai} color="bg-orange-500" onClick={() => openDetail("unit", "Satpel")} />
            </div>

            <div className="grid grid-cols-3 gap-2 mt-6">
              {satpelStats.map((item) => (
                <button key={item.nama} type="button" onClick={() => openDetail("satpel", item.nama)} className="rounded-2xl bg-slate-50 p-3 text-center hover:bg-orange-50 hover:-translate-y-1 transition cursor-pointer">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{item.nama.replace("SATPEL ", "")}</p>

                  <p className="text-xl font-black text-slate-800 mt-1">{item.total}</p>

                  <p className="text-[8px] text-slate-400 mt-1">Lihat detail →</p>
                </button>
              ))}
            </div>
          </div>

          {/* GENERASI */}

          <div className="lg:col-span-2 dashboard-card bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <SectionTitle color="indigo" title="Peta Generasi Pegawai" subtitle="Komposisi generasi berdasarkan tahun kelahiran." />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              {Object.entries(generasi).map(([label, value]) => (
                <button key={label} type="button" onClick={() => openDetail("generasi", label)} className="group rounded-2xl p-4 bg-slate-50 hover:bg-indigo-50 transition-all text-left cursor-pointer hover:-translate-y-1">
                  <p className="text-xs font-bold text-slate-500">{label}</p>

                  <p className="text-3xl font-black text-slate-800 mt-2 group-hover:scale-105 origin-left transition">{value}</p>

                  <p className="text-[10px] text-slate-400 mt-1">{persen(value)}% populasi</p>

                  <p className="text-[9px] text-indigo-500 font-bold mt-2">Lihat pegawai →</p>
                </button>
              ))}
            </div>

            <div className="mt-6 h-8 rounded-full overflow-hidden flex bg-slate-100">
              {Object.entries(generasi).map(([label, value], index) => {
                const colors = ["bg-slate-700", "bg-blue-500", "bg-emerald-500", "bg-amber-400"];

                return (
                  <div
                    key={label}
                    title={`${label}: ${value} orang`}
                    className={`${colors[index]} bar-grow h-full`}
                    style={{
                      width: `${totalPegawai ? (value / totalPegawai) * 100 : 0}%`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </section>

        {/* =====================================================
            CUTI ANALYTICS
        ===================================================== */}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex justify-between items-start">
              <SectionTitle color="sky" title="Analitik Cuti" subtitle="Monitoring hak cuti dan penggunaan cuti." />

              <div className="text-right">
                <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Rata-rata sisa</p>

                <p className="text-2xl font-black text-sky-600">
                  {rataCuti}
                  <span className="text-xs ml-1">hari</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <LeaveBox label="Kritis" value={cuti.kritis} color="red" onClick={() => openDetail("cuti", "Kritis")} />

              <LeaveBox label="Menipis" value={cuti.menipis} color="orange" onClick={() => openDetail("cuti", "Menipis")} />

              <LeaveBox label="Aman" value={cuti.aman} color="emerald" onClick={() => openDetail("cuti", "Aman")} />

              <LeaveBox label="Berlebih" value={cuti.berlebih} color="sky" onClick={() => openDetail("cuti", "Berlebih")} />
            </div>

            {/* MONTHLY USAGE */}

            <div className="mt-20">
              <div className="flex justify-between mb-4">
                <div>
                  <p className="font-black text-lg">Tren Penggunaan Cuti</p>

                  <p className="text-[10px] text-slate-400">Total durasi cuti per bulan tahun {currentYear}.</p>
                </div>

                <span className="text-xs font-black text-sky-600">{totalCutiTerpakai} hari</span>
              </div>

              <div className="flex items-end gap-2 h-44">
                {monthlyLeave.map((value, index) => {
                  const height = maxMonthlyLeave > 0 ? (value / maxMonthlyLeave) * 100 : 0;

                  return (
                    <div key={index} className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer" onClick={() => openDetail("cuti-bulan", BULAN[index])}>
                      {/* AREA BATANG */}
                      <div className="relative w-full h-full flex items-end justify-center">
                        {/* TOOLTIP */}
                        {value > 0 && <span className="absolute bottom-full mb-2 text-[9px] font-black text-slate-700 opacity-0 group-hover:opacity-100 transition">{value}</span>}

                        {/* BATANG */}
                        <div
                          className="column-grow w-full max-w-8 bg-sky-500 rounded-t-lg group-hover:bg-[#15406A] transition-colors"
                          style={{
                            height: `${value > 0 ? Math.max(height, 4) : 0}%`,
                          }}
                        />
                      </div>

                      {/* LABEL BULAN */}
                      <span className="text-[8px] md:text-[9px] text-slate-400 mt-2">{BULAN[index]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CUTI WATCHLIST */}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex justify-between items-start">
              <SectionTitle color="amber" title="Cuti Perlu Dipantau" subtitle="Sisa cuti lebih dari 12 hari." />

              <span className="bg-sky-100 text-sky-700 px-2 py-1 rounded-lg text-[10px] font-black">{cutiWatchlist.length}</span>
            </div>

            <div className="space-y-2 mt-5 max-h-[390px] overflow-y-auto">
              {(showAllLeave ? cutiWatchlist : cutiWatchlist.slice(0, 6)).map((item, index) => (
                <div key={`${item.nama}-${index}`} className="group p-3 rounded-2xl bg-sky-50/70 border border-sky-100 hover:bg-sky-100 transition">
                  <div className="flex justify-between gap-3">
                    <Link href={`data-pegawai/${item.id}`}>
                      <p className="text-xs font-black truncate">{item.nama}</p>

                      <p className="text-[9px] text-slate-500 truncate mt-1">{item.jabatan}</p>
                    </Link>

                    <span className="shrink-0 self-center bg-sky-600 text-white px-2 py-1 rounded-lg text-[9px] font-black">{item.total} hari</span>
                  </div>
                </div>
              ))}
            </div>

            {cutiWatchlist.length > 6 && (
              <button onClick={() => setShowAllLeave(!showAllLeave)} className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold">
                {showAllLeave ? "Tampilkan Lebih Sedikit" : "Lihat Semua"}
              </button>
            )}
          </div>
        </section>

        {/* =====================================================
            AGE + GENDER + RETIREMENT
        ===================================================== */}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* AGE */}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <SectionTitle color="teal" title="Piramida Usia" subtitle="Distribusi usia pegawai." />

            <div className="space-y-4 mt-6">
              {Object.entries(usia).map(([label, value]) => (
                <ProgressRow key={label} label={label} value={value} total={totalPegawai} color="bg-teal-500" onClick={() => openDetail("usia", label)} />
              ))}
            </div>
          </div>

          {/* GENDER */}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <SectionTitle color="pink" title="Komposisi Gender" subtitle="Berdasarkan digit NIP ASN." />

            <div className="flex gap-4 mt-8">
              <GenderCard label="Laki-Laki" value={gender.laki} percentage={totalASN ? Math.round((gender.laki / totalASN) * 100) : 0} icon="♂" color="blue" onClick={() => openDetail("gender", "L")} />

              <GenderCard label="Perempuan" value={gender.perempuan} percentage={totalASN ? Math.round((gender.perempuan / totalASN) * 100) : 0} icon="♀" color="pink" onClick={() => openDetail("gender", "P")} />
            </div>
          </div>

          {/* RETIREMENT */}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <SectionTitle color="red" title="Proyeksi Pensiun" subtitle="Peta kebutuhan regenerasi." />

            <div className="space-y-4 mt-6">
              {Object.entries(pensiun).map(([label, value]) => (
                <ProgressRow
                  key={label}
                  label={label}
                  value={value}
                  total={Math.max(...Object.values(pensiun), 1)}
                  color={label === "Tahun Ini" ? "bg-red-500" : label === "1–2 Tahun" ? "bg-orange-500" : "bg-slate-400"}
                  onClick={() => openDetail("pensiun", label)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            RETIREMENT WATCHLIST
        ===================================================== */}

        <section className="bg-white rounded-3xl border border-red-100 shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <SectionTitle color="red" title="Watchlist Pensiun" subtitle="Pegawai yang perlu dipersiapkan untuk regenerasi." />

            <span className="px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-xs font-black">{pensiunWatchlist.length} Pegawai</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
            {(showAllRetirement ? pensiunWatchlist : pensiunWatchlist.slice(0, 6)).map((item, index) => (
              <div key={`${item.nama}-${index}`} className="group rounded-2xl border border-red-100 bg-red-50/50 p-4 hover:bg-red-50 hover:-translate-y-1 transition-all">
                <div className="flex justify-between gap-3">
                  <Link href={`data-pegawai/${item.id}`} className="transition-colors group cursor-pointer border border-transparent ">
                    <p className="font-black text-sm truncate">{item.nama}</p>

                    <p className="text-[10px] text-slate-500 truncate mt-1">{item.jabatan}</p>
                  </Link>

                  <div className={`shrink-0 rounded-xl px-2 py-1.5 text-center ${item.sisaTahun === 0 ? "bg-red-600 text-white" : "bg-orange-500 text-white"}`}>
                    <p className="text-[9px] font-bold">PENSIUN</p>

                    <p className="font-black">{item.sisaTahun === 0 ? "TAHUN INI" : `${item.sisaTahun} THN`}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pensiunWatchlist.length > 6 && (
            <button onClick={() => setShowAllRetirement(!showAllRetirement)} className="mt-5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold">
              {showAllRetirement ? "Tampilkan Lebih Sedikit" : "Lihat Semua Watchlist"}
            </button>
          )}
        </section>

        {/* =====================================================
            GOLONGAN + PENDIDIKAN
        ===================================================== */}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* GOLONGAN */}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <SectionTitle color="emerald" title="Demografi Kepangkatan PNS" subtitle="Distribusi ASN berdasarkan golongan." />

            <div className="flex items-end gap-4 md:gap-8 h-64 mt-8 border-b border-slate-200">
              {Object.entries(golonganPNS).map(([label, value]) => {
                const max = Math.max(...Object.values(golonganPNS), 1);
                const height = (value / max) * 100;

                return (
                  <div key={label} className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer" onClick={() => openDetail("golongan", label)}>
                    {/* AREA BATANG */}
                    <div className="relative w-full h-full flex items-end justify-center">
                      {/* TOOLTIP */}
                      <span className="absolute bottom-full mb-2 text-xs font-black text-slate-700 opacity-0 group-hover:opacity-100 transition">{value}</span>

                      {/* BATANG */}
                      <div
                        className="column-grow w-full max-w-14 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-xl group-hover:from-emerald-800 group-hover:to-emerald-400 transition-all"
                        style={{
                          height: `${value > 0 ? Math.max(height, 5) : 0}%`,
                        }}
                      />
                    </div>

                    {/* LABEL */}
                    <span className="text-[10px] font-bold text-slate-500 py-3">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <SectionTitle color="blue" title="Demografi Kepangkatan PPPK" subtitle="Distribusi ASN berdasarkan golongan." />

            <div className="flex items-end gap-4 md:gap-8 h-64 mt-8 border-b border-slate-200">
              {Object.entries(golonganPPPK).map(([label, value]) => {
                const max = Math.max(...Object.values(golonganPPPK), 1);
                const height = (value / max) * 100;

                return (
                  <div key={label} className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer" onClick={() => openDetail("golongan", label)}>
                    {/* AREA BATANG */}
                    <div className="relative w-full h-full flex items-end justify-center">
                      {/* TOOLTIP */}
                      <span className="absolute bottom-full mb-2 text-xs font-black text-slate-700 opacity-0 group-hover:opacity-100 transition">{value}</span>

                      {/* BATANG */}
                      <div
                        className="column-grow w-full max-w-14 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-xl group-hover:from-blue-800 group-hover:to-blue-600 transition-all"
                        style={{
                          height: `${value > 0 ? Math.max(height, 5) : 0}%`,
                        }}
                      />
                    </div>

                    {/* LABEL */}
                    <span className="text-[10px] font-bold text-slate-500 py-3">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PENDIDIKAN */}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <SectionTitle color="cyan" title="Tingkat Pendidikan" subtitle="Estimasi berdasarkan gelar akademik." />

            <div className="space-y-5 mt-7">
              {Object.entries(pendidikan).map(([label, value]) => (
                <ProgressRow key={label} label={label} value={value} total={Math.max(...Object.values(pendidikan), 1)} color="bg-cyan-500" onClick={() => openDetail("pendidikan", label)} />
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            MATRIX FUNGSIONAL
        ===================================================== */}

        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <SectionTitle color="violet" title="Peta Jabatan Fungsional" subtitle="Sebaran ASN berdasarkan rumpun dan jenjang jabatan." />
          </div>

          <div className="overflow-x-auto mt-6">
            <table className="w-full min-w-[950px] border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="sticky left-0 z-20 bg-slate-100 text-left px-4 py-4 text-[10px] font-black uppercase">Jenjang</th>

                  {KATEGORI.map((kategori) => (
                    <th key={kategori.key} className="px-3 py-4 text-[9px] font-black uppercase text-slate-500">
                      {kategori.label}
                    </th>
                  ))}

                  <th className="px-4 py-4 text-[10px] font-black bg-blue-50 text-blue-700">TOTAL</th>
                </tr>
              </thead>

              <tbody>
                {JENJANG.map((jenjang) => (
                  <tr key={jenjang} className="border-b border-slate-100 hover:bg-violet-50/50 transition">
                    <td className="sticky left-0 z-10 bg-white px-4 py-4 font-black text-xs">{jenjang}</td>

                    {KATEGORI.map((kategori) => {
                      const value = matrixStats[jenjang][kategori.key];

                      return (
                        <td key={kategori.key} className="text-center px-3 py-4">
                          {value > 0 ? (
                            <button
                              type="button"
                              onClick={() => openDetail("fungsional", jenjang, kategori.key)}
                              className="inline-flex w-8 h-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 font-black text-xs hover:scale-125 hover:bg-violet-200 transition cursor-pointer"
                              title={`Lihat ${value} pegawai`}
                            >
                              {value}
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="text-center font-black bg-blue-50/50 text-blue-700">{matrixStats[jenjang].Total}</td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="bg-slate-100">
                  <td className="sticky left-0 bg-slate-100 px-4 py-4 font-black text-xs">TOTAL</td>

                  {KATEGORI.map((kategori) => (
                    <td key={kategori.key} className="text-center font-black text-sm">
                      {matrixTotals[kategori.key]}
                    </td>
                  ))}

                  <td className="text-center bg-[#15406A] text-white font-black text-lg">{matrixTotals.Total}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* =====================================================
            PELAKSANA
        ===================================================== */}

        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-10">
          <SectionTitle color="orange" title="Peta Jabatan Pelaksana" subtitle="Distribusi PNS pada jabatan pelaksana antara BBPVP dan Satpel." />

          <div className="overflow-x-auto mt-6">
            <table className="w-full min-w-[850px]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left px-4 py-4 text-[10px] font-black uppercase">Jabatan</th>

                  <th className="text-center px-4 py-4 text-[10px] font-black uppercase">Total</th>

                  <th className="text-center px-4 py-4 text-[10px] font-black uppercase text-orange-600">SATPEL</th>

                  <th className="text-center px-4 py-4 text-[10px] font-black uppercase text-blue-600">BBPVP Makassar</th>
                </tr>
              </thead>

              <tbody>
                {PELAKSANA.map((jabatan, index) => {
                  const item = pelaksanaStats[jabatan];

                  return (
                    <tr key={jabatan} className="border-b border-slate-100 hover:bg-orange-50/50 transition">
                      <td className="px-4 py-4">
                        <div className="flex gap-3 items-center">
                          <span className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-[10px] font-black">{index + 1}</span>

                          <span className="font-bold text-xs">{jabatan}</span>
                        </div>
                      </td>

                      {/* TOTAL */}
                      <td className="text-center">
                        <button type="button" onClick={() => openDetail("jabatan", jabatan)} className="font-black text-[#15406A] hover:text-blue-600 hover:underline cursor-pointer">
                          {item.total}
                        </button>
                      </td>

                      {/* SATPEL */}
                      <td className="text-center">
                        {item.satpel > 0 ? (
                          <button
                            type="button"
                            onClick={() => openDetail("jabatan-unit", jabatan, "Satpel")}
                            className="px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 font-black text-xs hover:bg-orange-200 hover:scale-105 transition cursor-pointer"
                          >
                            {item.satpel}
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* BBPVP MAKASSAR */}
                      <td className="text-center">
                        {item.pusat > 0 ? (
                          <button
                            type="button"
                            onClick={() => openDetail("jabatan-unit", jabatan, "Pusat")}
                            className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 font-black text-xs hover:bg-blue-200 hover:scale-105 transition cursor-pointer"
                          >
                            {item.pusat}
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

/*
|--------------------------------------------------------------------------
| COMPONENTS
|--------------------------------------------------------------------------
*/
function KpiCard({ title, value, subtitle, icon, gradient, onClick }: { title: string; value: number; subtitle: string; icon: string; gradient: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} text-white p-5 shadow-lg hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 text-left w-full ${
        onClick ? "cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/10 group-hover:scale-150 transition-transform duration-700" />

      <div className="relative">
        <div className="flex justify-between items-start">
          <p className="text-[9px] uppercase tracking-widest font-black opacity-70">{title}</p>

          <span className="text-xl opacity-70 group-hover:scale-125 transition-transform">{icon}</span>
        </div>

        <p className="text-3xl md:text-4xl font-black mt-4 tracking-tight">{value}</p>

        <p className="text-[10px] mt-2 opacity-70 font-medium">{subtitle}</p>

        {onClick && <p className="text-[9px] mt-3 opacity-60 font-bold">Klik untuk melihat detail →</p>}
      </div>
    </button>
  );
}

function InsightCard({ type, title, value, description, onClick }: { type: "danger" | "warning" | "success"; title: string; value: string; description: string; onClick?: () => void }) {
  const config = {
    danger: {
      bg: "bg-red-50",
      border: "border-red-100",
      icon: "🚨",
      color: "text-red-600",
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-100",
      icon: "⚠️",
      color: "text-amber-600",
    },
    success: {
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      icon: "✓",
      color: "text-emerald-600",
    },
  }[type];

  return (
    <button type="button" onClick={onClick} className={`rounded-3xl ${config.bg} ${config.border} border p-5 flex gap-4 hover:-translate-y-1 transition-all ${onClick ? "cursor-pointer" : "cursor-default"}`}>
      <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-xl shadow-sm shrink-0">{config.icon}</div>

      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-widest font-black text-slate-400">{title}</p>

        <p className={`text-xl font-black ${config.color} mt-1`}>{value}</p>

        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{description}</p>
      </div>
    </button>
  );
}

function SectionTitle({ color, title, subtitle }: { color: string; title: string; subtitle: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500",
    indigo: "bg-indigo-500",
    sky: "bg-sky-500",
    teal: "bg-teal-500",
    pink: "bg-pink-500",
    red: "bg-red-500",
    emerald: "bg-emerald-500",
    cyan: "bg-cyan-500",
    violet: "bg-violet-500",
    orange: "bg-orange-500",
    amber: "bg-amber-500",
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className={`w-2.5 h-7 rounded-full ${colors[color] || "bg-blue-500"}`} />

        <h2 className="text-base md:text-lg font-black text-slate-800">{title}</h2>
      </div>

      <p className="text-[10px] md:text-xs text-slate-400 mt-2 ml-5">{subtitle}</p>
    </div>
  );
}

function ProgressRow({ label, value, total, color, onClick }: { label: string; value: number; total: number; color: string; onClick?: () => void }) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <button type="button" onClick={onClick} className={`w-full text-left ${onClick ? "cursor-pointer hover:bg-slate-50 rounded-xl p-2 -m-2" : ""}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-slate-600">{label}</span>

        <span className="text-xs font-black text-slate-800">
          {value}
          <span className="text-[9px] text-slate-400 ml-1">({percentage}%)</span>
        </span>
      </div>

      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full bar-grow`}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </button>
  );
}

function LeaveBox({ label, value, color, onClick }: { label: string; value: number; color: string; onClick?: () => void }) {
  const colors: Record<string, string> = {
    red: "bg-red-50 text-red-600 border-red-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    sky: "bg-sky-50 text-sky-600 border-sky-100",
  };

  return (
    <button type="button" onClick={onClick} className={`rounded-2xl border p-4 ${colors[color]} hover:-translate-y-1 hover:shadow-md transition-all text-left ${onClick ? "cursor-pointer" : ""}`}>
      <p className="text-[9px] uppercase font-black opacity-60">{label}</p>

      <p className="text-2xl font-black mt-2">{value}</p>

      <p className="text-[9px] opacity-60">pegawai</p>

      <p className="text-[8px] mt-2 font-bold opacity-60">Lihat detail →</p>
    </button>
  );
}

function GenderCard({ label, value, percentage, icon, color, onClick }: { label: string; value: number; percentage: number; icon: string; color: "blue" | "pink"; onClick?: () => void }) {
  const style =
    color === "blue"
      ? {
          bg: "bg-blue-50",
          text: "text-blue-600",
        }
      : {
          bg: "bg-pink-50",
          text: "text-pink-600",
        };

  return (
    <button type="button" onClick={onClick} className={`flex-1 rounded-2xl ${style.bg} p-4 text-center group hover:scale-[1.03] transition cursor-pointer`}>
      <div className={`w-11 h-11 rounded-full bg-white ${style.text} flex items-center justify-center mx-auto text-2xl font-black shadow-sm`}>{icon}</div>

      <p className="text-[10px] font-bold text-slate-500 mt-3">{label}</p>

      <p className={`text-3xl font-black ${style.text} mt-1`}>{value}</p>

      <span className="inline-block mt-1 px-2 py-0.5 bg-white rounded-lg text-[9px] font-black">{percentage}%</span>
    </button>
  );
}
