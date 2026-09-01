"use server";

import { neon } from "@neondatabase/serverless";
import { revalidatePath } from "next/cache";

const sql = neon(process.env.DATABASE_URL!);

// ==========================================
// HELPER
// ==========================================

const parseDate = (val: FormDataEntryValue | null) => {
  if (!val || typeof val !== "string" || val.trim() === "") {
    return null;
  }

  return val;
};

const parseNumber = (val: FormDataEntryValue | null, defaultValue = 0) => {
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
// UPDATE PEGAWAI
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
// HAPUS PEGAWAI
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
// B. SIMPAN / EDIT CUTI TAHUNAN
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

  try {
    const result = await sql.transaction([
      sql`
        SELECT
          sisa_cuti_tahun_lalu,
          cuti_tahun_ini
        FROM data_pegawai
        WHERE id = ${pegawaiId}
        FOR UPDATE
      `,

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
    ]);

    const pegawaiRows = result[0] as Array<{
      sisa_cuti_tahun_lalu: number;
      cuti_tahun_ini: number;
    }>;

    const existingRows = result[1] as Array<{
      total_durasi: number;
    }>;

    if (pegawaiRows.length === 0) {
      throw new Error("Pegawai tidak ditemukan.");
    }

    const quotaLalu = Number(pegawaiRows[0].sisa_cuti_tahun_lalu) || 0;

    const quotaKini = Number(pegawaiRows[0].cuti_tahun_ini) || 0;

    // Pemakaian lama pada SEL yang sedang diedit
    const durasiLama = Number(existingRows[0]?.total_durasi) || 0;

    // Kembalikan dahulu kuota dari pemakaian lama
    let quotaLaluTersedia = quotaLalu + durasiLama;

    let quotaKiniTersedia = quotaKini;

    // Jika kuota tahun lalu dikembalikan melebihi
    // kondisi normal, tetap prioritaskan tahun lalu.
    const totalTersedia = quotaLaluTersedia + quotaKiniTersedia;

    if (durasiBaru > totalTersedia) {
      throw new Error(`Kuota tidak cukup. Total sisa kuota setelah koreksi data lama: ${totalTersedia} hari.`);
    }

    // Hapus seluruh record Tahunan pada sel tersebut.
    await sql`
      DELETE FROM leave_records
      WHERE
        pegawai_id = ${pegawaiId}
        AND jenis_cuti = 'Tahunan'
        AND bulan_angka = ${bulanAngka}
        AND tahun = ${tahun}
    `;

    // Pakai kuota tahun lalu terlebih dahulu
    let sisaDurasi = durasiBaru;

    if (quotaLaluTersedia > 0) {
      const digunakanDariLalu = Math.min(sisaDurasi, quotaLaluTersedia);

      quotaLaluTersedia -= digunakanDariLalu;
      sisaDurasi -= digunakanDariLalu;
    }

    // Sisanya menggunakan kuota tahun berjalan
    if (sisaDurasi > 0) {
      quotaKiniTersedia -= sisaDurasi;
    }

    const keteranganFinal = keterangan.trim() || "Pengambilan cuti tahunan.";

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

    await sql`
      UPDATE data_pegawai
      SET
        sisa_cuti_tahun_lalu = ${quotaLaluTersedia},
        cuti_tahun_ini = ${quotaKiniTersedia}
      WHERE id = ${pegawaiId}
    `;

    revalidatePath("/admin");
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
// C. SIMPAN / EDIT CUTI LAINNYA
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
    // PENTING:
    // Hapus record lama pada sel yang sama.
    // Jadi 3 -> 2 tidak menjadi 5.
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
// D. HAPUS / BERSIHKAN SATU DATA CUTI
// ==========================================

// ==========================================
// D. HAPUS SATU DATA CUTI
// ==========================================

export async function hapusCuti(pegawaiId: number, bulan: number, tahun: number, jenis: string) {
  try {
    if (!pegawaiId || !bulan || !tahun || !jenis) {
      throw new Error("Data penghapusan tidak lengkap.");
    }

    const result = await sql.transaction([
      // ==========================================
      // AMBIL DATA CUTI YANG AKAN DIHAPUS
      // ==========================================

      sql`
        SELECT
          COALESCE(SUM(durasi), 0) AS total_durasi
        FROM leave_records
        WHERE
          pegawai_id = ${pegawaiId}
          AND jenis_cuti = ${jenis}
          AND bulan_angka = ${bulan}
          AND tahun = ${tahun}
      `,

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
    ]);

    const durasi =
      Number(
        (
          result[0] as Array<{
            total_durasi: number;
          }>
        )[0]?.total_durasi,
      ) || 0;

    const pegawai = (
      result[1] as Array<{
        sisa_cuti_tahun_lalu: number;
        cuti_tahun_ini: number;
      }>
    )[0];

    if (!pegawai) {
      throw new Error("Pegawai tidak ditemukan.");
    }

    // ==========================================
    // JIKA CUTI TAHUNAN
    // KEMBALIKAN KUOTA
    // ==========================================

    if (jenis === "Tahunan" && durasi > 0) {
      let quotaLalu = Number(pegawai.sisa_cuti_tahun_lalu) || 0;

      let quotaKini = Number(pegawai.cuti_tahun_ini) || 0;

      const MAKS_CUTI_TAHUN_INI = 12;

      // ==========================================
      // HITUNG RUANG YANG MASIH TERSEDIA
      // DI KUOTA TAHUN BERJALAN
      // ==========================================

      const kapasitasTahunIni = Math.max(MAKS_CUTI_TAHUN_INI - quotaKini, 0);

      // ==========================================
      // KEMBALIKAN SEBISA MUNGKIN KE TAHUN INI
      // ==========================================

      const dikembalikanKeTahunIni = Math.min(durasi, kapasitasTahunIni);

      quotaKini += dikembalikanKeTahunIni;

      // ==========================================
      // JIKA MASIH ADA SISA,
      // LEMPAR KE TAHUN LALU
      // ==========================================

      const sisaPengembalian = durasi - dikembalikanKeTahunIni;

      if (sisaPengembalian > 0) {
        quotaLalu += sisaPengembalian;
      }

      // ==========================================
      // UPDATE KUOTA
      // ==========================================

      await sql`
        UPDATE data_pegawai
        SET
          sisa_cuti_tahun_lalu = ${quotaLalu},
          cuti_tahun_ini = ${quotaKini}
        WHERE id = ${pegawaiId}
      `;
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
    // REFRESH CACHE
    // ==========================================

    revalidatePath("/admin");
    revalidatePath("/admin/manajemen-cuti");
    revalidatePath(`/admin/data-pegawai/${pegawaiId}`);

    return {
      success: true,
      message: "Data cuti berhasil dihapus dan kuota telah dikembalikan.",
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
// E. BERSIHKAN SEMUA DATA CUTI PEGAWAI
// ==========================================

// ==========================================
// E. BERSIHKAN SEMUA DATA CUTI PEGAWAI
// ==========================================

export async function bersihkanSemuaCutiPegawai(pegawaiId: number, tahun: number) {
  try {
    const result = await sql.transaction([
      // ==========================================
      // AMBIL TOTAL CUTI TAHUNAN
      // PADA TAHUN YANG AKAN DIBERSIHKAN
      // ==========================================

      sql`
        SELECT
          COALESCE(SUM(durasi), 0) AS total_durasi
        FROM leave_records
        WHERE
          pegawai_id = ${pegawaiId}
          AND tahun = ${tahun}
          AND jenis_cuti = 'Tahunan'
      `,

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
    ]);

    const totalTahunan =
      Number(
        (
          result[0] as Array<{
            total_durasi: number;
          }>
        )[0]?.total_durasi,
      ) || 0;

    const pegawai = (
      result[1] as Array<{
        sisa_cuti_tahun_lalu: number;
        cuti_tahun_ini: number;
      }>
    )[0];

    if (!pegawai) {
      throw new Error("Pegawai tidak ditemukan.");
    }

    // ==========================================
    // KEMBALIKAN KUOTA TAHUNAN
    // ==========================================

    if (totalTahunan > 0) {
      let quotaLalu = Number(pegawai.sisa_cuti_tahun_lalu) || 0;

      let quotaKini = Number(pegawai.cuti_tahun_ini) || 0;

      const MAKS_CUTI_TAHUN_INI = 12;

      // ==========================================
      // PRIORITAS PENGEMBALIAN:
      // TAHUN INI DULU SAMPAI 12
      // ==========================================

      const kapasitasTahunIni = Math.max(MAKS_CUTI_TAHUN_INI - quotaKini, 0);

      const dikembalikanKeTahunIni = Math.min(totalTahunan, kapasitasTahunIni);

      quotaKini += dikembalikanKeTahunIni;

      // ==========================================
      // KELEBIHAN DIKEMBALIKAN KE TAHUN LALU
      // ==========================================

      const sisaPengembalian = totalTahunan - dikembalikanKeTahunIni;

      if (sisaPengembalian > 0) {
        quotaLalu += sisaPengembalian;
      }

      // ==========================================
      // UPDATE KUOTA
      // ==========================================

      await sql`
        UPDATE data_pegawai
        SET
          sisa_cuti_tahun_lalu = ${quotaLalu},
          cuti_tahun_ini = ${quotaKini}
        WHERE id = ${pegawaiId}
      `;
    }

    // ==========================================
    // HAPUS SEMUA RIWAYAT CUTI
    // TAHUN TERSEBUT
    // ==========================================

    await sql`
      DELETE FROM leave_records
      WHERE
        pegawai_id = ${pegawaiId}
        AND tahun = ${tahun}
    `;

    // ==========================================
    // REFRESH CACHE
    // ==========================================

    revalidatePath("/admin");
    revalidatePath("/admin/manajemen-cuti");
    revalidatePath(`/admin/data-pegawai/${pegawaiId}`);

    return {
      success: true,
      message: "Seluruh data cuti berhasil dibersihkan dan kuota tahunan telah dikembalikan.",
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
// F. RESET KUOTA
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
