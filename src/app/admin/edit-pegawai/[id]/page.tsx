import { neon } from '@neondatabase/serverless';
import { redirect } from 'next/navigation';
// 1. Tambahkan import tipe Pegawai dari file form
import FormEditPegawai, { Pegawai } from './FormEditPegawai';

export const revalidate = 0;

// 2. Ubah params menjadi Promise (aturan baru Next.js)
export default async function EditPegawaiPage({ params }: { params: Promise<{ id: string }> }) {
  const sql = neon(process.env.DATABASE_URL!);
  
  // 3. Await (tunggu) params sebelum digunakan
  const resolvedParams = await params;
  
  // Tarik data pegawai spesifik berdasarkan ID
  const rows = await sql`SELECT * FROM data_pegawai WHERE id = ${resolvedParams.id}`;
  
  if (rows.length === 0) {
    redirect('/admin/data-pegawai'); // Lempar kembali jika data tidak ditemukan
  }

  // 4. Tegaskan kepada TypeScript bahwa baris pertama ini adalah data Pegawai (menggunakan 'as Pegawai')
  const pegawai = rows[0] as Pegawai;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="inline-block px-3 py-1 bg-blue-100 text-[#15406A] text-xs font-black tracking-widest rounded-full mb-3 uppercase shadow-sm">
          Pembaruan Data
        </div>
        <h1 className="text-4xl font-black text-[#15406A] tracking-tight">Edit Data Pegawai</h1>
      </div>
      
      {/* 5. Error TypeScript di sini akan otomatis hilang! */}
      <FormEditPegawai pegawai={pegawai} />
    </div>
  );
}