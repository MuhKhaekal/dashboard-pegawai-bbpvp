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


export async function hapusPegawai(id: number) {
  const sql = neon(process.env.DATABASE_URL!);
  
  try {
    await sql`DELETE FROM data_pegawai WHERE id = ${id}`;
    // Memperbarui tampilan tabel secara langsung setelah data dihapus
    revalidatePath('/admin/data-pegawai');
    return { success: true };
  } catch (error) {
    console.error("Gagal menghapus data:", error);
    return { success: false, error: "Gagal menghapus data." };
  }
}

export async function updatePegawai(id: number, formData: FormData) {
  const sql = neon(process.env.DATABASE_URL!);
  const nipBersih = (formData.get('nip') as string).replace(/\s/g, '');

  try {
    await sql`
      UPDATE data_pegawai SET 
        nama = ${formData.get('nama') as string},
        nip = ${nipBersih},
        tempat_lahir = ${formData.get('tempat_lahir') as string},
        tanggal_lahir = ${formData.get('tanggal_lahir') as string},
        pangkat_golongan = ${formData.get('pangkat_golongan') as string},
        tmt_pangkat_terakhir = ${formData.get('tmt_pangkat_terakhir') as string},
        jabatan = ${formData.get('jabatan') as string},
        tmt_jabatan_terakhir = ${formData.get('tmt_jabatan_terakhir') as string},
        bidang = ${formData.get('bidang') as string},
        status_kepegawaian = ${formData.get('status_kepegawaian') as string}
      WHERE id = ${id}
    `;
    revalidatePath('/admin/data-pegawai');
    return { success: true };
  } catch (error) {
    console.error("Gagal mengupdate data:", error);
    return { success: false, error: "Gagal mengupdate data." };
  }
}