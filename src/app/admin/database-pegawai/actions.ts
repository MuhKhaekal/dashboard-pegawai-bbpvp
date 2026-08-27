'use server'
import { neon } from '@neondatabase/serverless';
import { revalidatePath } from 'next/cache';

export async function tambahPegawai(formData: FormData) {
  const sql = neon(process.env.DATABASE_URL!);
  
  // Membersihkan spasi pada NIP sebelum disimpan ke database
  const nipBersih = (formData.get('nip') as string).replace(/\s/g, '');

  await sql`
    INSERT INTO data_pegawai (
      nama, nip, tempat_lahir, tanggal_lahir, bidang, pangkat_golongan, 
      tmt_pangkat_terakhir, jabatan, tmt_jabatan_terakhir, status_kepegawaian
    ) VALUES (
      ${formData.get('nama') as string}, ${nipBersih}, 
      ${formData.get('tempat_lahir') as string}, ${formData.get('tanggal_lahir') as string},
      ${formData.get('bidang') as string}, ${formData.get('pangkat_golongan') as string}, 
      ${formData.get('tmt_pangkat_terakhir') as string}, ${formData.get('jabatan') as string}, 
      ${formData.get('tmt_jabatan_terakhir') as string}, ${formData.get('status_kepegawaian') as string}
    )
  `;
  
  revalidatePath('/admin/database-pegawai');
}