import { neon } from "@neondatabase/serverless";
import Link from "next/link";

export const revalidate = 0;

export default async function DashboardPage() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT * FROM data_pegawai ORDER BY created_at DESC`;
  const currentYear = new Date().getFullYear();

  // --- 1. IDENTIFIKASI SATPEL DAERAH ---
  const satpelDaerah = ["SATPEL Mamuju", "SATPEL Majene", "SATPEL Palu"];

  // --- 2. KALKULASI STATISTIK UTAMA ---
  const totalPegawai = rows.length;
  const pegawaiSatpelDaerah = rows.filter((p) => satpelDaerah.includes(p.bidang)).length;
  const pegawaiBBPVP = totalPegawai - pegawaiSatpelDaerah; // BBPVP Pusat (termasuk SATPEL Induk)

  const totalPNS = rows.filter((p) => p.status_kepegawaian === "PNS").length;
  const totalPPPK = rows.filter((p) => p.status_kepegawaian === "PPPK").length;
  const totalNonASN = rows.filter((p) => p.status_kepegawaian === "Non ASN").length;
  
  const pnsSatpelDaerah = rows.filter((p) => p.status_kepegawaian === "PNS" && satpelDaerah.includes(p.bidang)).length;
  const pnsBbpvpPusat = totalPNS - pnsSatpelDaerah;

  const pnsPct = totalPegawai > 0 ? (totalPNS / totalPegawai) * 100 : 0;
  const pppkPct = totalPegawai > 0 ? (totalPPPK / totalPegawai) * 100 : 0;
  const nonAsnPct = totalPegawai > 0 ? (totalNonASN / totalPegawai) * 100 : 0;
  const donutGradient = `conic-gradient(#10b981 0% ${pnsPct}%, #3b82f6 ${pnsPct}% ${pnsPct + pppkPct}%, #f59e0b ${pnsPct + pppkPct}% 100%)`;

  // --- 3. ANALITIK HR (Umur, Pensiun, KP, Generasi, Masa Kerja, Gender, Pendidikan & Cuti) ---
  const usiaStats = { "< 30 Thn": 0, "31-40 Thn": 0, "41-50 Thn": 0, "> 50 Thn": 0 };
  const pensiunStats = { "Tahun Ini": 0, "1-2 Thn": 0, "3-5 Thn": 0, "> 5 Thn": 0 };
  const generasiStats = { "Baby Boomer": 0, "Gen X": 0, Milenial: 0, "Gen Z": 0 };
  const masaKerjaStats = { "< 5 Thn": 0, "5-10 Thn": 0, "11-20 Thn": 0, "> 20 Thn": 0 };
  const genderStats = { "Laki-Laki": 0, "Perempuan": 0 };
  const eduStats = { "S3 (Doktoral)": 0, "S2 (Magister)": 0, "S1 / D4": 0, "D1 - D3": 0, "SMA / Umum": 0 };
  
  // Analitik Cuti (Fitur Baru)
  const cutiStats = { "0-3 Hari (Kritis)": 0, "4-6 Hari (Menipis)": 0, "7-12 Hari (Aman)": 0, "> 12 Hari (Wajib Cuti)": 0 };
  let totalCutiSeluruh = 0;
  const cutiWatchlist: { nama: string; jabatan: string; totalCuti: number }[] = [];

  const kandidatKP: { nama: string; pangkat_golongan: string; masaPangkat: number }[] = [];
  const pensiunWatchlist: { nama: string; jabatan: string; sisaTahun: number }[] = [];

  rows.forEach((p) => {
    // Analitik Tanggal Lahir (Umur, Generasi, Pensiun)
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

    // Analitik NIP (Masa Kerja, Gender, Radar KP)
    if (p.status_kepegawaian === "PNS" || p.status_kepegawaian === "PPPK") {
      const nipClean = p.nip ? p.nip.replace(/\D/g, "") : "";
      if (nipClean.length >= 15) {
        const thnMasuk = parseInt(nipClean.substring(8, 12));
        const masaKerja = currentYear - thnMasuk;
        if (masaKerja < 5) masaKerjaStats["< 5 Thn"]++;
        else if (masaKerja <= 10) masaKerjaStats["5-10 Thn"]++;
        else if (masaKerja <= 20) masaKerjaStats["11-20 Thn"]++;
        else masaKerjaStats["> 20 Thn"]++;

        const genderCode = nipClean.charAt(14);
        if (genderCode === '1') genderStats["Laki-Laki"]++;
        else if (genderCode === '2') genderStats["Perempuan"]++;
      }

      if (p.status_kepegawaian === "PNS" && p.tmt_pangkat_terakhir) {
        const masaPangkat = currentYear - new Date(p.tmt_pangkat_terakhir).getFullYear();
        if (masaPangkat >= 4) kandidatKP.push({ nama: p.nama as string, pangkat_golongan: p.pangkat_golongan as string, masaPangkat });
      }
    }

    // Analitik Pendidikan
    const nameUpper = (p.nama || "").toUpperCase();
    if (nameUpper.includes("DR. ") || nameUpper.startsWith("DR.") || nameUpper.includes("PH.D")) eduStats["S3 (Doktoral)"]++;
    else if (nameUpper.includes(", M.") || nameUpper.includes(",M.")) eduStats["S2 (Magister)"]++;
    else if (nameUpper.includes(", S.") || nameUpper.includes(",S.") || nameUpper.includes("S.ST") || nameUpper.includes("S.TR")) eduStats["S1 / D4"]++;
    else if (nameUpper.includes("A.MD") || nameUpper.includes("A.MA")) eduStats["D1 - D3"]++;
    else eduStats["SMA / Umum"]++;

    // Analitik Cuti
    const sisaLalu = p.sisa_cuti_tahun_lalu || 0;
    const tahunIni = p.cuti_tahun_ini || 0;
    const totalCuti = sisaLalu + tahunIni;
    totalCutiSeluruh += totalCuti;

    if (totalCuti <= 3) cutiStats["0-3 Hari (Kritis)"]++;
    else if (totalCuti <= 6) cutiStats["4-6 Hari (Menipis)"]++;
    else if (totalCuti <= 12) cutiStats["7-12 Hari (Aman)"]++;
    else {
      cutiStats["> 12 Hari (Wajib Cuti)"]++;
      cutiWatchlist.push({ nama: p.nama as string, jabatan: p.jabatan as string, totalCuti });
    }
  });

  pensiunWatchlist.sort((a, b) => a.sisaTahun - b.sisaTahun);
  cutiWatchlist.sort((a, b) => b.totalCuti - a.totalCuti); // Descending (Paling banyak sisa cuti di atas)

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
  const maxCuti = Math.max(...Object.values(cutiStats), 1);
  const totalASN = totalPNS + totalPPPK;
  const avgCuti = totalPegawai > 0 ? Math.round(totalCutiSeluruh / totalPegawai) : 0;
  const mkGradient = `conic-gradient(#8b5cf6 0% ${(masaKerjaStats["< 5 Thn"] / totalASN) * 100}%, #ec4899 ${(masaKerjaStats["< 5 Thn"] / totalASN) * 100}% ${((masaKerjaStats["< 5 Thn"] + masaKerjaStats["5-10 Thn"]) / totalASN) * 100}%, #14b8a6 ${((masaKerjaStats["< 5 Thn"] + masaKerjaStats["5-10 Thn"]) / totalASN) * 100}% ${((totalASN - masaKerjaStats["> 20 Thn"]) / totalASN) * 100}%, #f43f5e ${((totalASN - masaKerjaStats["> 20 Thn"]) / totalASN) * 100}% 100%)`;

  // --- 4. MATRIKS JABATAN FUNGSIONAL ---
  const jenjangList = ["Ahli Utama", "Ahli Madya", "Ahli Muda", "Ahli Pertama", "Mahir", "Terampil"];
  const kategoriList = [{ key: "Instruktur", label: "Instruktur" }, { key: "SDM", label: "Analis SDM" }, { key: "PengantarKerja", label: "Pengantar Kerja" }, { key: "Perencana", label: "Perencana" }, { key: "Arsiparis", label: "Arsiparis" }, { key: "Prakom", label: "Pranata Komputer" }, { key: "Keuangan", label: "Keuangan APBN" }, { key: "Barang", label: "Penata Laksana Barang" }];
  const matrixStats: Record<string, Record<string, number>> = {};
  jenjangList.forEach((j) => { matrixStats[j] = {}; kategoriList.forEach((k) => (matrixStats[j][k.key] = 0)); matrixStats[j]["Total"] = 0; });
  const colTotals: Record<string, number> = {}; kategoriList.forEach((k) => (colTotals[k.key] = 0)); colTotals["Total"] = 0;

  // --- 5. MATRIKS PELAKSANA ---
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
      if (satpelDaerah.includes(p.bidang)) {
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
    <div className="p-4 md:p-6 lg:p-10 max-w-7xl mx-auto space-y-6 lg:space-y-8 bg-slate-50/50 min-h-screen">
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-up { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .delay-100 { animation-delay: 0.1s; } .delay-200 { animation-delay: 0.2s; } .delay-300 { animation-delay: 0.3s; } .delay-400 { animation-delay: 0.4s; } .delay-500 { animation-delay: 0.5s; } .delay-600 { animation-delay: 0.6s; }
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

      {/* BARIS 1: 5 KARTU METRIK UTAMA (Diperbarui) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-5 animate-fade-up delay-100">
        
        <div className="bg-gradient-to-br from-slate-800 to-black p-4 lg:p-6 rounded-3xl shadow-xl text-white relative overflow-hidden group col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700"></div>
          <p className="text-gray-300 font-bold tracking-wider text-[9px] lg:text-[10px] mb-1 uppercase">Seluruh Pegawai</p>
          <h3 className="text-3xl lg:text-4xl font-black mb-2">{totalPegawai}</h3>
          <p className="text-[10px] text-gray-400">Total Keseluruhan</p>
        </div>

        <div className="bg-gradient-to-br from-[#15406A] to-blue-900 p-4 lg:p-6 rounded-3xl shadow-xl text-white relative overflow-hidden group col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/20 rounded-full blur-2xl -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700"></div>
          <p className="text-blue-200 font-bold tracking-wider text-[9px] lg:text-[10px] mb-1 uppercase">BBPVP Pusat</p>
          <h3 className="text-3xl lg:text-4xl font-black mb-2">{pegawaiBBPVP}</h3>
          <p className="text-[10px] text-blue-300">Termasuk SATPEL Induk</p>
        </div>

        <div className="glass-card p-4 lg:p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div><p className="text-gray-400 font-bold tracking-wider text-[9px] lg:text-[10px] mb-1 uppercase">Total PNS</p><h3 className="text-2xl lg:text-3xl font-black text-gray-800">{totalPNS}</h3></div>
          <div className="space-y-1.5 pt-3 border-t border-gray-100 mt-2">
            <div className="flex justify-between text-[9px] lg:text-[10px] font-bold text-gray-500"><span>BBPVP Pusat</span><span className="text-emerald-600">{pnsBbpvpPusat} Org</span></div>
            <div className="flex justify-between text-[9px] lg:text-[10px] font-bold text-gray-500"><span>Satpel Daerah</span><span className="text-emerald-600">{pnsSatpelDaerah} Org</span></div>
          </div>
        </div>

        <div className="glass-card p-4 lg:p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-blue-300 transition-all flex flex-col justify-between">
          <div><p className="text-gray-400 font-bold tracking-wider text-[9px] lg:text-[10px] mb-1 uppercase">Total PPPK</p><h3 className="text-2xl lg:text-3xl font-black text-gray-800">{totalPPPK}</h3></div>
          <div className="mt-2"><div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5 overflow-hidden"><div className="bg-blue-500 h-full rounded-full" style={{ width: `${pppkPct}%` }}></div></div><p className="text-[9px] lg:text-[10px] text-gray-500 font-bold">{Math.round(pppkPct)}% dr. Total</p></div>
        </div>

        <div className="glass-card p-4 lg:p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-amber-300 transition-all flex flex-col justify-between col-span-2 lg:col-span-1">
          <div><p className="text-gray-400 font-bold tracking-wider text-[9px] lg:text-[10px] mb-1 uppercase">Total Non ASN</p><h3 className="text-2xl lg:text-3xl font-black text-gray-800">{totalNonASN}</h3></div>
          <div className="mt-2"><div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5 overflow-hidden"><div className="bg-amber-500 h-full rounded-full" style={{ width: `${nonAsnPct}%` }}></div></div><p className="text-[9px] lg:text-[10px] text-gray-500 font-bold">{Math.round(nonAsnPct)}% dr. Total</p></div>
        </div>
      </div>

      {/* BARIS 2: ANALISIS GENERASI (STACKED BAR) */}
      <div className="animate-fade-up delay-200 glass-card p-5 md:p-8 rounded-3xl shadow-sm border border-gray-100 group">
        <div className="flex flex-col mb-4 lg:mb-6">
          <h2 className="text-lg lg:text-xl font-bold text-gray-800 flex items-center"><span className="w-2 lg:w-3 h-6 lg:h-8 bg-indigo-500 rounded-full mr-2 lg:mr-3"></span> Peta Generasi Pegawai (Diversity)</h2>
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

      {/* BARIS 3: PENDIDIKAN & GENDER ASN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 animate-fade-up delay-300">
        <div className="glass-card rounded-3xl shadow-sm border border-gray-100 p-6 lg:p-8">
          <h2 className="text-base lg:text-lg font-bold text-gray-800 mb-2 flex items-center"><span className="w-2.5 lg:w-3 h-5 lg:h-6 bg-cyan-500 rounded-full mr-2 lg:mr-3"></span> Tingkat Pendidikan</h2>
          <p className="text-[10px] lg:text-xs text-gray-500 mb-5 lg:mb-8 md:ml-5">Dianalisa otomatis dari gelar akademik nama pegawai.</p>
          <div className="space-y-3 lg:space-y-4">
            {Object.entries(eduStats).map(([range, count], idx) => {
              const widthPct = maxEdu > 0 ? (count / maxEdu) * 100 : 0;
              return (
                <div key={idx} className="group relative">
                  <div className="flex justify-between text-xs lg:text-sm mb-1 lg:mb-1.5 font-bold"><span className="text-gray-600">{range}</span><span className="text-cyan-700">{count} Org</span></div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 lg:h-3 overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full animate-bar" style={{ width: `${widthPct}%` }}></div></div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="glass-card rounded-3xl shadow-sm border border-gray-100 p-6 lg:p-8 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-100 rounded-full blur-3xl -translate-y-10 translate-x-10 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl translate-y-10 -translate-x-10 pointer-events-none"></div>
          <h2 className="text-base lg:text-lg font-bold text-gray-800 w-full mb-1 flex items-center relative z-10"><span className="w-2.5 lg:w-3 h-5 lg:h-6 bg-violet-500 rounded-full mr-2 lg:mr-3"></span> Rasio Gender (ASN)</h2>
          <p className="text-[10px] lg:text-xs text-gray-500 mb-6 lg:mb-8 w-full md:ml-5 relative z-10">Dianalisa dari digit NIP. Tidak termasuk Non-ASN.</p>
          <div className="flex justify-center items-center w-full gap-4 lg:gap-10 relative z-10">
            <div className="flex flex-col items-center p-4 bg-white/60 backdrop-blur rounded-2xl border border-blue-100 shadow-sm w-1/2 group hover:border-blue-300 transition-colors">
              <div className="w-10 h-10 lg:w-14 lg:h-14 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><svg className="w-6 h-6 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Laki-Laki</p>
              <p className="text-3xl lg:text-4xl font-black text-blue-600 mt-1">{genderStats["Laki-Laki"]}</p>
              <p className="text-[10px] font-bold text-blue-400 mt-1 bg-blue-50 px-2 py-0.5 rounded">{totalASN > 0 ? Math.round((genderStats["Laki-Laki"]/totalASN)*100) : 0}%</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-white/60 backdrop-blur rounded-2xl border border-pink-100 shadow-sm w-1/2 group hover:border-pink-300 transition-colors">
              <div className="w-10 h-10 lg:w-14 lg:h-14 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><svg className="w-6 h-6 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Perempuan</p>
              <p className="text-3xl lg:text-4xl font-black text-pink-600 mt-1">{genderStats["Perempuan"]}</p>
              <p className="text-[10px] font-bold text-pink-400 mt-1 bg-pink-50 px-2 py-0.5 rounded">{totalASN > 0 ? Math.round((genderStats["Perempuan"]/totalASN)*100) : 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* BARIS 4: ANALITIK HR (Umur & Masa Kerja) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 animate-fade-up delay-400">
        <div className="glass-card rounded-3xl shadow-sm border border-gray-100 p-6 lg:p-8">
          <h2 className="text-base lg:text-lg font-bold text-gray-800 mb-5 lg:mb-8 flex items-center"><span className="w-2.5 lg:w-3 h-5 lg:h-6 bg-teal-500 rounded-full mr-2 lg:mr-3"></span> Piramida Usia Pegawai</h2>
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
              <div className="flex justify-between items-center text-xs lg:text-sm"><div className="flex items-center"><span className="w-2.5 lg:w-3 h-2.5 lg:h-3 rounded-full bg-purple-500 mr-2 lg:mr-3"></span><span className="font-semibold text-gray-600">Baru (0-5 Thn)</span></div><span className="font-bold bg-gray-100 px-2 rounded">{masaKerjaStats["< 5 Thn"]}</span></div>
              <div className="flex justify-between items-center text-xs lg:text-sm"><div className="flex items-center"><span className="w-2.5 lg:w-3 h-2.5 lg:h-3 rounded-full bg-pink-500 mr-2 lg:mr-3"></span><span className="font-semibold text-gray-600">Berkembang (5-10 Thn)</span></div><span className="font-bold bg-gray-100 px-2 rounded">{masaKerjaStats["5-10 Thn"]}</span></div>
              <div className="flex justify-between items-center text-xs lg:text-sm"><div className="flex items-center"><span className="w-2.5 lg:w-3 h-2.5 lg:h-3 rounded-full bg-teal-500 mr-2 lg:mr-3"></span><span className="font-semibold text-gray-600">Senior (11-20 Thn)</span></div><span className="font-bold bg-gray-100 px-2 rounded">{masaKerjaStats["11-20 Thn"]}</span></div>
              <div className="flex justify-between items-center text-xs lg:text-sm"><div className="flex items-center"><span className="w-2.5 lg:w-3 h-2.5 lg:h-3 rounded-full bg-rose-500 mr-2 lg:mr-3"></span><span className="font-semibold text-gray-600">Veteran (&gt; 20 Thn)</span></div><span className="font-bold bg-gray-100 px-2 rounded">{masaKerjaStats["> 20 Thn"]}</span></div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 animate-fade-up delay-500">
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

      {/* BARIS 6: ANALITIK CUTI (FITUR BARU) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 animate-fade-up delay-500">
        <div className="glass-card rounded-3xl shadow-sm border border-gray-100 p-6 lg:p-8 lg:col-span-2">
          <div className="flex justify-between items-end mb-5 lg:mb-8">
            <div>
              <h2 className="text-lg lg:text-xl font-bold text-gray-800 flex items-center">
                <span className="w-2.5 lg:w-3 h-6 lg:h-8 bg-sky-500 rounded-full mr-2 lg:mr-3"></span> Distribusi Hak Cuti Pegawai
              </h2>
              <p className="text-xs lg:text-sm text-gray-500 mt-1 md:ml-5">Kalkulasi total sisa cuti (Tahun Lalu + Tahun Ini).</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Rata-Rata Sisa Cuti</p>
              <p className="text-xl font-black text-sky-600">{avgCuti} Hari</p>
            </div>
          </div>
          <div className="space-y-4">
            {Object.entries(cutiStats).map(([range, count], idx) => {
              const widthPct = maxCuti > 0 ? (count / maxCuti) * 100 : 0;
              const barColor = range.includes("Kritis") ? "from-red-400 to-red-600" : range.includes("Menipis") ? "from-orange-400 to-orange-500" : range.includes("Aman") ? "from-emerald-400 to-emerald-500" : "from-sky-400 to-sky-600";
              const textColor = range.includes("Kritis") ? "text-red-600" : range.includes("Menipis") ? "text-orange-600" : range.includes("Aman") ? "text-emerald-600" : "text-sky-600";
              return (
                <div key={idx}>
                  <div className="flex justify-between text-xs lg:text-sm mb-1 lg:mb-1.5 font-bold"><span className="text-gray-600">{range}</span><span className={textColor}>{count} Org</span></div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden"><div className={`h-full bg-gradient-to-r ${barColor} rounded-full animate-bar`} style={{ width: `${widthPct}%` }}></div></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card rounded-3xl shadow-sm border border-gray-100 p-6 lg:p-8 flex flex-col h-[350px] lg:h-full">
          <h2 className="text-base lg:text-lg font-bold text-gray-800 mb-1 lg:mb-2 flex items-center">
            <span className="w-2.5 lg:w-3 h-5 lg:h-6 bg-yellow-500 rounded-full mr-2 lg:mr-3"></span> Pegawai Kurang Piknik
          </h2>
          <p className="text-[10px] lg:text-[11px] text-gray-500 mb-3 lg:mb-4 border-b border-gray-100 pb-2 lg:pb-3 md:ml-5">Sisa Cuti &gt; 12 Hari. Disarankan mengambil cuti.</p>
          <div className="flex-1 overflow-y-auto space-y-2 lg:space-y-3 pr-1 lg:pr-2 scrollbar-thin">
            {cutiWatchlist.length > 0 ? (
              cutiWatchlist.slice(0, 15).map((p, idx) => (
                <div key={idx} className="bg-sky-50/50 p-2.5 lg:p-3 rounded-xl border border-sky-100 group hover:bg-sky-100 transition-colors">
                  <p className="text-xs lg:text-sm font-bold text-gray-900 truncate group-hover:text-sky-700">{p.nama}</p>
                  <div className="flex justify-between items-center mt-1.5 lg:mt-2">
                    <p className="text-[9px] lg:text-[10px] text-gray-500 font-bold bg-white px-1.5 lg:px-2 py-0.5 rounded shadow-sm truncate max-w-[60%]">{p.jabatan}</p>
                    <p className={`text-[9px] lg:text-[10px] text-white px-1.5 lg:px-2 py-0.5 rounded font-black shadow-sm shrink-0 bg-sky-600`}>{p.totalCuti} Hari</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <span className="text-[11px] lg:text-xs font-medium text-center">Semua pegawai sudah<br/>mengambil hak cutinya.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BARIS 7: GOLONGAN & DAFTAR PENSIUN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 animate-fade-up delay-600">
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

      {/* BARIS 8 & 9: MATRIKS TABEL */}
      <div className="animate-fade-up delay-600 space-y-6 lg:space-y-8 mt-6 lg:mt-10">
        
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

        {/* TABEL PELAKSANA */}
        <div className="glass-card rounded-3xl shadow-lg border border-gray-200/60 p-5 lg:p-8 overflow-hidden mb-6 lg:mb-10">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl lg:text-2xl font-black text-gray-800 flex items-center">
                <span className="w-3 lg:w-4 h-6 lg:h-8 bg-orange-500 rounded-lg mr-2 lg:mr-3"></span> Peta Jabatan Pelaksana (PNS)
              </h2>
              <p className="text-[11px] lg:text-sm text-gray-500 mt-1 lg:mt-2 md:ml-6">Sesuai dengan pemetaan struktur unit kerja organisasi.</p>
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