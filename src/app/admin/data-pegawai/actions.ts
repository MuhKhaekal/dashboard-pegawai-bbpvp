"use server";

import { neon } from "@neondatabase/serverless";
import { revalidatePath } from "next/cache";

const sql = neon(process.env.DATABASE_URL!);

// ==========================================
// HELPER
// ==========================================

const parseDate = (val: FormDataEntryValue | null): string | null => {
  if (!val || typeof val !== "string" || val.trim() === "") {
    return null;
  }

  return val;
};

const parseNumber = (val: FormDataEntryValue | null, defaultValue = 0): number => {
  if (!val || typeof val !== "string" || val.trim() === "") {
    return defaultValue;
  }

  const num = parseInt(val, 10);

  return Number.isNaN(num) ? defaultValue : num;
};

// ==========================================
// A. PEGAWAI
// ==========================================

export async function tambahPegawai(formData: FormData) {
  const nipBersih = String(formData.get("nip") ?? "").replace(/\s/g, "");

  await sql`
    INSERT INTO data_pegawai (
      nama,
      nip,
      tempat_lahir,
      tanggal_lahir,
      bidang,
      pangkat_golongan,
      tmt_pangkat_terakhir,
      jabatan,
      tmt_jabatan_terakhir,
      status_kepegawaian,
      sisa_cuti_tahun_lalu,
      cuti_tahun_ini
    )
    VALUES (
      ${formData.get("nama")},
      ${nipBersih},
      ${formData.get("tempat_lahir")},
      ${parseDate(formData.get("tanggal_lahir"))},
      ${formData.get("bidang")},
      ${formData.get("pangkat_golongan")},
      ${parseDate(formData.get("tmt_pangkat_terakhir"))},
      ${formData.get("jabatan")},
      ${parseDate(formData.get("tmt_jabatan_terakhir"))},
      ${formData.get("status_kepegawaian")},
      ${parseNumber(formData.get("sisa_cuti_tahun_lalu"))},
      ${parseNumber(formData.get("cuti_tahun_ini"))}
    )
  `;

  revalidatePath("/admin");
  revalidatePath("/admin/data-pegawai");
  revalidatePath("/admin/manajemen-cuti");
}

// ==========================================
// B. UPDATE PEGAWAI
// ==========================================

export async function updatePegawai(id: number, formData: FormData) {
  const nipBersih = String(formData.get("nip") ?? "").replace(/\s/g, "");

  await sql`
    UPDATE data_pegawai
    SET
      nama = ${formData.get("nama")},
      nip = ${nipBersih},
      tempat_lahir = ${formData.get("tempat_lahir")},
      tanggal_lahir = ${parseDate(formData.get("tanggal_lahir"))},
      bidang = ${formData.get("bidang")},
      pangkat_golongan = ${formData.get("pangkat_golongan")},
      tmt_pangkat_terakhir = ${parseDate(formData.get("tmt_pangkat_terakhir"))},
      jabatan = ${formData.get("jabatan")},
      tmt_jabatan_terakhir = ${parseDate(formData.get("tmt_jabatan_terakhir"))},
      status_kepegawaian = ${formData.get("status_kepegawaian")},
      sisa_cuti_tahun_lalu = ${parseNumber(formData.get("sisa_cuti_tahun_lalu"))},
      cuti_tahun_ini = ${parseNumber(formData.get("cuti_tahun_ini"))}
    WHERE id = ${id}
  `;

  revalidatePath("/admin");
  revalidatePath("/admin/data-pegawai");
  revalidatePath("/admin/manajemen-cuti");
  revalidatePath(`/admin/data-pegawai/${id}`);
}

// ==========================================
// C. HAPUS PEGAWAI
// ==========================================

export async function hapusPegawai(id: number) {
  await sql`
    DELETE FROM data_pegawai
    WHERE id = ${id}
  `;

  revalidatePath("/admin");
  revalidatePath("/admin/data-pegawai");
  revalidatePath("/admin/manajemen-cuti");
}

// ==========================================
// D. SIMPAN / EDIT CUTI TAHUNAN
// ==========================================
//
// KONSEP:
//
// sisa_cuti_tahun_lalu = KUOTA DASAR
// cuti_tahun_ini       = KUOTA DASAR
//
// Kedua kolom tersebut TIDAK PERNAH dikurangi
// ketika pegawai mengambil cuti.
//
// Pemakaian hanya dicatat pada leave_records.
//
// SISA KUOTA dihitung:
//
// sisa_cuti_tahun_lalu
// + cuti_tahun_ini
// - total pemakaian Tahunan
//
// ==========================================

export async function simpanCutiTahunan(pegawaiId: number, bulanAngka: number, tahun: number, durasiBaru: number, keterangan = "") {
  if (!Number.isInteger(durasiBaru) || durasiBaru <= 0) {
    return {
      success: false,
      message: "Durasi harus lebih dari 0.",
    };
  }

  if (!Number.isInteger(bulanAngka) || bulanAngka < 1 || bulanAngka > 12) {
    return {
      success: false,
      message: "Bulan cuti tidak valid.",
    };
  }

  if (!Number.isInteger(tahun) || tahun < 2000) {
    return {
      success: false,
      message: "Tahun cuti tidak valid.",
    };
  }

  try {
    const result = await sql.transaction([
      // ==========================================
      // LOCK DATA PEGAWAI
      // ==========================================

      sql`
        SELECT
          sisa_cuti_tahun_lalu,
          cuti_tahun_ini
        FROM data_pegawai
        WHERE id = ${pegawaiId}
        FOR UPDATE
      `,

      // ==========================================
      // AMBIL DATA PADA CELL YANG SEDANG DIEDIT
      // ==========================================

      sql`
        SELECT
          COALESCE(SUM(durasi), 0) AS total_durasi
        FROM leave_records
        WHERE
          pegawai_id = ${pegawaiId}
          AND jenis_cuti = 'Tahunan'
          AND bulan_angka = ${bulanAngka}
          AND tahun = ${tahun}
      `,

      // ==========================================
      // AMBIL TOTAL PEMAKAIAN CUTI TAHUNAN
      // PADA TAHUN TERSEBUT
      //
      // CELL YANG SEDANG DIEDIT DIKELUARKAN
      // KARENA NANTI AKAN DIGANTI DENGAN
      // DURASI BARU.
      // ==========================================

      sql`
        SELECT
          COALESCE(SUM(durasi), 0) AS total_durasi
        FROM leave_records
        WHERE
          pegawai_id = ${pegawaiId}
          AND jenis_cuti = 'Tahunan'
          AND tahun = ${tahun}
          AND NOT (
            bulan_angka = ${bulanAngka}
          )
      `,
    ]);

    const pegawaiRows = result[0] as Array<{
      sisa_cuti_tahun_lalu: number;
      cuti_tahun_ini: number;
    }>;

    const existingRows = result[1] as Array<{
      total_durasi: number;
    }>;

    const otherRows = result[2] as Array<{
      total_durasi: number;
    }>;

    if (pegawaiRows.length === 0) {
      throw new Error("Pegawai tidak ditemukan.");
    }

    const quotaLalu = Number(pegawaiRows[0].sisa_cuti_tahun_lalu) || 0;

    const quotaKini = Number(pegawaiRows[0].cuti_tahun_ini) || 0;

    const durasiLama = Number(existingRows[0]?.total_durasi) || 0;

    const totalCutiLainnya = Number(otherRows[0]?.total_durasi) || 0;

    // ==========================================
    // TOTAL KUOTA DASAR
    // ==========================================

    const totalKuota = quotaLalu + quotaKini;

    // ==========================================
    // TOTAL PEMAKAIAN SETELAH PERUBAHAN
    // ==========================================

    const totalPemakaianSetelahEdit = totalCutiLainnya + durasiBaru;

    // ==========================================
    // CEK KUOTA
    // ==========================================

    if (totalPemakaianSetelahEdit > totalKuota) {
      const sisaKuota = totalKuota - totalCutiLainnya;

      throw new Error(`Kuota tidak cukup. Sisa kuota yang tersedia untuk perubahan ini adalah ${sisaKuota} hari.`);
    }

    // ==========================================
    // HAPUS RECORD LAMA
    // ==========================================
    //
    // Contoh:
    //
    // Sebelumnya Januari = 3
    // User memasukkan = 2
    //
    // Record 3 dihapus terlebih dahulu.
    // Kemudian dibuat record baru = 2.
    //
    // Hasil akhir = 2, BUKAN 5.
    //
    // ==========================================

    await sql`
      DELETE FROM leave_records
      WHERE
        pegawai_id = ${pegawaiId}
        AND jenis_cuti = 'Tahunan'
        AND bulan_angka = ${bulanAngka}
        AND tahun = ${tahun}
    `;

    // ==========================================
    // KETERANGAN
    // ==========================================

    const keteranganFinal = keterangan.trim() || "Pengambilan cuti tahunan.";

    // ==========================================
    // INSERT RECORD BARU
    // ==========================================

    await sql`
      INSERT INTO leave_records (
        pegawai_id,
        jenis_cuti,
        bulan_angka,
        tahun,
        durasi,
        keterangan
      )
      VALUES (
        ${pegawaiId},
        'Tahunan',
        ${bulanAngka},
        ${tahun},
        ${durasiBaru},
        ${keteranganFinal}
      )
    `;

    // ==========================================
    // JANGAN UPDATE data_pegawai
    //
    // sisa_cuti_tahun_lalu dan cuti_tahun_ini
    // harus tetap menjadi kuota dasar.
    // ==========================================

    revalidatePath("/admin");
    revalidatePath("/admin/data-pegawai");
    revalidatePath("/admin/manajemen-cuti");
    revalidatePath(`/admin/data-pegawai/${pegawaiId}`);

    return {
      success: true,
      message: durasiLama > 0 ? "Data cuti berhasil diperbarui." : "Cuti Tahunan berhasil dicatat.",
    };
  } catch (error: unknown) {
    console.error("Gagal memproses cuti tahunan:", error);

    const message = error instanceof Error ? error.message : "Gagal menyimpan cuti tahunan.";

    return {
      success: false,
      message,
    };
  }
}

// ==========================================
// E. SIMPAN / EDIT CUTI LAINNYA
// ==========================================

export async function simpanCutiLainnya(formData: FormData) {
  try {
    const pegawaiId = parseNumber(formData.get("pegawaiId"));

    const jenis = String(formData.get("jenis") ?? "").trim();

    const bulan = parseNumber(formData.get("bulan"));

    const durasi = parseNumber(formData.get("durasi"));

    const keterangan = String(formData.get("keterangan") ?? "").trim();

    const tahun = parseNumber(formData.get("tahun"), new Date().getFullYear());

    if (!pegawaiId) {
      throw new Error("Pegawai tidak valid.");
    }

    if (!jenis) {
      throw new Error("Jenis cuti wajib dipilih.");
    }

    if (bulan < 1 || bulan > 12) {
      throw new Error("Bulan cuti wajib dipilih.");
    }

    if (durasi <= 0) {
      throw new Error("Durasi harus lebih dari 0.");
    }

    if (!keterangan) {
      throw new Error("Keterangan wajib diisi.");
    }

    // ==========================================
    // HAPUS DATA LAMA PADA CELL YANG SAMA
    // ==========================================
    //
    // Contoh:
    // sebelumnya = 3
    // input baru  = 2
    //
    // hasil = 2
    // bukan 5.
    //
    // ==========================================

    await sql.transaction([
      sql`
        DELETE FROM leave_records
        WHERE
          pegawai_id = ${pegawaiId}
          AND jenis_cuti = ${jenis}
          AND bulan_angka = ${bulan}
          AND tahun = ${tahun}
      `,

      sql`
        INSERT INTO leave_records (
          pegawai_id,
          jenis_cuti,
          bulan_angka,
          tahun,
          durasi,
          keterangan
        )
        VALUES (
          ${pegawaiId},
          ${jenis},
          ${bulan},
          ${tahun},
          ${durasi},
          ${keterangan}
        )
      `,
    ]);

    revalidatePath("/admin");
    revalidatePath("/admin/data-pegawai");
    revalidatePath("/admin/manajemen-cuti");
    revalidatePath(`/admin/data-pegawai/${pegawaiId}`);

    return {
      success: true,
      message: "Data cuti berhasil disimpan/diperbarui.",
    };
  } catch (error: unknown) {
    console.error("Gagal menyimpan cuti lainnya:", error);

    const message = error instanceof Error ? error.message : "Gagal menyimpan cuti.";

    return {
      success: false,
      message,
    };
  }
}

// ==========================================
// F. HAPUS SATU DATA CUTI
// ==========================================
//
// PENTING:
//
// Penghapusan cuti TIDAK mengubah:
// - sisa_cuti_tahun_lalu
// - cuti_tahun_ini
//
// Karena kedua nilai tersebut adalah KUOTA DASAR.
//
// Setelah record dihapus, SISA KUOTA otomatis
// bertambah karena total pemakaian berkurang.
// ==========================================

export async function hapusCuti(pegawaiId: number, bulan: number, tahun: number, jenis: string) {
  try {
    if (!pegawaiId || !bulan || !tahun || !jenis) {
      throw new Error("Data penghapusan tidak lengkap.");
    }

    // ==========================================
    // PASTIKAN PEGAWAI ADA
    // ==========================================

    const pegawaiRows = await sql`
      SELECT id
      FROM data_pegawai
      WHERE id = ${pegawaiId}
    `;

    if (pegawaiRows.length === 0) {
      throw new Error("Pegawai tidak ditemukan.");
    }

    // ==========================================
    // HAPUS RECORD
    // ==========================================

    await sql`
      DELETE FROM leave_records
      WHERE
        pegawai_id = ${pegawaiId}
        AND bulan_angka = ${bulan}
        AND tahun = ${tahun}
        AND jenis_cuti = ${jenis}
    `;

    // ==========================================
    // TIDAK ADA UPDATE KUOTA
    //
    // Kuota dasar tetap.
    // ==========================================

    revalidatePath("/admin");
    revalidatePath("/admin/data-pegawai");
    revalidatePath("/admin/manajemen-cuti");
    revalidatePath(`/admin/data-pegawai/${pegawaiId}`);

    return {
      success: true,
      message: "Data cuti berhasil dihapus.",
    };
  } catch (error: unknown) {
    console.error("Gagal menghapus cuti:", error);

    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal menghapus data cuti.",
    };
  }
}

// ==========================================
// G. BERSIHKAN SEMUA DATA CUTI PEGAWAI
// ==========================================
//
// Semua leave_records pada tahun tertentu
// akan dihapus.
//
// KUOTA DASAR TIDAK DIUBAH.
//
// Setelah data dihapus:
//
// SISA KUOTA
// = sisa_tahun_lalu + cuti_tahun_ini
//
// ==========================================

export async function bersihkanSemuaCutiPegawai(pegawaiId: number, tahun: number) {
  try {
    // ==========================================
    // PASTIKAN PEGAWAI ADA
    // ==========================================

    const pegawaiRows = await sql`
      SELECT id
      FROM data_pegawai
      WHERE id = ${pegawaiId}
    `;

    if (pegawaiRows.length === 0) {
      throw new Error("Pegawai tidak ditemukan.");
    }

    // ==========================================
    // HAPUS SEMUA RIWAYAT CUTI
    // PADA TAHUN TERSEBUT
    // ==========================================

    await sql`
      DELETE FROM leave_records
      WHERE
        pegawai_id = ${pegawaiId}
        AND tahun = ${tahun}
    `;

    // ==========================================
    // TIDAK ADA UPDATE KUOTA
    //
    // Kuota dasar tetap.
    // ==========================================

    revalidatePath("/admin");
    revalidatePath("/admin/data-pegawai");
    revalidatePath("/admin/manajemen-cuti");
    revalidatePath(`/admin/data-pegawai/${pegawaiId}`);

    return {
      success: true,
      message: "Seluruh data cuti berhasil dibersihkan.",
    };
  } catch (error: unknown) {
    console.error("Gagal membersihkan seluruh cuti:", error);

    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal membersihkan data cuti.",
    };
  }
}

// ==========================================
// H. RESET KUOTA
// ==========================================
//
// Fungsi ini memang BOLEH mengubah kuota dasar,
// karena reset merupakan tindakan manual.
//
// Setelah reset:
//
// sisa_cuti_tahun_lalu = nilai baru
// cuti_tahun_ini       = nilai baru
//
// Riwayat leave_records TIDAK dihapus.
// ==========================================

export async function resetCutiPegawai(id: number, cutiTahunIni: number, sisaLalu: number) {
  try {
    if (cutiTahunIni < 0 || sisaLalu < 0) {
      throw new Error("Kuota tidak boleh bernilai negatif.");
    }

    await sql`
      UPDATE data_pegawai
      SET
        cuti_tahun_ini = ${cutiTahunIni},
        sisa_cuti_tahun_lalu = ${sisaLalu}
      WHERE id = ${id}
    `;

    revalidatePath("/admin");
    revalidatePath("/admin/data-pegawai");
    revalidatePath("/admin/manajemen-cuti");
    revalidatePath(`/admin/data-pegawai/${id}`);

    return {
      success: true,
      message: "Kuota berhasil direset.",
    };
  } catch (error: unknown) {
    console.error("Gagal mereset kuota cuti:", error);

    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal mereset kuota.",
    };
  }
}
