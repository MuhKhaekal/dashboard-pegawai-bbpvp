import { neon } from '@neondatabase/serverless';
// 1. Tambahkan import tipe Pegawai di sini
import TabelPegawaiClient, { Pegawai } from './TabelPegawaiClient';

export const revalidate = 0;

export default async function DataPegawaiPage() {
  const sql = neon(process.env.DATABASE_URL!);
  // Tarik semua data
  const rows = await sql`SELECT * FROM data_pegawai ORDER BY created_at DESC`;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
       <div className="flex justify-between items-end mb-8">
        <div>
          <div className="inline-block px-3 py-1 bg-amber-100 text-amber-700 text-xs font-black tracking-widest rounded-full mb-3 uppercase shadow-sm">
            Database
          </div>
          <h1 className="text-4xl font-black text-[#15406A] tracking-tight">Daftar Pegawai</h1>
        </div>
      </div>

      {/* 2. Tambahkan 'as Pegawai[]' untuk meyakinkan TypeScript */}
      <TabelPegawaiClient data={rows as Pegawai[]} />
    </div>
  );
}