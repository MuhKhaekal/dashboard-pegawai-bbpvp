import { neon } from "@neondatabase/serverless";
import Link from "next/link";
import React, { Fragment } from "react";

export const revalidate = 0;

// ==========================================
// 1. DEFINISI TYPESCRIPT
// ==========================================
interface LeaveRecord {
  id?: number;
  pegawai_id: number;
  jenis_cuti: string;
  durasi: number | string;
  keterangan: string | null;
  tahun: number;
  bulan_angka: number;
  created_at: string | Date;
}

interface YearData {
  year: number;
  tahunan: Record<number, LeaveRecord[]>;
  lainnya: Record<number, LeaveRecord[]>;
  totalTahunan: number;
  totalLainnya: number;
}

type GroupedLeaves = Record<number, YearData>;

// ==========================================
// 2. FUNGSI FORMAT TANGGAL
// ==========================================
function formatTanggalLengkap(dateString: string | Date | null) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function formatTanggalHistory(dateString: string | Date) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(dateString));
}

export default async function DetailPegawaiPage({ params }: { params: Promise<{ id: string }> }) {
  const sql = neon(process.env.DATABASE_URL!);

  const resolvedParams = await params;
  const pegawaiId = parseInt(resolvedParams.id, 10);

  // Ambil data master pegawai
  const pRows = await sql`SELECT * FROM data_pegawai WHERE id = ${pegawaiId}`;
  if (pRows.length === 0) {
    return <div className="p-10 text-center text-sm font-medium text-slate-500 bg-white rounded-3xl m-10 border border-slate-200">Pegawai tidak ditemukan.</div>;
  }
  const p = pRows[0];

  // Ambil Riwayat Cuti
  const cRows = await sql`SELECT * FROM leave_records WHERE pegawai_id = ${pegawaiId} ORDER BY tahun DESC, bulan_angka DESC, created_at DESC`;

  // Kalkulasi BUP (Batas Usia Pensiun)
  const currentYear = new Date().getFullYear();
  let batasUmur = 58;
  if (p.status_kepegawaian !== "PPPK") {
    if (p.jabatan?.includes("Utama")) batasUmur = 65;
    else if (p.jabatan?.includes("Madya") || p.jabatan === "Kepala BBPVP Makassar") batasUmur = 60;
  }

  const tglLahirDate = p.tanggal_lahir ? new Date(p.tanggal_lahir) : null;
  const thnLahir = tglLahirDate ? tglLahirDate.getFullYear() : currentYear;
  const sisaTahunPensiun = thnLahir + batasUmur - currentYear;
  const totalKuotaMain = (p.cuti_tahun_ini || 0) + (p.sisa_cuti_tahun_lalu || 0);
  const DAFTAR_BULAN_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  // ==========================================
  // 3. TRANSFORMASI DATA (Pemisah Tahunan & Lainnya)
  // ==========================================
  const groupedLeaves: GroupedLeaves = {};
  
  cRows.forEach((row) => {
    const c = row as unknown as LeaveRecord;
    const year = c.tahun || currentYear;
    const month = c.bulan_angka || 1;
    const jenis = (c.jenis_cuti || "").toLowerCase();
    const isTahunan = jenis.includes("tahunan");

    // Inisialisasi struktur tahun jika belum ada
    if (!groupedLeaves[year]) {
      groupedLeaves[year] = { year, tahunan: {}, lainnya: {}, totalTahunan: 0, totalLainnya: 0 };
      for (let i = 1; i <= 12; i++) {
        groupedLeaves[year].tahunan[i] = [];
        groupedLeaves[year].lainnya[i] = [];
      }
    }

    const durasiItem = Number(c.durasi || 0);
    
    // Klasifikasi
    if (isTahunan) {
      groupedLeaves[year].tahunan[month].push(c);
      groupedLeaves[year].totalTahunan += durasiItem;
    } else {
      groupedLeaves[year].lainnya[month].push(c);
      groupedLeaves[year].totalLainnya += durasiItem;
    }
  });

  const availableYears = Object.keys(groupedLeaves).map(Number).sort((a, b) => b - a);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-up { animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .bento-card { background: white; border-radius: 1.5rem; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05); }
      `}</style>

      {/* HEADER NAVIGASI */}
      <div className="animate-fade-up flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Detail Pegawai</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola data profil dan riwayat matriks cuti</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/data-pegawai" className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2">
            Kembali
          </Link>
          <Link href={`/admin/edit-pegawai/${pegawaiId}`} className="px-5 py-2.5 bg-[#15406A] hover:bg-blue-900 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2">
            Edit Data
          </Link>
        </div>
      </div>

      {/* 
        ==================================================
        BARIS 1: BENTO KARTU PROFIL & STATISTIK
        ==================================================
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 delay-100 animate-fade-up">
        
        {/* KARTU PROFIL (TMT Sudah Ditambahkan) */}
        <div className="bento-card lg:col-span-2 p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 opacity-60"></div>
          
          <div className="shrink-0">
            <div className="w-24 h-24 bg-gradient-to-br from-[#15406A] to-blue-800 rounded-full flex items-center justify-center font-black text-4xl text-white shadow-lg border-4 border-white">
              {p.nama?.substring(0, 1).toUpperCase()}
            </div>
          </div>
          
          <div className="flex-1 text-center sm:text-left space-y-3 w-full">
            <div>
              <div className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-md mb-2">
                {p.status_kepegawaian} • {p.pangkat_golongan || "-"}
              </div>
              <h2 className="text-xl font-black text-slate-800 leading-tight">{p.nama}</h2>
              <p className="text-slate-500 font-mono text-sm mt-0.5">{p.nip}</p>
            </div>
            
            {/* GRID DATA PROFIL TERMASUK TMT */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-3 pt-3 border-t border-slate-100">
              <div className="sm:col-span-1">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Jabatan</span>
                <span className="text-sm font-semibold text-slate-700">{p.jabatan}</span>
              </div>
              <div className="sm:col-span-1">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Bidang</span>
                <span className="text-sm font-semibold text-slate-700">{p.bidang}</span>
              </div>
              <div className="sm:col-span-1">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">TMT Jabatan</span>
                <span className="text-sm font-semibold text-slate-700">{formatTanggalLengkap(p.tmt_jabatan_terakhir)}</span>
              </div>
              <div className="sm:col-span-3">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Tempat, Tanggal Lahir</span>
                <span className="text-sm font-semibold text-slate-700">{p.tempat_lahir || "-"}, {formatTanggalLengkap(p.tanggal_lahir)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* KARTU KUOTA CUTI TAHUNAN */}
        <div className="bento-card lg:col-span-1 p-6 bg-[#15406A] text-white flex flex-col justify-between border-none relative overflow-hidden">
          <div>
            <h3 className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">Kuota Tahunan ({currentYear})</h3>
            <div className="text-4xl font-black">{totalKuotaMain} <span className="text-lg font-medium text-blue-300">Hari</span></div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-800/50 flex justify-between text-sm">
            <div>
              <span className="block text-blue-300 text-[10px] uppercase">Kini ({currentYear})</span>
              <span className="font-bold">{p.cuti_tahun_ini || 0} Hari</span>
            </div>
            <div className="text-right">
              <span className="block text-blue-300 text-[10px] uppercase">Sisa Lalu</span>
              <span className="font-bold">{p.sisa_cuti_tahun_lalu || 0} Hari</span>
            </div>
          </div>
        </div>

        {/* KARTU STATUS MASA JABATAN */}
        <div className={`bento-card lg:col-span-1 p-6 flex flex-col justify-between ${
          !tglLahirDate ? 'bg-slate-50' : (sisaTahunPensiun <= 0 ? 'bg-red-50' : sisaTahunPensiun <= 1 ? 'bg-orange-50' : 'bg-emerald-50')
        }`}>
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-1 ${!tglLahirDate ? 'text-slate-500' : 'text-slate-600'}`}>
              Sisa Masa Jabatan
            </h3>
            <div className="text-3xl font-black mt-2 text-slate-800">
              {tglLahirDate ? (sisaTahunPensiun <= 0 ? "Pensiun" : `${sisaTahunPensiun}`) : "-"}
              {tglLahirDate && sisaTahunPensiun > 0 && <span className="text-lg font-medium text-slate-600 ml-1">Thn</span>}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-black/5 flex justify-between items-center">
            <span className="block text-[10px] font-bold uppercase text-slate-500">Batas Usia (BUP)</span>
            <span className="font-bold text-slate-700">{batasUmur} Tahun</span>
          </div>
        </div>
      </div>

      {/* 
        ==================================================
        BARIS 2: MATRIKS TABEL CUTI KATEGORIKAL
        ==================================================
      */}
      <div className="bento-card col-span-full p-6 md:p-8 delay-200 animate-fade-up">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-6">
          <div>
            <h2 className="text-lg font-black text-slate-800">Matriks Cuti Kategorial</h2>
            <p className="text-sm text-slate-500 mt-1">Arahkan kursor pada lencana angka untuk melihat keterangan detail tanpa terpotong batas tabel.</p>
          </div>
          <div className="text-[10px] font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
            Total {cRows.length} Riwayat
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-sm text-left min-w-[950px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-700 w-20 border-r border-slate-200 text-center">Tahun</th>
                <th className="px-4 py-3 font-bold text-slate-700 w-32 border-r border-slate-200">Jenis Cuti</th>
                {DAFTAR_BULAN_SHORT.map((b) => (
                  <th key={b} className="px-1.5 py-3 text-center font-bold text-slate-500 text-xs uppercase w-12">{b}</th>
                ))}
                <th className="px-4 py-3 text-center font-bold text-slate-700 bg-slate-100 border-l border-slate-200 w-24">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {availableYears.length === 0 ? (
                <tr>
                  <td colSpan={15} className="text-center py-12 text-slate-400 font-medium">
                    Belum ada riwayat pengambilan cuti yang tercatat.
                  </td>
                </tr>
              ) : (
                availableYears.map((year) => {
                  const data = groupedLeaves[year];
                  return (
                    <Fragment key={year}>
                      {/* BARIS 1: CUTI TAHUNAN */}
                      <tr className="hover:bg-blue-50/20 transition-colors">
                        <td rowSpan={2} className="px-4 py-4 font-black text-slate-800 border-r border-b border-slate-200 text-center text-lg align-middle bg-slate-50/50">
                          {year}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-[#15406A] border-r border-slate-100 bg-blue-50/30">
                          Tahunan
                        </td>
                        
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                          <td key={`tahunan-${m}`} className="px-1 py-2 text-center border-r border-slate-50">
                            {data.tahunan[m].length > 0 ? (
                              <div className="flex flex-col gap-1 items-center justify-center">
                                {data.tahunan[m].map((item, idx) => (
                                  <span 
                                    key={idx} 
                                    // Atribut TITLE native untuk menghindari isu tooltip terpotong
                                    title={`Keterangan: ${item.keterangan || '-'}\nInput: ${formatTanggalHistory(item.created_at)}`}
                                    className="inline-flex cursor-help items-center justify-center bg-blue-100 text-blue-700 border border-blue-200 font-bold w-7 h-7 rounded text-xs shadow-sm hover:bg-blue-600 hover:text-white transition-colors"
                                  >
                                    {item.durasi}
                                  </span>
                                ))}
                              </div>
                            ) : <span className="text-slate-200">-</span>}
                          </td>
                        ))}
                        
                        <td className="px-4 py-3 text-center bg-blue-50/50 border-l border-slate-200">
                           <span className="font-black text-[#15406A] text-sm">{data.totalTahunan}</span>
                        </td>
                      </tr>

                      {/* BARIS 2: CUTI LAINNYA (Sakit, Melahirkan, dll) */}
                      <tr className="border-b border-slate-200 hover:bg-orange-50/20 transition-colors">
                        <td className="px-4 py-3 text-xs font-bold text-orange-700 border-r border-slate-100 bg-orange-50/30">
                          Lainnya
                        </td>
                        
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                          <td key={`lainnya-${m}`} className="px-1 py-2 text-center border-r border-slate-50">
                            {data.lainnya[m].length > 0 ? (
                              <div className="flex flex-col gap-1 items-center justify-center">
                                {data.lainnya[m].map((item, idx) => {
                                  // Logika pewarnaan badge otomatis berdasarkan jenis cuti lainnya
                                  const jt = item.jenis_cuti.toLowerCase();
                                  let bgClass = "bg-slate-100 text-slate-700 border-slate-200";
                                  let label = "L";
                                  if (jt.includes('sakit')) { bgClass = "bg-orange-100 text-orange-700 border-orange-200"; label = "S"; }
                                  else if (jt.includes('melahirkan')) { bgClass = "bg-pink-100 text-pink-700 border-pink-200"; label = "M"; }
                                  else if (jt.includes('penting')) { bgClass = "bg-purple-100 text-purple-700 border-purple-200"; label = "P"; }
                                  else if (jt.includes('izin')) { bgClass = "bg-teal-100 text-teal-700 border-teal-200"; label = "I"; }

                                  return (
                                    <span 
                                      key={idx} 
                                      title={`Jenis: ${item.jenis_cuti}\nKeterangan: ${item.keterangan || '-'}\nInput: ${formatTanggalHistory(item.created_at)}`}
                                      className={`inline-flex cursor-help items-center justify-center font-bold px-1.5 py-1 border rounded text-[10px] shadow-sm hover:opacity-80 transition-opacity ${bgClass} whitespace-nowrap`}
                                    >
                                      {item.durasi} <span className="opacity-60 ml-0.5">({label})</span>
                                    </span>
                                  );
                                })}
                              </div>
                            ) : <span className="text-slate-200">-</span>}
                          </td>
                        ))}
                        
                        <td className="px-4 py-3 text-center bg-orange-50/50 border-l border-slate-200">
                           <span className="font-black text-orange-700 text-sm">{data.totalLainnya}</span>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* KETERANGAN LEGENDA (Wajib untuk Cuti Kategorial) */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div className="col-span-full mb-1 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Legenda Cuti Lainnya:</div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center bg-orange-100 text-orange-700 font-bold rounded border border-orange-200">S</span>
            <span className="font-medium text-slate-600">Sakit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center bg-pink-100 text-pink-700 font-bold rounded border border-pink-200">M</span>
            <span className="font-medium text-slate-600">Melahirkan</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center bg-purple-100 text-purple-700 font-bold rounded border border-purple-200">P</span>
            <span className="font-medium text-slate-600">Alasan Penting</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center bg-teal-100 text-teal-700 font-bold rounded border border-teal-200">I</span>
            <span className="font-medium text-slate-600">Izin</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center bg-slate-100 text-slate-700 font-bold rounded border border-slate-200">L</span>
            <span className="font-medium text-slate-600">Lain-lain</span>
          </div>
        </div>
        
      </div>
    </div>
  );
}