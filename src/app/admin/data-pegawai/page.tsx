import { neon } from "@neondatabase/serverless";
import Link from "next/link";
// 1. Tambahkan import tipe Pegawai di sini
import TabelPegawaiClient, { Pegawai } from "./TabelPegawaiClient";

export const revalidate = 0;

export default async function DataPegawaiPage() {
  const sql = neon(process.env.DATABASE_URL!);
  // Tarik semua data
  const rows = await sql`SELECT * FROM data_pegawai ORDER BY created_at DESC`;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="animate-fade-up flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-amber-100/50 text-amber-500 px-3 py-1 rounded-full mb-2 lg:mb-3 text-[10px] lg:text-xs font-black tracking-widest uppercase border border-blue-200">
            <span>Database</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black text-[#15406A] tracking-tight">Data Pegawai</h1>
          <p className="text-gray-500 mt-1 lg:mt-2 font-medium text-sm lg:text-base">Platform Analisis Cerdas SDM BBPVP Makassar.</p>
        </div>

        <Link
          href="/admin/tambah-pegawai"
          className="inline-flex items-center justify-center space-x-2 bg-[#15406A] hover:bg-blue-900 text-white px-5 py-3 lg:px-6 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm lg:text-base w-full sm:w-auto"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path>
          </svg>
          <span>Input Data Baru</span>
        </Link>
      </div>

      {/* 2. Tambahkan 'as Pegawai[]' untuk meyakinkan TypeScript */}
      <TabelPegawaiClient data={rows as Pegawai[]} />
    </div>
  );
}
