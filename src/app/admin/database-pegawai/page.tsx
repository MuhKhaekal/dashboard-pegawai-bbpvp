import { neon } from "@neondatabase/serverless";
import FormPegawai from "./FormPegawai";

export const revalidate = 0;

// Fungsi format tanggal (ex: 30 Juni 2027)
function formatTanggal(dateString: string | null) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

export default async function DatabasePegawaiPage() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT * FROM data_pegawai ORDER BY created_at DESC`;
  // --- TAMBAHKAN KODE INI SEMENTARA ---
  try {
    await sql`
      ALTER TABLE data_pegawai 
      ADD COLUMN tempat_lahir VARCHAR(100), 
      ADD COLUMN tanggal_lahir DATE;
    `;
    console.log("Kolom berhasil ditambah!");
  } catch (e) {
    // Abaikan jika error (misal karena kolom sudah ada)
  } 
  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* CSS Animasi Tambahan agar website terasa hidup */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
      `}</style>

      <div className="animate-fade-in">
        <h1 className="text-3xl font-extrabold text-[#15406A] tracking-tight">Database Pegawai</h1>
        <p className="text-gray-500 mt-2 font-medium">Kelola data terpadu kepegawaian BBPVP Makassar</p>
      </div>

      {/* Memanggil Form Client Component */}
      <FormPegawai />

      <div className="bg-white p-8 rounded-2xl shadow-lg border border-blue-50 animate-fade-in delay-200">
        <h2 className="text-xl font-bold text-[#15406A] mb-6">Daftar Pegawai</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-[#15406A] text-white">
              <tr>
                <th className="px-5 py-4 rounded-tl-lg font-semibold tracking-wide">Nama & Jabatan</th>
                <th className="px-5 py-4 font-semibold tracking-wide">Pangkat & TMT</th>
                <th className="px-5 py-4 font-semibold tracking-wide">TTL</th>
                <th className="px-5 py-4 font-semibold tracking-wide">Status</th>
                <th className="px-5 py-4 rounded-tr-lg font-semibold tracking-wide text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/50 transition-colors duration-200 group">
                  <td className="px-5 py-4">
                    <p className="font-bold text-gray-900 text-base">{p.nama}</p>
                    <p className="text-gray-500">{p.nip}</p>
                    <p className="text-[#15406A] font-medium mt-1">{p.jabatan}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-800">{p.pangkat_golongan}</p>
                    <p className="text-gray-500 text-xs mt-1">TMT: {formatTanggal(p.tmt_pangkat_terakhir)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-gray-800">{p.tempat_lahir}</p>
                    <p className="text-gray-500">{formatTanggal(p.tanggal_lahir)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold shadow-sm">{p.status_kepegawaian}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button className="text-[#15406A] font-bold hover:text-blue-900 bg-blue-50 px-3 py-1.5 rounded-md transition-all hover:bg-blue-100 mr-2">Edit</button>
                    <button className="text-red-500 font-bold hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-md transition-all hover:bg-red-100">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
