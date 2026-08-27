import { neon } from "@neondatabase/serverless";
import Link from "next/link";

export const revalidate = 0;

export default async function DashboardPage() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT * FROM data_pegawai ORDER BY created_at DESC`;
  const currentYear = new Date().getFullYear();

  // --- 1. KALKULASI STATISTIK UTAMA & PNS SATPEL ---
  const totalPegawai = rows.length;
  const totalPNS = rows.filter((p) => p.status_kepegawaian === "PNS").length;
  const totalPPPK = rows.filter((p) => p.status_kepegawaian === "PPPK").length;
  const totalNonASN = rows.filter((p) => p.status_kepegawaian === "Non ASN").length;
  const pnsSatpel = rows.filter((p) => p.status_kepegawaian === "PNS" && p.bidang === "SATPEL").length;
  const pnsPusat = totalPNS - pnsSatpel;

  // --- 2. KOMPOSISI STATUS (DONUT) ---
  const pnsPct = totalPegawai > 0 ? (totalPNS / totalPegawai) * 100 : 0;
  const pppkPct = totalPegawai > 0 ? (totalPPPK / totalPegawai) * 100 : 0;
  const nonAsnPct = totalPegawai > 0 ? (totalNonASN / totalPegawai) * 100 : 0;
  const donutGradient = `conic-gradient(#10b981 0% ${pnsPct}%, #3b82f6 ${pnsPct}% ${pnsPct + pppkPct}%, #f59e0b ${pnsPct + pppkPct}% 100%)`;

  // --- 3. DISTRIBUSI BIDANG & GOLONGAN ---
  const distribusiBidang: Record<string, number> = {};
  const golonganStats = { "Gol I": 0, "Gol II": 0, "Gol III": 0, "Gol IV": 0, Lainnya: 0 };
  rows.forEach((p) => {
    distribusiBidang[p.bidang.replace("-- ", "")] = (distribusiBidang[p.bidang.replace("-- ", "")] || 0) + 1;
    if (p.pangkat_golongan?.startsWith("I/")) golonganStats["Gol I"]++;
    else if (p.pangkat_golongan?.startsWith("II/")) golonganStats["Gol II"]++;
    else if (p.pangkat_golongan?.startsWith("III/")) golonganStats["Gol III"]++;
    else if (p.pangkat_golongan?.startsWith("IV/")) golonganStats["Gol IV"]++;
    else golonganStats["Lainnya"]++;
  });
  const topBidang = Object.entries(distribusiBidang)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxGolongan = Math.max(...Object.values(golonganStats), 1);

  // --- 4. DATA TERBARU ---
  const pegawaiTerbaru = rows.slice(0, 5);

  // --- 5. [FITUR BARU] ANALITIK UMUR, PENSIUN & KENAIKAN PANGKAT ---
  const usiaStats = { "< 30 Thn": 0, "31-40 Thn": 0, "41-50 Thn": 0, "> 50 Thn": 0 };
  const pensiunStats = { "Tahun Ini": 0, "1-2 Thn": 0, "3-5 Thn": 0, "> 5 Thn": 0 };
  const kandidatKP: { nama: string; pangkat_golongan: string; masaPangkat: number }[] = [];

  rows.forEach((p) => {
    // A. Analitik Umur
    if (p.tanggal_lahir) {
      const thnLahir = new Date(p.tanggal_lahir).getFullYear();
      const umur = currentYear - thnLahir;
      if (umur < 30) usiaStats["< 30 Thn"]++;
      else if (umur <= 40) usiaStats["31-40 Thn"]++;
      else if (umur <= 50) usiaStats["41-50 Thn"]++;
      else usiaStats["> 50 Thn"]++;

      // B. Proyeksi Pensiun (Hanya ASN)
      if (p.status_kepegawaian !== "Non ASN") {
        let batasUmur = 58;
        if (p.jabatan?.includes("Utama")) batasUmur = 65;
        else if (p.jabatan?.includes("Madya") || p.jabatan === "Kepala BBPVP Makassar") batasUmur = 60;

        const thnPensiun = thnLahir + batasUmur;
        const sisaTahun = thnPensiun - currentYear;

        if (sisaTahun <= 0) pensiunStats["Tahun Ini"]++;
        else if (sisaTahun <= 2) pensiunStats["1-2 Thn"]++;
        else if (sisaTahun <= 5) pensiunStats["3-5 Thn"]++;
        else pensiunStats["> 5 Thn"]++;
      }
    }

    // C. Radar Kenaikan Pangkat (Hanya PNS, TMT > 4 Tahun)
    if (p.status_kepegawaian === "PNS" && p.tmt_pangkat_terakhir) {
      const thnTmt = new Date(p.tmt_pangkat_terakhir).getFullYear();
      const masaPangkat = currentYear - thnTmt;
      if (masaPangkat >= 4) {
        kandidatKP.push({
          nama: p.nama as string,
          pangkat_golongan: p.pangkat_golongan as string,
          masaPangkat: masaPangkat,
        });
      }
    }
  });

  const maxUsia = Math.max(...Object.values(usiaStats), 1);
  const maxPensiun = Math.max(...Object.values(pensiunStats), 1);

  // --- 6. MATRIKS JABATAN (FUNGSIONAL & PELAKSANA) ---
  const jenjangList = ["Ahli Utama", "Ahli Madya", "Ahli Muda", "Ahli Pertama", "Mahir", "Terampil"];
  const kategoriList = [
    { key: "Instruktur", label: "Instruktur" },
    { key: "SDM", label: "Analis SDM" },
    { key: "PengantarKerja", label: "Pengantar Kerja" },
    { key: "Perencana", label: "Perencana" },
    { key: "Arsiparis", label: "Arsiparis" },
    { key: "Prakom", label: "Pranata Komputer" },
    { key: "Keuangan", label: "Keuangan APBN" },
    { key: "Barang", label: "Penata Laksana Barang" },
  ];
  const matrixStats: Record<string, Record<string, number>> = {};
  jenjangList.forEach((j) => {
    matrixStats[j] = {};
    kategoriList.forEach((k) => (matrixStats[j][k.key] = 0));
    matrixStats[j]["Total"] = 0;
  });
  const colTotals: Record<string, number> = {};
  kategoriList.forEach((k) => (colTotals[k.key] = 0));
  colTotals["Total"] = 0;

  const pelaksanaList = [
    "Penelaah Teknis Kebijakan",
    "Konselor SDM",
    "Penata Layanan Operasional",
    "Pengadministrasi Perkantoran",
    "Penata Laksana Barang Terampil",
    "Penata Kelola Sistem dan Teknologi Informasi",
    "Teknisi Sarana dan Prasarana",
    "Pramubakti",
  ];
  const pelaksanaStats: Record<string, { pusat: number; satpel: number; total: number }> = {};
  pelaksanaList.forEach((jab) => {
    pelaksanaStats[jab] = { pusat: 0, satpel: 0, total: 0 };
  });
  let totalPelaksanaPusat = 0,
    totalPelaksanaSatpel = 0,
    totalPelaksanaKeseluruhan = 0;

  rows.forEach((p) => {
    if (p.status_kepegawaian === "Non ASN") return;
    const jab = p.jabatan || "";

    // Matriks Fungsional
    let matchedJenjang = null;
    for (const j of jenjangList) {
      if (jab.includes(j)) {
        matchedJenjang = j;
        break;
      }
    }
    if (matchedJenjang) {
      let matchedKategori = null;
      if (jab.includes("Instruktur")) matchedKategori = "Instruktur";
      else if (jab.includes("Sumber Daya Manusia Aparatur")) matchedKategori = "SDM";
      else if (jab.includes("Pengantar Kerja")) matchedKategori = "PengantarKerja";
      else if (jab.includes("Perencana")) matchedKategori = "Perencana";
      else if (jab.includes("Arsiparis")) matchedKategori = "Arsiparis";
      else if (jab.includes("Pranata Komputer")) matchedKategori = "Prakom";
      else if (jab.includes("Keuangan APBN")) matchedKategori = "Keuangan";
      else if (jab.includes("Penata Laksana Barang")) matchedKategori = "Barang";

      if (matchedKategori) {
        matrixStats[matchedJenjang][matchedKategori]++;
        matrixStats[matchedJenjang]["Total"]++;
        colTotals[matchedKategori]++;
        colTotals["Total"]++;
      }
    }

    // Matriks Pelaksana (PNS)
    if (p.status_kepegawaian === "PNS" && pelaksanaList.includes(jab)) {
      if (p.bidang === "SATPEL") {
        pelaksanaStats[jab].satpel++;
        totalPelaksanaSatpel++;
      } else {
        pelaksanaStats[jab].pusat++;
        totalPelaksanaPusat++;
      }
      pelaksanaStats[jab].total++;
      totalPelaksanaKeseluruhan++;
    }
  });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-up { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .delay-100 { animation-delay: 0.1s; } .delay-200 { animation-delay: 0.2s; } .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; } .delay-500 { animation-delay: 0.5s; }
        @keyframes scaleYUp { 0% { transform: scaleY(0); } 100% { transform: scaleY(1); } }
        .animate-bar { transform-origin: left; animation: scaleXUp 1s ease-out forwards; }
        @keyframes scaleXUp { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
        .animate-bar-y { transform-origin: bottom; animation: scaleYUp 1s ease-out forwards; }
      `}</style>

      <div className="animate-fade-up flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-[#15406A] tracking-tight">Dashboard Analitik</h1>
          <p className="text-gray-500 mt-2 font-medium text-lg">Ringkasan data & visualisasi kepegawaian BBPVP Makassar.</p>
        </div>
      </div>

      {/* BARIS 1: 4 KARTU METRIK UTAMA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-up delay-100">
        <div className="bg-gradient-to-br from-[#15406A] to-[#0A2239] p-6 rounded-3xl shadow-xl shadow-blue-900/20 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative z-10">
            <p className="text-blue-200 font-bold tracking-wider text-sm mb-1 uppercase">Total Pegawai</p>
            <h3 className="text-5xl font-black">{totalPegawai}</h3>
            <p className="text-xs text-blue-300 mt-4">Keseluruhan data aktif</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <p className="text-gray-400 font-bold tracking-wider text-sm mb-1 uppercase">PNS</p>
            <h3 className="text-4xl font-black text-gray-800">{totalPNS}</h3>
          </div>
          <div className="mt-4 flex flex-col space-y-2">
            <div className="flex justify-between text-xs font-bold text-gray-600 border-b border-gray-100 pb-1.5">
              <span>BBPVP Pusat</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{pnsPusat} Org</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-gray-600">
              <span>SATPEL</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{pnsSatpel} Org</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <p className="text-gray-400 font-bold tracking-wider text-sm mb-1 uppercase">PPPK</p>
            <h3 className="text-4xl font-black text-gray-800">{totalPPPK}</h3>
          </div>
          <div className="mt-4">
            <p className="text-xs text-blue-700 font-bold bg-blue-50 px-2.5 py-1.5 rounded-md w-fit border border-blue-100">{Math.round(pppkPct)}% dari total pegawai</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <p className="text-gray-400 font-bold tracking-wider text-sm mb-1 uppercase">Non ASN</p>
            <h3 className="text-4xl font-black text-gray-800">{totalNonASN}</h3>
          </div>
          <div className="mt-4">
            <p className="text-xs text-amber-700 font-bold bg-amber-50 px-2.5 py-1.5 rounded-md w-fit border border-amber-100">{Math.round(nonAsnPct)}% dari total pegawai</p>
          </div>
        </div>
      </div>

      {/* --- BARIS BARU 2: ANALITIK HR (Umur & Pensiun) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up delay-200">
        {/* CHART UMUR (Horizontal Bars) */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
            <span className="w-3 h-6 bg-teal-500 rounded-full mr-3"></span> Demografi Usia
          </h2>
          <div className="space-y-4">
            {Object.entries(usiaStats).map(([range, count], idx) => {
              const widthPct = maxUsia > 0 ? (count / maxUsia) * 100 : 0;
              return (
                <div key={idx}>
                  <div className="flex justify-between text-xs mb-1 font-bold">
                    <span className="text-gray-600">{range}</span>
                    <span className="text-teal-700">{count} Org</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full animate-bar" style={{ width: `${widthPct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHART PENSIUN (Horizontal Bars) */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-gray-800">
          <h2 className="text-lg font-bold  mb-6 flex items-center">
            <span className="w-3 h-6 bg-indigo-500 rounded-full mr-3"></span> Proyeksi Pensiun (ASN)
          </h2>
          <div className="space-y-4">
            {Object.entries(pensiunStats).map(([range, count], idx) => {
              const widthPct = maxPensiun > 0 ? (count / maxPensiun) * 100 : 0;
              // Warna merah jika tahun ini, orange 1-2 thn
              const barColor = range === "Tahun Ini" ? "bg-red-500" : range === "1-2 Thn" ? "bg-orange-500" : "bg-indigo-500";
              return (
                <div key={idx}>
                  <div className="flex justify-between text-xs mb-1 font-bold">
                    <span className="text-gray-600">{range}</span>
                    <span className={barColor.replace("bg-", "text-")}>{count} Org</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full animate-bar`} style={{ width: `${widthPct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RADAR KENAIKAN PANGKAT */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col h-[320px]">
          <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
            <span className="w-3 h-6 bg-rose-500 rounded-full mr-3"></span> Radar Kenaikan Pangkat
          </h2>
          <p className="text-[11px] text-gray-500 mb-4 border-b border-gray-100 pb-3">PNS dengan TMT Pangkat terakhir &ge; 4 Tahun.</p>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {kandidatKP.length > 0 ? (
              kandidatKP.map((p, idx) => (
                <div key={idx} className="bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                  <p className="text-sm font-bold text-gray-900 truncate">{p.nama}</p>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[10px] text-gray-500 font-bold">{p.pangkat_golongan}</p>
                    <p className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-black">{p.masaPangkat} Tahun</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-xs font-medium">Semua data KP aman.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BARIS 3: DISTRIBUSI UNIT KERJA & KOMPOSISI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up delay-300">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-8 flex items-center">
            <span className="w-3 h-8 bg-blue-500 rounded-full mr-3"></span> Distribusi Top 5 Unit Kerja
          </h2>
          <div className="space-y-6">
            {topBidang.map(([namaBidang, jumlah], index) => {
              const persentase = totalPegawai > 0 ? Math.round((jumlah / totalPegawai) * 100) : 0;
              return (
                <div key={index} className="group">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-bold text-gray-700">{namaBidang}</span>
                    <span className="font-bold text-[#15406A]">
                      {jumlah} Org <span className="text-gray-400 font-medium">({persentase}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#15406A] to-blue-400 rounded-full animate-bar" style={{ width: `${persentase}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col items-center">
          <h2 className="text-lg font-bold text-gray-800 mb-6 self-start flex items-center">
            <span className="w-3 h-6 bg-amber-500 rounded-full mr-3"></span> Komposisi Status
          </h2>
          <div className="relative w-48 h-48 rounded-full flex items-center justify-center shadow-inner" style={{ background: totalPegawai > 0 ? donutGradient : "#f3f4f6" }}>
            <div className="absolute w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
              <span className="text-3xl font-black text-[#15406A]">{totalPegawai}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</span>
            </div>
          </div>
          <div className="mt-8 w-full space-y-3">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></span>
                <span className="font-semibold text-gray-600">PNS</span>
              </div>
              <span className="font-bold">{Math.round(pnsPct)}%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                <span className="font-semibold text-gray-600">PPPK</span>
              </div>
              <span className="font-bold">{Math.round(pppkPct)}%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-amber-500 mr-2"></span>
                <span className="font-semibold text-gray-600">Non ASN</span>
              </div>
              <span className="font-bold">{Math.round(nonAsnPct)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* BARIS 4: GOLONGAN & PEGAWAI TERBARU */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up delay-400">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-8 flex items-center">
            <span className="w-3 h-8 bg-emerald-500 rounded-full mr-3"></span> Demografi Golongan
          </h2>
          <div className="flex h-56 items-end space-x-2 md:space-x-6 border-b border-l border-gray-100 pb-2 pl-2 relative">
            <div className="absolute w-full border-t border-dashed border-gray-200 top-0 left-2"></div>
            <div className="absolute w-full border-t border-dashed border-gray-200 top-1/2 left-2"></div>
            {Object.entries(golonganStats).map(([golongan, count], index) => {
              const heightPct = maxGolongan > 0 ? (count / maxGolongan) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center group z-10 h-full justify-end">
                  <span className="text-xs font-bold text-[#15406A] opacity-0 group-hover:opacity-100 transition-opacity mb-2 bg-blue-50 px-2 py-1 rounded">{count} Org</span>
                  <div className="w-full max-w-[60px] bg-blue-50/50 rounded-t-xl relative flex items-end" style={{ height: `${heightPct}%` }}>
                    <div className="w-full h-full bg-gradient-to-t from-[#15406A] to-blue-400 rounded-t-xl animate-bar-y"></div>
                  </div>
                  <span className="text-xs font-bold text-gray-500 mt-3 whitespace-nowrap">{golongan}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Pegawai Terbaru</h2>
          <div className="space-y-4">
            {pegawaiTerbaru.map((p) => (
              <div key={p.id} className="flex items-center space-x-4 p-2.5 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#15406A] to-blue-800 flex items-center justify-center font-bold text-white shadow-sm text-sm">{p.nama.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{p.nama}</p>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">{p.jabatan}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BARIS 5 & 6: TABEL MATRIKS (KODE TETAP SAMA) */}
      <div className="animate-fade-up delay-500 space-y-6">
        {/* TABEL FUNGSIONAL */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 overflow-hidden">
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <span className="w-3 h-8 bg-purple-500 rounded-full mr-3"></span> Peta Jabatan Fungsional (ASN)
              </h2>
            </div>
            <div className="px-4 py-2 bg-purple-50 text-purple-700 font-bold rounded-lg text-sm border border-purple-100">Total Fungsional: {colTotals["Total"]} Orang</div>
          </div>
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/80 border-y border-gray-200">
                  <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Jenjang Jabatan</th>
                  {kategoriList.map((k) => (
                    <th key={k.key} className="px-4 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center border-l border-gray-100">
                      {k.label}
                    </th>
                  ))}
                  <th className="px-4 py-4 text-[11px] font-black text-[#15406A] uppercase tracking-wider text-center bg-blue-50/50 border-l border-blue-100">Total Baris</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jenjangList.map((j) => (
                  <tr key={j} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-4 font-bold text-gray-700 text-sm border-r border-gray-50">{j}</td>
                    {kategoriList.map((k) => {
                      const val = matrixStats[j][k.key];
                      return (
                        <td key={k.key} className="px-4 py-4 text-center border-r border-gray-50">
                          {val > 0 ? <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 text-[#15406A] font-bold rounded-md text-sm">{val}</span> : <span className="text-gray-300 font-medium">-</span>}
                        </td>
                      );
                    })}
                    <td className="px-4 py-4 text-center font-black text-[#15406A] bg-blue-50/30 border-l border-blue-50 text-sm">{matrixStats[j]["Total"]}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50/80 border-t-2 border-gray-200">
                  <td className="px-5 py-4 font-black text-gray-800 uppercase text-xs border-r border-gray-200">Total Kolom</td>
                  {kategoriList.map((k) => (
                    <td key={k.key} className="px-4 py-4 text-center font-black text-gray-700 text-sm border-r border-gray-200">
                      {colTotals[k.key] > 0 ? colTotals[k.key] : "-"}
                    </td>
                  ))}
                  <td className="px-4 py-4 text-center font-black text-[#15406A] bg-blue-100 text-base shadow-inner">{colTotals["Total"]}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* TABEL PELAKSANA */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 overflow-hidden mb-10">
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <span className="w-3 h-8 bg-orange-500 rounded-full mr-3"></span> Peta Jabatan Pelaksana & Khusus (PNS)
              </h2>
            </div>
            <div className="px-4 py-2 bg-orange-50 text-orange-700 font-bold rounded-lg text-sm border border-orange-100">Total Pelaksana: {totalPelaksanaKeseluruhan} Orang</div>
          </div>
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/80 border-y border-gray-200">
                  <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/2">Nama Jabatan Pelaksana</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center border-l border-gray-100">BBPVP Makassar (Pusat)</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center border-l border-gray-100">Penempatan SATPEL</th>
                  <th className="px-4 py-4 text-[11px] font-black text-[#15406A] uppercase tracking-wider text-center bg-blue-50/50 border-l border-blue-100">Total Keseluruhan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pelaksanaList.map((jab) => (
                  <tr key={jab} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-4 font-bold text-gray-700 text-sm border-r border-gray-50">{jab}</td>
                    <td className="px-4 py-4 text-center border-r border-gray-50">
                      {pelaksanaStats[jab].pusat > 0 ? <span className="inline-block bg-gray-100 text-gray-800 font-bold px-3 py-1 rounded-md text-sm">{pelaksanaStats[jab].pusat}</span> : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-4 text-center border-r border-gray-50">
                      {pelaksanaStats[jab].satpel > 0 ? <span className="inline-block bg-orange-100 text-orange-700 font-bold px-3 py-1 rounded-md text-sm">{pelaksanaStats[jab].satpel}</span> : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-4 text-center font-black text-[#15406A] bg-blue-50/30 border-l border-blue-50 text-sm">{pelaksanaStats[jab].total}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50/80 border-t-2 border-gray-200">
                  <td className="px-5 py-4 font-black text-gray-800 uppercase text-xs border-r border-gray-200 text-right">Grand Total</td>
                  <td className="px-4 py-4 text-center font-black text-gray-700 text-sm border-r border-gray-200">{totalPelaksanaPusat > 0 ? totalPelaksanaPusat : "-"}</td>
                  <td className="px-4 py-4 text-center font-black text-orange-700 text-sm border-r border-gray-200">{totalPelaksanaSatpel > 0 ? totalPelaksanaSatpel : "-"}</td>
                  <td className="px-4 py-4 text-center font-black text-[#15406A] bg-blue-100 text-base shadow-inner">{totalPelaksanaKeseluruhan}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
