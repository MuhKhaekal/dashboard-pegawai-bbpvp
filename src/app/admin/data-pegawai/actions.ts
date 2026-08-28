'use server'

import { neon } from '@neondatabase/serverless';
import { revalidatePath } from 'next/cache';

// FILTER PINTAR: Mengubah string kosong "" menjadi NULL agar diterima database
const parseDate = (val: FormDataEntryValue | null) => {
  if (!val || typeof val !== 'string' || val.trim() === '') return null;
  return val;
};

// FILTER PINTAR: Menangani inputan angka cuti (Jika kosong, otomatis jadi 0)
const parseNumber = (val: FormDataEntryValue | null) => {
  if (!val || typeof val !== 'string' || val.trim() === '') return 0;
  return parseInt(val, 10);
};

export async function tambahPegawai(formData: FormData) {
  const sql = neon(process.env.DATABASE_URL!);
  
  // Membersihkan spasi pada NIP sebelum masuk database
  const nipBersih = (formData.get('nip') as string).replace(/\s/g, '');
  
  await sql`
    INSERT INTO data_pegawai (
      nama, nip, tempat_lahir, tanggal_lahir, bidang, pangkat_golongan, 
      tmt_pangkat_terakhir, jabatan, tmt_jabatan_terakhir, status_kepegawaian,
      sisa_cuti_tahun_lalu, cuti_tahun_ini
    ) VALUES (
      ${formData.get('nama')},
      ${nipBersih},
      ${formData.get('tempat_lahir')},
      ${parseDate(formData.get('tanggal_lahir'))},
      ${formData.get('bidang')},
      ${formData.get('pangkat_golongan')},
      ${parseDate(formData.get('tmt_pangkat_terakhir'))},
      ${formData.get('jabatan')},
      ${parseDate(formData.get('tmt_jabatan_terakhir'))},
      ${formData.get('status_kepegawaian')},
      ${parseNumber(formData.get('sisa_cuti_tahun_lalu'))},
      ${parseNumber(formData.get('cuti_tahun_ini'))}
    )
  `;

  // Me-refresh (revalidate) halaman agar tabel dan grafik langsung terupdate
  revalidatePath('/admin');
  revalidatePath('/admin/data-pegawai');
}

export async function updatePegawai(id: number, formData: FormData) {
  const sql = neon(process.env.DATABASE_URL!);
  
  const nipBersih = (formData.get('nip') as string).replace(/\s/g, '');

  await sql`
    UPDATE data_pegawai SET
      nama = ${formData.get('nama')},
      nip = ${nipBersih},
      tempat_lahir = ${formData.get('tempat_lahir')},
      tanggal_lahir = ${parseDate(formData.get('tanggal_lahir'))},
      bidang = ${formData.get('bidang')},
      pangkat_golongan = ${formData.get('pangkat_golongan')},
      tmt_pangkat_terakhir = ${parseDate(formData.get('tmt_pangkat_terakhir'))},
      jabatan = ${formData.get('jabatan')},
      tmt_jabatan_terakhir = ${parseDate(formData.get('tmt_jabatan_terakhir'))},
      status_kepegawaian = ${formData.get('status_kepegawaian')},
      sisa_cuti_tahun_lalu = ${parseNumber(formData.get('sisa_cuti_tahun_lalu'))},
      cuti_tahun_ini = ${parseNumber(formData.get('cuti_tahun_ini'))}
    WHERE id = ${id}
  `;

  revalidatePath('/admin');
  revalidatePath('/admin/data-pegawai');
}

export async function hapusPegawai(id: number) {
  const sql = neon(process.env.DATABASE_URL!);
  
  await sql`DELETE FROM data_pegawai WHERE id = ${id}`;
  
  revalidatePath('/admin');
  revalidatePath('/admin/data-pegawai');
}