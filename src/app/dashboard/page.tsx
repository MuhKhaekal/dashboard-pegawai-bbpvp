import { neon } from '@neondatabase/serverless';

export const revalidate = 0; // Agar data tidak di-cache (selalu up to date)

export default async function DashboardPegawai() {
  // 1. Ambil URL koneksi dari environment variable
  const sql = neon(process.env.DATABASE_URL!);

  // 2. [Hanya Dijalankan Sekali] Membuat tabel jika belum ada
  // Setelah dijalankan dan tabel sukses dibuat, Anda bisa menghapus query CREATE TABLE ini
  await sql`
    CREATE TABLE IF NOT EXISTS data_pegawai (
      id SERIAL PRIMARY KEY,
      nama VARCHAR(150) NOT NULL,
      nip VARCHAR(50) UNIQUE NOT NULL,
      bidang VARCHAR(100),
      pangkat_golongan VARCHAR(50),
      tmt_pangkat_terakhir DATE,
      jabatan VARCHAR(100),
      tmt_jabatan_terakhir DATE,
      status_kepegawaian VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // 3. Menarik data pegawai dari database
  const rows = await sql`SELECT * FROM data_pegawai ORDER BY nama ASC`;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard Pegawai</h1>
      
      <div className="overflow-x-auto shadow-sm rounded-lg border border-gray-200">
        <table className="min-w-full bg-white text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 text-left font-medium text-gray-600">Nama</th>
              <th className="p-3 text-left font-medium text-gray-600">NIP</th>
              <th className="p-3 text-left font-medium text-gray-600">Bidang</th>
              <th className="p-3 text-left font-medium text-gray-600">Jabatan</th>
              <th className="p-3 text-left font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">
                  Belum ada data pegawai. Silakan input data baru.
                </td>
              </tr>
            ) : (
              rows.map((pegawai) => (
                <tr key={pegawai.id} className="hover:bg-gray-50 transition">
                  <td className="p-3">{pegawai.nama}</td>
                  <td className="p-3">{pegawai.nip}</td>
                  <td className="p-3">{pegawai.bidang}</td>
                  <td className="p-3">{pegawai.jabatan}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                      {pegawai.status_kepegawaian}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}