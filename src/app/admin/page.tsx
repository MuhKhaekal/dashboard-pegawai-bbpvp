import { neon } from '@neondatabase/serverless';
import Link from 'next/link';

export const revalidate = 0; 

export default async function DashboardPage() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT * FROM data_pegawai ORDER BY created_at DESC`;

  // --- 1. KALKULASI STATISTIK UTAMA ---
  const totalPegawai = rows.length;
  const totalPNS = rows.filter(p => p.status_kepegawaian === 'PNS').length;
  const totalPPPK = rows.filter(p => p.status_kepegawaian === 'PPPK').length;
  const totalNonASN = rows.filter(p => p.status_kepegawaian === 'Non ASN').length;

  // --- 2. KALKULASI GRAFIK DONAT (Persentase Status) ---
  const pnsPct = totalPegawai > 0 ? (totalPNS / totalPegawai) * 100 : 0;
  const pppkPct = totalPegawai > 0 ? (totalPPPK / totalPegawai) * 100 : 0;
  const nonAsnPct = totalPegawai > 0 ? (totalNonASN / totalPegawai) * 100 : 0;
  // CSS Conic Gradient string untuk membentuk potongan kue/donat
  const donutGradient = `conic-gradient(#10b981 0% ${pnsPct}%, #3b82f6 ${pnsPct}% ${pnsPct + pppkPct}%, #f59e0b ${pnsPct + pppkPct}% 100%)`;

  // --- 3. KALKULASI GRAFIK BATANG HORIZONTAL (Top 5 Unit Kerja) ---
  const distribusiBidang: Record<string, number> = {};
  rows.forEach(p => {
    const bidang = p.bidang.replace('-- ', ''); 
    distribusiBidang[bidang] = (distribusiBidang[bidang] || 0) + 1;
  });
  const topBidang = Object.entries(distribusiBidang)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // --- 4. KALKULASI GRAFIK BATANG VERTIKAL (Demografi Golongan) ---
  const golonganStats = { 'Gol I': 0, 'Gol II': 0, 'Gol III': 0, 'Gol IV': 0, 'Lainnya': 0 };
  rows.forEach(p => {
    if (p.pangkat_golongan.startsWith('I/')) golonganStats['Gol I']++;
    else if (p.pangkat_golongan.startsWith('II/')) golonganStats['Gol II']++;
    else if (p.pangkat_golongan.startsWith('III/')) golonganStats['Gol III']++;
    else if (p.pangkat_golongan.startsWith('IV/')) golonganStats['Gol IV']++;
    else golonganStats['Lainnya']++;
  });
  // Cari nilai tertinggi untuk menentukan tinggi 100% pada grafik
  const maxGolongan = Math.max(...Object.values(golonganStats), 1); 

  // --- 5. DATA TERBARU ---
  const pegawaiTerbaru = rows.slice(0, 5);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-up { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        
        /* Animasi khusus untuk grafik batang vertikal agar tumbuh dari bawah */
        @keyframes growUp { from { height: 0; } }
        .animate-grow { animation: growUp 1s ease-out forwards; }
      `}</style>

      {/* HEADER DASHBOARD */}
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
            <p className="text-xs text-blue-300 mt-4 flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              <span>Keseluruhan data aktif</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-emerald-200 transition-colors">
          <p className="text-gray-400 font-bold tracking-wider text-sm mb-1 uppercase">PNS</p>
          <h3 className="text-4xl font-black text-gray-800">{totalPNS}</h3>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
              {Math.round(pnsPct)}% dari total
            </p>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-blue-200 transition-colors">
          <p className="text-gray-400 font-bold tracking-wider text-sm mb-1 uppercase">PPPK</p>
          <h3 className="text-4xl font-black text-gray-800">{totalPPPK}</h3>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
              {Math.round(pppkPct)}% dari total
            </p>
            <div className="p-2 bg-blue-50 rounded-xl text-blue-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-amber-200 transition-colors">
          <p className="text-gray-400 font-bold tracking-wider text-sm mb-1 uppercase">Non ASN</p>
          <h3 className="text-4xl font-black text-gray-800">{totalNonASN}</h3>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">
              {Math.round(nonAsnPct)}% dari total
            </p>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg></div>
          </div>
        </div>
      </div>

      {/* BARIS 2: 2 GRAFIK (HORIZONTAL BAR & DONUT CHART) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up delay-200">
        
        {/* GRAFIK KIRI: UNIT KERJA (Lebar 2 Kolom) */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-8 flex items-center"><span className="w-3 h-8 bg-blue-500 rounded-full mr-3"></span> Distribusi Top 5 Unit Kerja</h2>
          
          <div className="space-y-6">
            {topBidang.map(([namaBidang, jumlah], index) => {
              const persentase = totalPegawai > 0 ? Math.round((jumlah / totalPegawai) * 100) : 0;
              return (
                <div key={index} className="group">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-bold text-gray-700">{namaBidang}</span>
                    <span className="font-bold text-[#15406A]">{jumlah} Org <span className="text-gray-400 font-medium">({persentase}%)</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden relative">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#15406A] to-blue-400 rounded-full transition-all duration-1000 ease-out animate-grow" 
                      style={{ width: `${persentase}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {topBidang.length === 0 && <div className="text-center py-6 text-gray-400">Belum ada data.</div>}
          </div>
        </div>

        {/* GRAFIK KANAN: STATUS KEPEGAWAIAN DONUT CHART (Lebar 1 Kolom) */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col items-center">
          <h2 className="text-lg font-bold text-gray-800 mb-6 self-start flex items-center"><span className="w-3 h-6 bg-amber-500 rounded-full mr-3"></span> Komposisi Status</h2>
          
          {/* CSS Donut Chart */}
          <div className="relative w-48 h-48 rounded-full flex items-center justify-center shadow-inner" style={{ background: totalPegawai > 0 ? donutGradient : '#f3f4f6' }}>
            {/* Lubang Putih di Tengah (Agar jadi Donat, bukan Pie) */}
            <div className="absolute w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
              <span className="text-3xl font-black text-[#15406A]">{totalPegawai}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</span>
            </div>
          </div>

          {/* Keterangan Warna (Legend) */}
          <div className="mt-8 w-full space-y-3">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></span><span className="font-semibold text-gray-600">PNS</span></div>
              <span className="font-bold">{Math.round(pnsPct)}%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span><span className="font-semibold text-gray-600">PPPK</span></div>
              <span className="font-bold">{Math.round(pppkPct)}%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-amber-500 mr-2"></span><span className="font-semibold text-gray-600">Non ASN</span></div>
              <span className="font-bold">{Math.round(nonAsnPct)}%</span>
            </div>
          </div>
        </div>

      </div>

      {/* BARIS 3: GRAFIK KOLOM & DATA TERBARU */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up delay-300">
        
        {/* GRAFIK KIRI: COLUMN CHART KEPANGKATAN (Lebar 2 Kolom) */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-8 flex items-center"><span className="w-3 h-8 bg-emerald-500 rounded-full mr-3"></span> Demografi Kepangkatan & Golongan</h2>
          
          {/* Sumbu Y & Bar Area */}
          <div className="flex h-56 items-end space-x-2 md:space-x-6 border-b border-l border-gray-100 pb-2 pl-2 relative">
            
            {/* Garis Bantu Pembantu Sumbu Y */}
            <div className="absolute w-full border-t border-dashed border-gray-800 top-0 left-2"></div>
            <div className="absolute w-full border-t border-dashed border-gray-800 top-1/2 left-2"></div>

            {Object.entries(golonganStats).map(([golongan, count], index) => {
              const heightPct = maxGolongan > 0 ? (count / maxGolongan) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center group z-10">
                  {/* Tooltip Angka yang muncul saat hover */}
                  <span className="text-xs font-bold text-[#15406A] opacity-0 group-hover:opacity-100 transition-opacity mb-2 bg-blue-500 px-2 py-1 rounded">
                    {count} Org
                  </span>
                  
                  {/* Tiang Bar Vertikal */}
                  <div className="w-full max-w-[60px] bg-blue-500 rounded-t-xl relative h-full flex items-end overflow-hidden">
                    <div 
                      className="w-full bg-gradient-to-t from-[#15406A] to-blue-400 rounded-t-xl transition-all duration-1000 ease-out animate-grow"
                      style={{ height: `${heightPct}%` }}
                    ></div>
                  </div>
                  
                  {/* Label Bawah (Sumbu X) */}
                  <span className="text-xs font-bold text-gray-500 mt-3 whitespace-nowrap">{golongan}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* BAGIAN KANAN: AKTIVITAS TERBARU (Lebar 1 Kolom) */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800">Pegawai Terbaru</h2>
            <Link href="/admin/data-pegawai" className="text-xs font-bold text-[#15406A] bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">Kelola</Link>
          </div>
          
          <div className="space-y-4">
            {pegawaiTerbaru.map((p) => (
              <div key={p.id} className="flex items-center space-x-4 p-2.5 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#15406A] to-blue-800 flex items-center justify-center font-bold text-white shadow-sm text-sm">
                  {p.nama.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{p.nama}</p>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">{p.jabatan}</p>
                </div>
              </div>
            ))}
            {pegawaiTerbaru.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">Belum ada data.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}