"use client";

import Link from "next/link";
import { useMemo } from "react";
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
}

const currentYear = new Date().getFullYear();

function formatTanggal(value: string | Date | null | undefined) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function getTitle(filter: string, value: string, category: string) {
  if (filter === "status") return `Pegawai ${value}`;
  if (filter === "unit") return `Pegawai Unit ${value}`;
  if (filter === "satpel") return value;
  if (filter === "generasi") return `Generasi ${value}`;
  if (filter === "usia") return `Pegawai Usia ${value}`;
  if (filter === "gender") return value === "L" ? "Pegawai Laki-Laki" : "Pegawai Perempuan";
  if (filter === "cuti") return `Cuti ${value}`;
  if (filter === "pensiun") return `Proyeksi Pensiun ${value}`;
  if (filter === "golongan") return `Pegawai ${value}`;
  if (filter === "pangkat") return `Pegawai Pangkat ${value}`;
  if (filter === "pendidikan") return `Pendidikan ${value}`;

  if (filter === "fungsional") {
    if (category) return `${category} — ${value}`;
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

  if (filter === "jabatan") return value;
  if (filter === "cuti-bulan") return `Penggunaan Cuti Bulan ${value}`;

  return "Detail Pegawai";
}

export default function DashboardDetailClient({ initialData, filter, value, category }: Props) {
  const filteredData = useMemo(() => {
    return initialData.filter((pegawai) => {
      if (!filter) return true;

      if (filter === "status") {
        if (value === "ASN") {
          return pegawai.status_kepegawaian === "PNS" || pegawai.status_kepegawaian === "PPPK";
        }
        return pegawai.status_kepegawaian === value;
      }

      if (filter === "unit") {
        return getUnit(pegawai) === value;
      }

      if (filter === "satpel") {
        return pegawai.bidang === value;
      }

      if (filter === "generasi") {
        return getGenerasi(pegawai) === value;
      }

      if (filter === "usia") {
        return getKategoriUsia(pegawai) === value;
      }

      if (filter === "gender") {
        return getGender(pegawai) === value;
      }

      if (filter === "cuti") {
        return getKategoriCuti(pegawai) === value;
      }

      if (filter === "pensiun") {
        return getKategoriPensiun(pegawai, currentYear) === value;
      }

      if (filter === "golongan") {
        return getKategoriGolongan(pegawai) === value;
      }

      if (filter === "pangkat") {
        return String(pegawai.pangkat_golongan || "") === value;
      }

      if (filter === "fungsional") {
        const cocokJenjang = getJenjang(pegawai) === value;
        const cocokKategori = !category || getKategoriFungsional(pegawai) === category;
        return cocokJenjang && cocokKategori;
      }

      if (filter === "jabatan") {
        return pegawai.jabatan === value;
      }

      if (filter === "jabatan-unit") {
        const cocokJabatan = pegawai.jabatan === value;

        const cocokUnit = category === "Satpel" ? isSatpel(pegawai) : category === "Pusat" ? !isSatpel(pegawai) : true;

        return cocokJabatan && cocokUnit;
      }

      if (filter === "pensiun-risk") {
        const sisa = getSisaPensiun(pegawai, currentYear);
        return sisa !== null && sisa >= 0 && sisa <= 2;
      }

      if (filter === "cuti-bulan") {
        const bulanIndex = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"].indexOf(value);
        if (bulanIndex === -1) return false;
        return (pegawai.riwayat_cuti || []).some((record) => record.tahun === currentYear && record.bulan_angka === bulanIndex + 1);
      }

      return true;
    });
  }, [initialData, filter, value, category]);

  return (
    <main className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8 font-sans">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-up { animation: fadeUp 0.4s ease-out forwards; }
      `}</style>

      <div className="max-w-[1500px] mx-auto animate-fade-up">
        {/* ==================== HEADER ==================== */}
        <div className="mb-6 flex flex-col md:flex-row justify-between md:items-end gap-5">
          <div className="flex items-start gap-4">
            <Link
              href="/admin"
              className="mt-1 w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-[#15406A] hover:border-blue-200 shadow-sm transition-all group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 text-[10px] font-black tracking-widest uppercase mb-2 border border-blue-100">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Drill-Down Data
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-[#15406A] tracking-tight">{getTitle(filter, value, category)}</h1>
              <p className="text-sm text-slate-500 mt-1 font-medium">Menampilkan rincian data pegawai berdasarkan filter yang dipilih dari dashboard utama.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 px-6 py-4 shadow-sm flex flex-col items-end min-w-[160px]">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Total Pegawai</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-[#15406A]">{filteredData.length}</span>
              <span className="text-sm font-bold text-slate-400">Orang</span>
            </div>
          </div>
        </div>

        {/* ==================== FILTER INFO ==================== */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-3 mb-6 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-[11px] uppercase tracking-widest font-black">Filter Aktif:</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 shadow-sm">{value || "Semua Pegawai"}</span>
            {category && (
              <>
                <span className="text-slate-300 text-xs font-bold">/</span>

                <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 shadow-sm">{category === "Satpel" ? "SATPEL" : "BBPVP Makassar"}</span>
              </>
            )}
          </div>
        </div>

        {/* ==================== TABLE SECTION ==================== */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar max-h-[600px]">
            <table className="w-full min-w-[1100px] text-left border-collapse">
              <thead className="bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500 w-16">No</th>
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">NIP</th>
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Nama Pegawai</th>
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Jabatan</th>
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Unit / Satpel</th>
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Detail Info</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredData.map((pegawai, index) => {
                  const usia = getUsia(pegawai, currentYear);
                  const sisaCuti = getTotalSisaCuti(pegawai);
                  const sisaPensiun = getSisaPensiun(pegawai, currentYear);
                  // Ambil inisial nama untuk avatar
                  const initial = pegawai.nama ? pegawai.nama.charAt(0).toUpperCase() : "?";

                  return (
                    <tr key={pegawai.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-5 py-4 text-xs font-bold text-slate-400">{index + 1}</td>
                      <td className="px-5 py-4 text-xs font-mono font-semibold text-slate-500">{pegawai.nip || "-"}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-50 border border-blue-200 text-[#15406A] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">{initial}</div>
                          <Link href={`/admin/data-pegawai/${pegawai.id}`} className="text-sm font-bold text-[#15406A] hover:text-blue-600 hover:underline line-clamp-1">
                            {pegawai.nama || "-"}
                          </Link>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold ring-1 ring-inset ring-slate-500/10">{pegawai.status_kepegawaian || "-"}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-medium text-slate-600 line-clamp-2 leading-relaxed">{pegawai.jabatan || "-"}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-slate-700">{isSatpel(pegawai) ? "SATPEL" : "BBPVP Makassar"}</span>
                          <span className="text-[10px] font-medium text-slate-400 line-clamp-1">{pegawai.bidang || "-"}</span>
                        </div>
                      </td>
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

                          {filter === "golongan" && <span className="inline-flex px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold ring-1 ring-inset ring-emerald-600/20">{pegawai.pangkat_golongan || "-"}</span>}

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

                {/* EMPTY STATE */}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-20 bg-slate-50/30">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mb-4">
                          <span className="text-3xl">🔍</span>
                        </div>
                        <h3 className="text-sm font-black text-slate-700 mb-1">Tidak ada pegawai ditemukan</h3>
                        <p className="text-xs text-slate-500 font-medium max-w-sm">
                          Tidak terdapat data pegawai yang sesuai dengan kombinasi filter <span className="font-bold text-slate-700">{value}</span> saat ini.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ==================== FOOTER ==================== */}
        <div className="mt-6 flex justify-between items-center px-2">
          <p className="text-[11px] font-bold text-slate-400">
            Menampilkan <span className="text-slate-700">{filteredData.length}</span> baris data
          </p>

          <Link href="/admin" className="px-5 py-2.5 rounded-xl bg-[#15406A] text-white text-xs font-bold hover:bg-[#0f2d4a] hover:shadow-lg hover:shadow-blue-900/20 transition-all focus:ring-4 focus:ring-blue-900/10">
            Kembali ke Dashboard Utama
          </Link>
        </div>
      </div>
    </main>
  );
}
