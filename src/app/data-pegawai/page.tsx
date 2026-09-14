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
    <div className="p-6 md:p-10 md:px-24 bg-slate-50 min-h-screen">
      <div className="animate-fade-up flex flex-col sm:flex-row items-start  gap-4 mb-4">
        <Link href="/" className="mt-1 w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-[#15406A] hover:border-blue-200 shadow-sm transition-all group">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <div className="inline-flex items-center space-x-2 bg-amber-100/50 text-amber-500 px-3 py-1 rounded-full mb-2 lg:mb-3 text-[10px] lg:text-xs font-black tracking-widest uppercase border border-blue-200">
            <span>Database</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black text-[#15406A] tracking-tight">Data Pegawai</h1>
          <p className="text-gray-500 mt-1 lg:mt-2 font-medium text-sm lg:text-base">Platform Analisis Cerdas SDM BBPVP Makassar.</p>
        </div>
      </div>

      {/* 2. Tambahkan 'as Pegawai[]' untuk meyakinkan TypeScript */}
      <TabelPegawaiClient data={rows as Pegawai[]} />
    </div>
  );
}
