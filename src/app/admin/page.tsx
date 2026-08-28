import { neon } from "@neondatabase/serverless";
import Link from "next/link";

export const revalidate = 0;

export default async function DashboardPage() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT * FROM data_pegawai ORDER BY created_at DESC`;
  const currentYear = new Date().getFullYear();

  // --- 1. KALKULASI STATISTIK UTAMA ---
  const totalPegawai = rows.length;
  const totalPNS = rows.filter((p) => p.status_kepegawaian === "PNS").length;
  const totalPPPK = rows.filter((p) => p.status_kepegawaian === "PPPK").length;
  const totalNonASN = rows.filter((p) => p.status_kepegawaian === "Non ASN").length;
  const pnsSatpel = rows.filter((p) => p.status_kepegawaian === "PNS" && p.bidang === "SATPEL").length;
  const pnsPusat = totalPNS - pnsSatpel;

  const pnsPct = totalPegawai > 0 ? (totalPNS / totalPegawai) * 100 : 0;
  const pppkPct = totalPegawai > 0 ? (totalPPPK / totalPegawai) * 100 : 0;
  const nonAsnPct = totalPegawai > 0 ? (totalNonASN / totalPegawai) * 100 : 0;
  const donutGradient = `conic-gradient(#10b981 0% ${pnsPct}%, #3b82f6 ${pnsPct}% ${pnsPct + pppkPct}%, #f59e0b ${pnsPct + pppkPct}% 100%)`;

  // --- 2. ANALITIK UMUR, PENSIUN, KP, GENERASI, MASA KERJA, GENDER & PENDIDIKAN ---
  const usiaStats = { "< 30 Thn": 0, "31-40 Thn": 0, "41-50 Thn": 0, "> 50 Thn": 0 };
  const pensiunStats = { "Tahun Ini": 0, "1-2 Thn": 0, "3-5 Thn": 0, "> 5 Thn": 0 };
  const generasiStats = { "Baby Boomer": 0, "Gen X": 0, Milenial: 0, "Gen Z": 0 };
  const masaKerjaStats = { "< 5 Thn": 0, "5-10 Thn": 0, "11-20 Thn": 0, "> 20 Thn": 0 };
  const genderStats = { "Laki-Laki": 0, "Perempuan": 0 };
  const eduStats = { "S3 (Doktoral)": 0, "S2 (Magister)": 0, "S1 / D4": 0, "D1 - D3": 0, "SMA / Umum": 0 };
  
  const kandidatKP: { nama: string; pangkat_golongan: string; masaPangkat: number }[] = [];
  const pensiunWatchlist: { nama: string; jabatan: string; sisaTahun: number }[] = [];

  rows.forEach((p) => {
    // A. EKSTRAKSI UMUR & GENERASI
    if (p.tanggal_lahir) {
      const thnLahir = new Date(p.tanggal_lahir).getFullYear();
      const umur = currentYear - thnLahir;

      if (umur < 30) usiaStats["< 30 Thn"]++;
      else if (umur <= 40) usiaStats["31-40 Thn"]++;
      else if (umur <= 50) usiaStats["41-50 Thn"]++;
      else usiaStats["> 50 Thn"]++;

      if (thnLahir >= 1997) generasiStats["Gen Z"]++;
      else if (thnLahir >= 1981) generasiStats["Milenial"]++;
      else if (thnLahir >= 1965) generasiStats["Gen X"]++;
      else generasiStats["Baby Boomer"]++;

      // Proyeksi Pensiun & Watchlist (Hanya ASN)
      if (p.status_kepegawaian !== "Non ASN") {
        let batasUmur = 58;
        if (p.jabatan?.includes("Utama")) batasUmur = 65;
        else if (p.jabatan?.includes("Madya") || p.jabatan === "Kepala BBPVP Makassar") batasUmur = 60;
        const sisaTahun = thnLahir + batasUmur - currentYear;
        
        if (sisaTahun <= 0) pensiunStats["Tahun Ini"]++;
        else if (sisaTahun <= 2) pensiunStats["1-2 Thn"]++;
        else if (sisaTahun <= 5) pensiunStats["3-5 Thn"]++;
        else pensiunStats["> 5 Thn"]++;

        if (sisaTahun <= 2 && sisaTahun >= 0) {
          pensiunWatchlist.push({ nama: p.nama as string, jabatan: p.jabatan as string, sisaTahun });
        }
      }
    }

    // B. EKSTRAKSI GENDER & MASA KERJA DARI NIP
    if (p.status_kepegawaian === "PNS" || p.status_kepegawaian === "PPPK") {
      const nipClean = p.nip ? p.nip.replace(/\D/g, "") : "";
      if (nipClean.length >= 15) {
        // Ekstrak Masa Kerja (Tahun Masuk digit ke 9-12)
        const thnMasuk = parseInt(nipClean.substring(8, 12));
        const masaKerja = currentYear - thnMasuk;
        if (masaKerja < 5) masaKerjaStats["< 5 Thn"]++;
        else if (masaKerja <= 10) masaKerjaStats["5-10 Thn"]++;
        else if (masaKerja <= 20) masaKerjaStats["11-20 Thn"]++;
        else masaKerjaStats["> 20 Thn"]++;

        // Ekstrak Gender (Digit ke 15) -> 1 Pria, 2 Wanita
        const genderCode = nipClean.charAt(14);
        if (genderCode === '1') genderStats["Laki-Laki"]++;
        else if (genderCode === '2') genderStats["Perempuan"]++;
      }

      if (p.status_kepegawaian === "PNS" && p.tmt_pangkat_terakhir) {
        const masaPangkat = currentYear - new Date(p.tmt_pangkat_terakhir).getFullYear();
        if (masaPangkat >= 4) kandidatKP.push({ nama: p.nama as string, pangkat_golongan: p.pangkat_golongan as string, masaPangkat });
      }
    }

    // C. EKSTRAKSI PENDIDIKAN DARI NAMA (Gelar Akademik)
    const nameUpper = (p.nama || "").toUpperCase();
    if (nameUpper.includes("DR. ") || nameUpper.startsWith("DR.") || nameUpper.includes("PH.D")) {
      eduStats["S3 (Doktoral)"]++;
    } else if (nameUpper.includes(", M.") || nameUpper.includes(",M.")) {
      eduStats["S2 (Magister)"]++;
    } else if (nameUpper.includes(", S.") || nameUpper.includes(",S.") || nameUpper.includes("S.ST") || nameUpper.includes("S.TR")) {
      eduStats["S1 / D4"]++;
    } else if (nameUpper.includes("A.MD") || nameUpper.includes("A.MA")) {
      eduStats["D1 - D3"]++;
    } else {
      eduStats["SMA / Umum"]++;
    }
  });

  // Urutkan watchlist pensiun dari yang terdekat
  pensiunWatchlist.sort((a, b) => a.sisaTahun - b.sisaTahun);

  // --- 3. DISTRIBUSI GOLONGAN ---
  const golonganStats = { "Gol I": 0, "Gol II": 0, "Gol III": 0, "Gol IV": 0, Lainnya: 0 };
  rows.forEach((p) => {
    if (p.pangkat_golongan?.startsWith("I/")) golonganStats["Gol I"]++;
    else if (p.pangkat_golongan?.startsWith("II/")) golonganStats["Gol II"]++;
    else if (p.pangkat_golongan?.startsWith("III/")) golonganStats["Gol III"]++;
    else if (p.pangkat_golongan?.startsWith("IV/")) golonganStats["Gol IV"]++;
    else golonganStats["Lainnya"]++;
  });

  const maxUsia = Math.max(...Object.values(usiaStats), 1);
  const maxPensiun = Math.max(...Object.values(pensiunStats), 1);
  const maxGolongan = Math.max(...Object.values(golonganStats), 1);
  const maxEdu = Math.max(...Object.values(eduStats), 1);
  const totalASN = totalPNS + totalPPPK;
  const mkGradient = `conic-gradient(#8b5cf6 0% ${(masaKerjaStats["< 5 Thn"] / totalASN) * 100}%, #ec4899 ${(masaKerjaStats["< 5 Thn"] / totalASN) * 100}% ${((masaKerjaStats["< 5 Thn"] + masaKerjaStats["5-10 Thn"]) / totalASN) * 100}%, #14b8a6 ${((masaKerjaStats["< 5 Thn"] + masaKerjaStats["5-10 Thn"]) / totalASN) * 100}% ${((totalASN - masaKerjaStats["> 20 Thn"]) / totalASN) * 100}%, #f43f5e ${((totalASN - masaKerjaStats["> 20 Thn"]) / totalASN) * 100}% 100%)`;

  // --- 4 & 5 MATRIKS JABATAN (KODE TETAP) ---
  const jenjangList = ["Ahli Utama", "Ahli Madya", "Ahli Muda", "Ahli Pertama", "Mahir", "Terampil"];
  const kategoriList = [{ key: "Instruktur", label: "Instruktur" }, { key: "SDM", label: "Analis SDM" }, { key: "PengantarKerja", label: "Pengantar Kerja" }, { key: "Perencana", label: "Perencana" }, { key: "Arsiparis", label: "Arsiparis" }, { key: "Prakom", label: "Pranata Komputer" }, { key: "Keuangan", label: "Keuangan APBN" }, { key: "Barang", label: "Penata Laksana Barang" }];
  const matrixStats: Record<string, Record<string, number>> = {};
  jenjangList.forEach((j) => { matrixStats[j] = {}; kategoriList.forEach((k) => (matrixStats[j][k.key] = 0)); matrixStats[j]["Total"] = 0; });
  const colTotals: Record<string, number> = {}; kategoriList.forEach((k) => (colTotals[k.key] = 0)); colTotals["Total"] = 0;

  const pelaksanaList = ["Penelaah Teknis Kebijakan", "Teknisi Sarana dan Prasarana", "Penata Kelola Sistem dan Teknologi Informasi", "Konselor SDM", "Penata Layanan Operasional", "Pengelola Layanan Operasional", "Pengadministrasi Perkantoran", "Operator Layanan Operasional", "Pengelola Umum Operasional"];
  const pelaksanaStats: Record<string, { pusat: number; satpel: number; total: number }> = {};
  pelaksanaList.forEach((jab) => { pelaksanaStats[jab] = { pusat: 0, satpel: 0, total: 0 }; });
  let totalPelaksanaPusat = 0, totalPelaksanaSatpel = 0, totalPelaksanaKeseluruhan = 0;

  rows.forEach((p) => {
    if (p.status_kepegawaian === "Non ASN") return;
    const jab = p.jabatan || "";
    let matchedJenjang = null;
    for (const j of jenjangList) { if (jab.includes(j)) { matchedJenjang = j; break; } }
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
      if (matchedKategori) { matrixStats[matchedJenjang][matchedKategori]++; matrixStats[matchedJenjang]["Total"]++; colTotals[matchedKategori]++; colTotals["Total"]++; }
    }
    
    if (p.status_kepegawaian === "PNS" && pelaksanaList.includes(jab)) {
      if (p.bidang === "SATPEL") { pelaksanaStats[jab].satpel++; totalPelaksanaSatpel++; } 
      else { pelaksanaStats[jab].pusat++; totalPelaksanaPusat++; }
      pelaksanaStats[jab].total++; totalPelaksanaKeseluruhan++;
    }
  });

  return (
    <div className="p-4 md:p-6 lg:p-10 max-w-7xl mx-auto space-y-6 lg:space-y-8 bg-slate-50/50 min-h-screen">
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-up { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .delay-100 { animation-delay: 0.1s; } .delay-200 { animation-delay: 0.2s; } .delay-300 { animation-delay: 0.3s; } .delay-400 { animation-delay: 0.4s; } .delay-500 { animation-delay: 0.5s; }
        @keyframes scaleYUp { 0% { transform: scaleY(0); } 100% { transform: scaleY(1); } }
        .animate-bar { transform-origin: left; animation: scaleXUp 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        @keyframes scaleXUp { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
        .animate-bar-y { transform-origin: bottom; animation: scaleYUp 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .glass-card { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); }
      `}</style>

      {/* HEADER DASHBOARD */}
      <div className="animate-fade-up flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-blue-100/50 text-[#15406A] px-3 py-1 rounded-full mb-2 lg:mb-3 text-[10px] lg:text-xs font-black tracking-widest uppercase border border-blue-200">
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
            <span>Live Data</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black text-[#15406A] tracking-tight">Executive Dashboard</h1>
          <p className="text-gray-500 mt-1 lg:mt-2 font-medium text-sm lg:text-base">Platform Analisis Cerdas SDM BBPVP Makassar.</p>
        </div>
        <Link href="/admin/tambah-pegawai" className="inline-flex items-center justify-center space-x-2 bg-[#15406A] hover:bg-blue-900 text-white px-5 py-3 lg:px-6 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm lg:text-base w-full sm:w-auto">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
          <span>Input Data Baru</span>
        </Link>
      </div>

      {/* BARIS 1: 4 KARTU METRIK UTAMA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 animate-fade-up delay-100">
        <div className="bg-gradient-to-br from-[#15406A] to-[#0A2239] p-6 lg:p-7 rounded-3xl shadow-xl text-white relative overflow-hidden group hover:shadow-2xl transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative z-10">
            <p className="text-blue-200 font-bold tracking-wider text-[10px] lg:text-xs mb-2 uppercase">Total Pegawai</p>
            <h3 className="text-4xl lg:text-5xl font-black mb-4">{totalPegawai}</h3>
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden"><div className="w-full h-full bg-blue-400 rounded-full"></div></div>
          </div>
        </div>
        <div className="glass-card p-6 lg:p-7 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-emerald-300 transition-all hover:shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div><p className="text-gray-400 font-bold tracking-wider text-[10px] lg:text-xs mb-1 uppercase">PNS</p><h3 className="text-3xl lg:text-4xl font-black text-gray-800">{totalPNS}</h3></div>
            <div className="p-2 lg:p-2.5 bg-emerald-50 rounded-xl text-emerald-500 group-hover:rotate-12 transition-transform"><svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
          </div>
          <div className="space-y-2 lg:space-y-2.5 pt-3 lg:pt-4 border-t border-gray-100">
            <div className="flex justify-between text-[10px] lg:text-xs font-bold text-gray-500 group-hover:text-emerald-700 transition-colors"><span>BBPVP Pusat</span><span className="bg-emerald-50 px-2 py-0.5 rounded">{pnsPusat}</span></div>
            <div className="flex justify-between text-[10px] lg:text-xs font-bold text-gray-500 group-hover:text-emerald-700 transition-colors"><span>SATPEL</span><span className="bg-emerald-50 px-2 py-0.5 rounded">{pnsSatpel}</span></div>
          </div>
        </div>
        <div className="glass-card p-6 lg:p-7 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-blue-300 transition-all hover:shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div><p className="text-gray-400 font-bold tracking-wider text-[10px] lg:text-xs mb-1 uppercase">PPPK</p><h3 className="text-3xl lg:text-4xl font-black text-gray-800">{totalPPPK}</h3></div>
            <div className="p-2 lg:p-2.5 bg-blue-50 rounded-xl text-blue-500 group-hover:-rotate-12 transition-transform"><svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg></div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden"><div className="bg-blue-500 h-full rounded-full" style={{ width: `${pppkPct}%` }}></div></div>
          <p className="text-[10px] lg:text-xs text-gray-500 font-bold">{Math.round(pppkPct)}% dari populasi</p>
        </div>
        <div className="glass-card p-6 lg:p-7 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-amber-300 transition-all hover:shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div><p className="text-gray-400 font-bold tracking-wider text-[10px] lg:text-xs mb-1 uppercase">Non ASN</p><h3 className="text-3xl lg:text-4xl font-black text-gray-800">{totalNonASN}</h3></div>
            <div className="p-2 lg:p-2.5 bg-amber-50 rounded-xl text-amber-500 group-hover:scale-110 transition-transform"><svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg></div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden"><div className="bg-amber-500 h-full rounded-full" style={{ width: `${nonAsnPct}%` }}></div></div>
          <p className="text-[10px] lg:text-xs text-gray-500 font-bold">{Math.round(nonAsnPct)}% dari populasi</p>
        </div>
      </div>

      {/* BARIS 2: ANALISIS GENERASI (STACKED BAR) */}
      <div className="animate-fade-up delay-200 glass-card p-5 md:p-8 rounded-3xl shadow-sm border border-gray-100 group">
        <div className="flex flex-col mb-4 lg:mb-6">
          <h2 className="text-lg lg:text-xl font-bold text-gray-800 flex items-center">
            <span className="w-2 lg:w-3 h-6 lg:h-8 bg-indigo-500 rounded-full mr-2 lg:mr-3"></span> Peta Generasi Pegawai (Diversity)
          </h2>
          <p className="text-xs lg:text-sm text-gray-500 mt-1 lg:ml-5">Komposisi sosiologi berdasarkan tahun lahir pegawai.</p>
        </div>
        <div className="w-full flex h-6 lg:h-8 rounded-full overflow-hidden shadow-inner bg-gray-100">
          <div className="bg-[#15406A] h-full flex items-center justify-center animate-bar tooltip" style={{ width: `${(generasiStats["Baby Boomer"] / totalPegawai) * 100}%` }} title={`Boomer: ${generasiStats["Baby Boomer"]} Org`}></div>
          <div className="bg-blue-500 h-full flex items-center justify-center animate-bar tooltip" style={{ width: `${(generasiStats["Gen X"] / totalPegawai) * 100}%` }} title={`Gen X: ${generasiStats["Gen X"]} Org`}></div>
          <div className="bg-emerald-400 h-full flex items-center justify-center animate-bar tooltip" style={{ width: `${(generasiStats["Milenial"] / totalPegawai) * 100}%` }} title={`Milenial: ${generasiStats["Milenial"]} Org`}></div>
          <div className="bg-amber-400 h-full flex items-center justify-center animate-bar tooltip" style={{ width: `${(generasiStats["Gen Z"] / totalPegawai) * 100}%` }} title={`Gen Z: ${generasiStats["Gen Z"]} Org`}></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 mt-4 lg:mt-6">
          <div className="p-3 lg:p-4 rounded-xl lg:rounded-2xl bg-slate-50 border border-slate-100 hover:border-[#15406A] transition-colors"><p className="text-[9px] lg:text-[10px] uppercase font-bold text-gray-400 flex items-center"><span className="w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full bg-[#15406A] mr-1.5 lg:mr-2"></span>Boomer (≤1964)</p><p className="text-xl lg:text-2xl font-black text-gray-800 mt-1">{generasiStats["Baby Boomer"]} <span className="text-[10px] lg:text-xs text-gray-500 font-medium ml-1">Org</span></p></div>
          <div className="p-3 lg:p-4 rounded-xl lg:rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-500 transition-colors"><p className="text-[9px] lg:text-[10px] uppercase font-bold text-gray-400 flex items-center"><span className="w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full bg-blue-500 mr-1.5 lg:mr-2"></span>Gen X (1965-1980)</p><p className="text-xl lg:text-2xl font-black text-gray-800 mt-1">{generasiStats["Gen X"]} <span className="text-[10px] lg:text-xs text-gray-500 font-medium ml-1">Org</span></p></div>
          <div className="p-3 lg:p-4 rounded-xl lg:rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-400 transition-colors"><p className="text-[9px] lg:text-[10px] uppercase font-bold text-gray-400 flex items-center"><span className="w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full bg-emerald-400 mr-1.5 lg:mr-2"></span>Milenial (1981-1996)</p><p className="text-xl lg:text-2xl font-black text-gray-800 mt-1">{generasiStats["Milenial"]} <span className="text-[10px] lg:text-xs text-gray-500 font-medium ml-1">Org</span></p></div>
          <div className="p-3 lg:p-4 rounded-xl lg:rounded-2xl bg-slate-50 border border-slate-100 hover:border-amber-400 transition-colors"><p className="text-[9px] lg:text-[10px] uppercase font-bold text-gray-400 flex items-center"><span className="w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full bg-amber-400 mr-1.5 lg:mr-2"></span>Gen Z (≥1997)</p><p className="text-xl lg:text-2xl font-black text-gray-800 mt-1">{generasiStats["Gen Z"]} <span className="text-[10px] lg:text-xs text-gray-500 font-medium ml-1">Org</span></p></div>
        </div>
      </div>

      {/* --- BARIS 3: FITUR BARU (PENDIDIKAN & GENDER ASN) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 animate-fade-up delay-200">
        
        {/* PENDIDIKAN (Ekstrak Gelar) */}
        <div className="glass-card rounded-3xl shadow-sm border border-gray-100 p-6 lg:p-8">
          <h2 className="text-base lg:text-lg font-bold text-gray-800 mb-2 flex items-center">
            <span className="w-2.5 lg:w-3 h-5 lg:h-6 bg-cyan-500 rounded-full mr-2 lg:mr-3"></span> Tingkat Pendidikan
          </h2>
          <p className="text-[10px] lg:text-xs text-gray-500 mb-5 lg:mb-8 md:ml-5">Dianalisa otomatis melalui gelar akademik nama pegawai.</p>
          <div className="space-y-3 lg:space-y-4">
            {Object.entries(eduStats).map(([range, count], idx) => {
              const widthPct = maxEdu > 0 ? (count / maxEdu) * 100 : 0;
              return (
                <div key={idx} className="group relative">
                  <div className="flex justify-between text-xs lg:text-sm mb-1 lg:mb-1.5 font-bold">
                    <span className="text-gray-600">{range}</span>
                    <span className="text-cyan-700">{count} Org</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 lg:h-3 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full animate-bar" style={{ width: `${widthPct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GENDER ASN (Ekstrak NIP) */}
        <div className="glass-card rounded-3xl shadow-sm border border-gray-100 p-6 lg:p-8 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-100 rounded-full blur-3xl -translate-y-10 translate-x-10 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl translate-y-10 -translate-x-10 pointer-events-none"></div>
          
          <h2 className="text-base lg:text-lg font-bold text-gray-800 w-full mb-1 flex items-center relative z-10">
            <span className="w-2.5 lg:w-3 h-5 lg:h-6 bg-violet-500 rounded-full mr-2 lg:mr-3"></span> Rasio Gender (ASN)
          </h2>
          <p className="text-[10px] lg:text-xs text-gray-500 mb-6 lg:mb-8 w-full md:ml-5 relative z-10">Dianalisa dari digit NIP. Tidak termasuk Non-ASN.</p>
          
          <div className="flex justify-center items-center w-full gap-4 lg:gap-10 relative z-10">
            <div className="flex flex-col items-center p-4 bg-white/60 backdrop-blur rounded-2xl border border-blue-100 shadow-sm w-1/2 group hover:border-blue-300 transition-colors">
              <div className="w-10 h-10 lg:w-14 lg:h-14 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Laki-Laki</p>
              <p className="text-3xl lg:text-4xl font-black text-blue-600 mt-1">{genderStats["Laki-Laki"]}</p>
              <p className="text-[10px] font-bold text-blue-400 mt-1 bg-blue-50 px-2 py-0.5 rounded">{totalASN > 0 ? Math.round((genderStats["Laki-Laki"]/totalASN)*100) : 0}%</p>
            </div>
            
            <div className="flex flex-col items-center p-4 bg-white/60 backdrop-blur rounded-2xl border border-pink-100 shadow-sm w-1/2 group hover:border-pink-300 transition-colors">
              <div className="w-10 h-10 lg:w-14 lg:h-14 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Perempuan</p>
              <p className="text-3xl lg:text-4xl font-black text-pink-600 mt-1">{genderStats["Perempuan"]}</p>
              <p className="text-[10px] font-bold text-pink-400 mt-1 bg-pink-50 px-2 py-0.5 rounded">{totalASN > 0 ? Math.round((genderStats["Perempuan"]/totalASN)*100) : 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* BARIS 4: ANALITIK HR (Umur & Masa Kerja) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 animate-fade-up delay-300">
        <div className="glass-card rounded-3xl shadow-sm border border-gray-100 p-6 lg:p-8">
          <h2 className="text-base lg:text-lg font-bold text-gray-800 mb-5 lg:mb-8 flex items-center">
            <span className="w-2.5 lg:w-3 h-5 lg:h-6 bg-teal-500 rounded-full mr-2 lg:mr-3"></span> Piramida Usia Pegawai
          </h2>
          <div className="space-y-4 lg:space-y-5">
            {Object.entries(usiaStats).map(([range, count], idx) => {
              const widthPct = maxUsia > 0 ? (count / maxUsia) * 100 : 0;
              return (
                <div key={idx} className="group relative">
                  <div className="flex justify-between text-xs lg:text-sm mb-1 lg:mb-1.5 font-bold"><span className="text-gray-600">{range}</span><span className="text-teal-700">{count} Org</span></div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 lg:h-3.5 overflow-hidden"><div className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full animate-bar" style={{ width: `${widthPct}%` }}></div></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card rounded-3xl shadow-sm border border-gray-100 p-6 lg:p-8 flex flex-col md:flex-row items-center gap-6 lg:gap-8">
          <div className="flex-1 w-full order-2 md:order-1">
            <h2 className="text-base lg:text-lg font-bold text-gray-800 mb-1 lg:mb-2 flex items-center"><span className="w-2.5 lg:w-3 h-5 lg:h-6 bg-pink-500 rounded-full mr-2 lg:mr-3"></span> Masa Mengabdi (ASN)</h2>
            <p className="text-[10px] lg:text-xs text-gray-500 mb-4 lg:mb-6 md:ml-5">Dianalisa otomatis dari NIP Pengangkatan.</p>
            <div className="space-y-3 lg:space-y-4 w-full">
              <div className="flex justify-between items-center text-xs lg:text-sm"><div className="flex items-center"><span className="w-2.5 lg:w-3 h-2.5 lg:h-3 rounded-full bg-purple-500 mr-2 lg:mr-3"></span><span className="font-semibold text-gray-600">Baru (0-5 Thn)</span></div><span className="font-bold bg-gray-100 px-2 text-gray-800 rounded">{masaKerjaStats["< 5 Thn"]}</span></div>
              <div className="flex justify-between items-center text-xs lg:text-sm"><div className="flex items-center"><span className="w-2.5 lg:w-3 h-2.5 lg:h-3 rounded-full bg-pink-500 mr-2 lg:mr-3"></span><span className="font-semibold text-gray-600">Berkembang (5-10 Thn)</span></div><span className="font-bold bg-gray-100 px-2 text-gray-800 rounded">{masaKerjaStats["5-10 Thn"]}</span></div>
              <div className="flex justify-between items-center text-xs lg:text-sm"><div className="flex items-center"><span className="w-2.5 lg:w-3 h-2.5 lg:h-3 rounded-full bg-teal-500 mr-2 lg:mr-3"></span><span className="font-semibold text-gray-600">Senior (11-20 Thn)</span></div><span className="font-bold bg-gray-100 px-2 text-gray-800 rounded">{masaKerjaStats["11-20 Thn"]}</span></div>
              <div className="flex justify-between items-center text-xs lg:text-sm"><div className="flex items-center"><span className="w-2.5 lg:w-3 h-2.5 lg:h-3 rounded-full bg-rose-500 mr-2 lg:mr-3"></span><span className="font-semibold text-gray-600">Veteran (&gt; 20 Thn)</span></div><span className="font-bold bg-gray-100 px-2 text-gray-800 rounded">{masaKerjaStats["> 20 Thn"]}</span></div>
            </div>
          </div>
          <div className="relative w-40 h-40 lg:w-48 lg:h-48 rounded-full flex items-center justify-center shadow-lg order-1 md:order-2 shrink-0" style={{ background: totalASN > 0 ? mkGradient : "#f3f4f6" }}>
            <div className="absolute w-28 h-28 lg:w-36 lg:h-36 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
              <span className="text-2xl lg:text-3xl font-black text-gray-800">{totalASN}</span><span className="text-[9px] lg:text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mt-0.5 lg:mt-1">ASN<br />Dianalisa</span>
            </div>
          </div>
        </div>
      </div>

      {/* BARIS 5: PENSIUN, RADAR KP, KOMPOSISI STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 animate-fade-up delay-400">
        <div className="glass-card rounded-3xl shadow-sm border border-gray-100 p-6 lg:p-8">
          <h2 className="text-base lg:text-lg font-bold text-gray-800 mb-5 lg:mb-6 flex items-center"><span className="w-2.5 lg:w-3 h-5 lg:h-6 bg-rose-500 rounded-full mr-2 lg:mr-3"></span> Proyeksi Pensiun</h2>
          <div className="space-y-3 lg:space-y-4">
            {Object.entries(pensiunStats).map(([range, count], idx) => {
              const widthPct = maxPensiun > 0 ? (count / maxPensiun) * 100 : 0;
              const barColor = range === "Tahun Ini" ? "from-red-500 to-red-600" : range === "1-2 Thn" ? "from-orange-400 to-orange-500" : "from-slate-400 to-slate-500";
              const textColor = range === "Tahun Ini" ? "text-red-600" : range === "1-2 Thn" ? "text-orange-600" : "text-slate-600";
              return (
                <div key={idx}>
                  <div className="flex justify-between text-[11px] lg:text-xs mb-1 lg:mb-1.5 font-bold"><span className="text-gray-600">{range}</span><span className={textColor}>{count} Org</span></div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 lg:h-3 overflow-hidden"><div className={`h-full bg-gradient-to-r ${barColor} rounded-full animate-bar`} style={{ width: `${widthPct}%` }}></div></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card rounded-3xl shadow-sm border border-gray-100 p-6 lg:p-8 flex flex-col h-[300px] lg:h-[320px]">
          <h2 className="text-base lg:text-lg font-bold text-gray-800 mb-1 lg:mb-2 flex items-center"><span className="w-2.5 lg:w-3 h-5 lg:h-6 bg-[#15406A] rounded-full mr-2 lg:mr-3"></span> Radar Kenaikan Pangkat</h2>
          <p className="text-[10px] lg:text-[11px] text-gray-500 mb-3 lg:mb-4 border-b border-gray-100 pb-2 lg:pb-3 md:ml-5">TMT Pangkat &ge; 4 Tahun.</p>
          <div className="flex-1 overflow-y-auto space-y-2 lg:space-y-3 pr-1 lg:pr-2 scrollbar-thin">
            {kandidatKP.length > 0 ? (
              kandidatKP.map((p, idx) => (
                <div key={idx} className="bg-blue-50/50 p-2.5 lg:p-3 rounded-xl border border-blue-100 group hover:bg-blue-100 transition-colors">
                  <p className="text-xs lg:text-sm font-bold text-gray-900 truncate group-hover:text-[#15406A]">{p.nama}</p>
                  <div className="flex justify-between items-center mt-1.5 lg:mt-2">
                    <p className="text-[9px] lg:text-[10px] text-gray-500 font-bold bg-white px-1.5 lg:px-2 py-0.5 rounded shadow-sm truncate max-w-[60%]">{p.pangkat_golongan}</p>
                    <p className="text-[9px] lg:text-[10px] bg-[#15406A] text-white px-1.5 lg:px-2 py-0.5 rounded font-black shadow-sm shrink-0">{p.masaPangkat} Tahun</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400"><span className="text-[11px] lg:text-xs font-medium">Semua data KP aman.</span></div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-3xl shadow-sm border border-gray-100 p-6 lg:p-8 flex flex-col items-center justify-between md:col-span-2 lg:col-span-1">
          <h2 className="text-base lg:text-lg font-bold text-gray-800 w-full mb-4 lg:mb-6 flex items-center"><span className="w-2.5 lg:w-3 h-5 lg:h-6 bg-amber-500 rounded-full mr-2 lg:mr-3"></span> Komposisi Status</h2>
          <div className="relative w-36 h-36 lg:w-44 lg:h-44 rounded-full flex items-center justify-center shadow-lg group shrink-0" style={{ background: totalPegawai > 0 ? donutGradient : "#f3f4f6" }}>
            <div className="absolute w-24 h-24 lg:w-28 lg:h-28 bg-white rounded-full flex flex-col items-center justify-center shadow-inner group-hover:scale-95 transition-transform duration-500">
              <span className="text-2xl lg:text-3xl font-black text-[#15406A]">{totalPegawai}</span><span className="text-[9px] lg:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Total</span>
            </div>
          </div>
          <div className="mt-5 lg:mt-6 w-full flex justify-around text-center">
            <div><div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-emerald-500 mx-auto mb-1"></div><p className="text-[10px] lg:text-xs text-gray-500 font-bold">PNS</p><p className="text-sm lg:text-base font-black text-gray-800">{Math.round(pnsPct)}%</p></div>
            <div><div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-blue-500 mx-auto mb-1"></div><p className="text-[10px] lg:text-xs text-gray-500 font-bold">PPPK</p><p className="text-sm lg:text-base font-black text-gray-800">{Math.round(pppkPct)}%</p></div>
            <div><div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-amber-500 mx-auto mb-1"></div><p className="text-[10px] lg:text-xs text-gray-500 font-bold">Non ASN</p><p className="text-sm lg:text-base font-black text-gray-800">{Math.round(nonAsnPct)}%</p></div>
          </div>
        </div>
      </div>

      {/* BARIS 6: GOLONGAN & DAFTAR PENSIUN (FITUR BARU) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 animate-fade-up delay-500">
        <div className="glass-card rounded-3xl shadow-sm border border-gray-100 p-6 lg:p-8 lg:col-span-2">
          <h2 className="text-lg lg:text-xl font-bold text-gray-800 mb-6 lg:mb-8 flex items-center">
            <span className="w-2.5 lg:w-3 h-6 lg:h-8 bg-emerald-500 rounded-full mr-2 lg:mr-3"></span> Demografi Kepangkatan & Golongan
          </h2>
          <div className="flex h-48 lg:h-64 items-end space-x-1 sm:space-x-2 md:space-x-8 border-b-2 border-l-2 border-gray-100 pb-2 pl-1 lg:pl-2 relative pt-10 overflow-x-auto overflow-y-visible scrollbar-thin">
            <div className="absolute w-full border-t border-dashed border-gray-200 top-10 left-1 lg:left-2"></div>
            <div className="absolute w-full border-t border-dashed border-gray-200 top-1/2 left-1 lg:left-2"></div>
            {Object.entries(golonganStats).map(([golongan, count], index) => {
              const heightPct = maxGolongan > 0 ? (count / maxGolongan) * 100 : 0;
              return (
                <div key={index} className="flex-1 min-w-[40px] flex flex-col items-center group z-10 h-full justify-end relative">
                  <div className="absolute -top-8 lg:-top-10 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gray-800 text-white text-[10px] lg:text-xs font-bold px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg pointer-events-none transform translate-y-2 group-hover:translate-y-0 shadow-lg whitespace-nowrap z-50">
                    {count} Orang
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                  </div>
                  <div className="w-full max-w-[40px] md:max-w-[60px] lg:max-w-[80px] bg-blue-50/50 rounded-t-xl lg:rounded-t-2xl relative flex items-end group-hover:bg-blue-100 transition-colors" style={{ height: `${heightPct}%` }}>
                    <div className="w-full h-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-xl lg:rounded-t-2xl animate-bar-y group-hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-shadow"></div>
                  </div>
                  <span className="text-[10px] lg:text-xs font-black text-gray-500 mt-2 lg:mt-4 whitespace-nowrap group-hover:text-emerald-600 transition-colors">{golongan}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* FITUR BARU: DAFTAR PEGAWAI AKAN PENSIUN (WARNING) */}
        <div className="glass-card rounded-3xl shadow-sm border border-gray-100 p-6 lg:p-8 flex flex-col h-[350px] lg:h-full">
          <h2 className="text-base lg:text-lg font-bold text-gray-800 mb-1 lg:mb-2 flex items-center">
            <span className="w-2.5 lg:w-3 h-5 lg:h-6 bg-red-500 rounded-full mr-2 lg:mr-3 animate-pulse"></span> Pensiun Terdekat (Watchlist)
          </h2>
          <p className="text-[10px] lg:text-[11px] text-gray-500 mb-3 lg:mb-4 border-b border-gray-100 pb-2 lg:pb-3 md:ml-5">Pegawai purnabakti &le; 2 Tahun kedepan.</p>
          <div className="flex-1 overflow-y-auto space-y-2 lg:space-y-3 pr-1 lg:pr-2 scrollbar-thin">
            {pensiunWatchlist.length > 0 ? (
              pensiunWatchlist.map((p, idx) => (
                <div key={idx} className="bg-red-50/50 p-2.5 lg:p-3 rounded-xl border border-red-100 group hover:bg-red-100 transition-colors">
                  <p className="text-xs lg:text-sm font-bold text-gray-900 truncate group-hover:text-red-700">{p.nama}</p>
                  <div className="flex justify-between items-center mt-1.5 lg:mt-2">
                    <p className="text-[9px] lg:text-[10px] text-gray-500 font-bold bg-white px-1.5 lg:px-2 py-0.5 rounded shadow-sm truncate max-w-[60%]">{p.jabatan}</p>
                    <p className={`text-[9px] lg:text-[10px] text-white px-1.5 lg:px-2 py-0.5 rounded font-black shadow-sm shrink-0 ${p.sisaTahun <= 0 ? 'bg-red-600' : 'bg-orange-500'}`}>
                      {p.sisaTahun <= 0 ? 'Tahun Ini!' : `${p.sisaTahun} Thn Lagi`}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <span className="text-[11px] lg:text-xs font-medium text-center">Tidak ada yang pensiun<br/>dalam 2 tahun ini.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BARIS 7 & 8: MATRIKS TABEL (Horizontal Scroll) */}
      <div className="animate-fade-up delay-500 space-y-6 lg:space-y-8 mt-6 lg:mt-10">
        
        {/* TABEL FUNGSIONAL */}
        <div className="glass-card rounded-3xl shadow-lg border border-gray-200/60 p-5 lg:p-8 overflow-hidden">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl lg:text-2xl font-black text-gray-800 flex items-center">
                <span className="w-3 lg:w-4 h-6 lg:h-8 bg-purple-500 rounded-lg mr-2 lg:mr-3"></span> Peta Jabatan Fungsional (ASN)
              </h2>
              <p className="text-[11px] lg:text-sm text-gray-500 mt-1 lg:mt-2 md:ml-6">Matrix sebaran jumlah ASN berdasarkan rumpun jabatan dan jenjang keahlian.</p>
            </div>
            <div className="px-4 py-2 lg:px-6 lg:py-3 bg-purple-50 text-purple-700 font-black rounded-xl text-sm lg:text-lg border border-purple-100 shadow-sm self-start sm:self-auto whitespace-nowrap">
              Total: {colTotals["Total"]} Org
            </div>
          </div>
          <div className="overflow-x-auto pb-4 -mx-5 px-5 lg:mx-0 lg:px-0 scrollbar-thin">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
              <thead>
                <tr className="bg-gray-100/80 border-y-2 border-gray-200">
                  <th className="px-3 lg:px-5 py-3 lg:py-5 text-[10px] lg:text-xs font-black text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-100 z-20">Jenjang Jabatan</th>
                  {kategoriList.map((k) => (
                    <th key={k.key} className="px-2 lg:px-4 py-3 lg:py-5 text-[9px] lg:text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center border-l border-gray-200/50">
                      {k.label}
                    </th>
                  ))}
                  <th className="px-3 lg:px-4 py-3 lg:py-5 text-[10px] lg:text-[11px] font-black text-[#15406A] uppercase tracking-wider text-center bg-blue-100/50 border-l-2 border-blue-200">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jenjangList.map((j) => (
                  <tr key={j} className="hover:bg-purple-50/40 transition-colors group">
                    <td className="px-3 lg:px-5 py-3 lg:py-4 font-bold text-gray-700 text-xs lg:text-sm border-r border-gray-100 group-hover:text-purple-700 sticky left-0 bg-white group-hover:bg-purple-50 transition-colors z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{j}</td>
                    {kategoriList.map((k) => {
                      const val = matrixStats[j][k.key];
                      return (
                        <td key={k.key} className="px-2 lg:px-4 py-3 lg:py-4 text-center border-r border-gray-100">
                          {val > 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 lg:w-8 lg:h-8 bg-purple-100 text-purple-700 font-black rounded-md lg:rounded-lg shadow-sm transform group-hover:scale-110 transition-transform text-xs lg:text-sm">{val}</span>
                          ) : (
                            <span className="text-gray-300 font-medium">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 lg:px-4 py-3 lg:py-4 text-center font-black text-[#15406A] bg-blue-50/30 border-l-2 border-blue-100 text-sm lg:text-base">{matrixStats[j]["Total"]}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100/80 border-t-4 border-gray-200">
                  <td className="px-3 lg:px-5 py-3 lg:py-5 font-black text-gray-800 uppercase text-[10px] lg:text-xs border-r border-gray-200 sticky left-0 bg-gray-100 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Total Kolom</td>
                  {kategoriList.map((k) => (
                    <td key={k.key} className="px-2 lg:px-4 py-3 lg:py-5 text-center font-black text-gray-700 text-sm lg:text-base border-r border-gray-200">
                      {colTotals[k.key] > 0 ? colTotals[k.key] : "-"}
                    </td>
                  ))}
                  <td className="px-3 lg:px-4 py-3 lg:py-5 text-center font-black text-white bg-[#15406A] text-lg lg:text-xl shadow-inner">{colTotals["Total"]}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* TABEL PELAKSANA (Sesuai Referensi Gambar Anda) */}
        <div className="glass-card rounded-3xl shadow-lg border border-gray-200/60 p-5 lg:p-8 overflow-hidden mb-6 lg:mb-10">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl lg:text-2xl font-black text-gray-800 flex items-center">
                <span className="w-3 lg:w-4 h-6 lg:h-8 bg-orange-500 rounded-lg mr-2 lg:mr-3"></span> Peta Jabatan Pelaksana (PNS)
              </h2>
              <p className="text-[11px] lg:text-sm text-gray-500 mt-1 lg:mt-2 md:ml-6">Komparasi jumlah pengemban jabatan fungsional umum (Pusat vs Satuan Pelayanan).</p>
            </div>
            <div className="px-4 py-2 lg:px-6 lg:py-3 bg-orange-50 text-orange-700 font-black rounded-xl text-sm lg:text-lg border border-orange-100 shadow-sm self-start sm:self-auto whitespace-nowrap">
              Total: {totalPelaksanaKeseluruhan} Org
            </div>
          </div>
          <div className="overflow-x-auto pb-4 -mx-5 px-5 lg:mx-0 lg:px-0 scrollbar-thin">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[700px]">
              <thead>
                <tr className="bg-gray-100/80 border-y-2 border-gray-200">
                  <th className="px-3 lg:px-5 py-3 lg:py-5 text-[10px] lg:text-xs font-black text-gray-600 uppercase tracking-wider text-center w-12 sticky left-0 bg-gray-100 z-20">No</th>
                  <th className="px-3 lg:px-5 py-3 lg:py-5 text-[10px] lg:text-xs font-black text-gray-600 uppercase tracking-wider sticky left-12 bg-gray-100 z-20 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Jabatan Pelaksana</th>
                  <th className="px-3 lg:px-4 py-3 lg:py-5 text-[10px] lg:text-[11px] font-black text-[#15406A] uppercase tracking-wider text-center bg-blue-100/50 border-r border-blue-200">Jumlah ASN setiap Jabatan Pelaksana</th>
                  <th className="px-2 lg:px-4 py-3 lg:py-5 text-[9px] lg:text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center border-r border-gray-200/50">Jumlah ASN di Satpel</th>
                  <th className="px-2 lg:px-4 py-3 lg:py-5 text-[9px] lg:text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center border-r border-gray-200/50">Jumlah ASN di BBPVP Makassar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pelaksanaList.map((jab, index) => (
                  <tr key={jab} className="hover:bg-orange-50/40 transition-colors group">
                    <td className="px-3 lg:px-5 py-3 lg:py-4 text-center font-bold text-gray-700 text-xs lg:text-sm border-r border-gray-100 sticky left-0 bg-white group-hover:bg-orange-50 transition-colors z-20">{index + 1}</td>
                    <td className="px-3 lg:px-5 py-3 lg:py-4 font-bold text-gray-700 text-xs lg:text-sm border-r border-gray-100 group-hover:text-orange-700 sticky left-12 bg-white group-hover:bg-orange-50 transition-colors z-20 whitespace-normal min-w-[200px] lg:min-w-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{jab}</td>
                    
                    <td className="px-3 lg:px-4 py-3 lg:py-4 text-center font-black text-[#15406A] bg-blue-50/30 border-r border-blue-100 text-sm lg:text-base">{pelaksanaStats[jab].total}</td>
                    
                    <td className="px-2 lg:px-4 py-3 lg:py-4 text-center border-r border-gray-100">
                      {pelaksanaStats[jab].satpel > 0 ? (
                        <span className="inline-block bg-orange-100 text-orange-700 font-black px-3 py-1 lg:px-4 lg:py-1.5 rounded-lg shadow-sm text-xs lg:text-sm transform group-hover:scale-110 transition-transform">{pelaksanaStats[jab].satpel}</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    
                    <td className="px-2 lg:px-4 py-3 lg:py-4 text-center border-r border-gray-100">
                      {pelaksanaStats[jab].pusat > 0 ? (
                        <span className="inline-block bg-gray-200 text-gray-800 font-black px-3 py-1 lg:px-4 lg:py-1.5 rounded-lg shadow-sm text-xs lg:text-sm transform group-hover:scale-110 transition-transform">{pelaksanaStats[jab].pusat}</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100/80 border-t-4 border-gray-200">
                  <td colSpan={2} className="px-3 lg:px-5 py-3 lg:py-5 font-black text-gray-800 uppercase text-[10px] lg:text-xs border-r border-gray-200 text-center sticky left-0 bg-gray-100 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Total</td>
                  <td className="px-3 lg:px-4 py-3 lg:py-5 text-center font-black text-white bg-[#15406A] text-lg lg:text-xl shadow-inner border-r border-blue-200">{totalPelaksanaKeseluruhan}</td>
                  <td className="px-2 lg:px-4 py-3 lg:py-5 text-center font-black text-orange-700 text-sm lg:text-base border-r border-gray-200">{totalPelaksanaSatpel > 0 ? totalPelaksanaSatpel : "-"}</td>
                  <td className="px-2 lg:px-4 py-3 lg:py-5 text-center font-black text-gray-700 text-sm lg:text-base border-r border-gray-200">{totalPelaksanaPusat > 0 ? totalPelaksanaPusat : "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}