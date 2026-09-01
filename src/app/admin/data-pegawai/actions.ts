"use server";

import { neon } from "@neondatabase/serverless";
import { revalidatePath } from "next/cache";

const sql = neon(process.env.DATABASE_URL!);

// ==========================================
// HELPER
// ==========================================

const parseDate = (
  val: FormDataEntryValue | null
) => {
  if (
    !val ||
    typeof val !== "string" ||
    val.trim() === ""
  ) {
    return null;
  }

  return val;
};

const parseNumber = (
  val: FormDataEntryValue | null,
  defaultValue = 0
) => {
  if (
    !val ||
    typeof val !== "string" ||
    val.trim() === ""
  ) {
    return defaultValue;
  }

  const num = parseInt(val, 10);

  return Number.isNaN(num)
    ? defaultValue
    : num;
};

// ==========================================
// A. PEGAWAI
// ==========================================

export async function tambahPegawai(
  formData: FormData
) {
  const nipBersih = String(
    formData.get("nip") ?? ""
  ).replace(/\s/g, "");

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

export async function updatePegawai(
  id: number,
  formData: FormData
) {
  const nipBersih = String(
    formData.get("nip") ?? ""
  ).replace(/\s/g, "");

  await sql`
    UPDATE data_pegawai
    SET
      nama = ${formData.get("nama")},
      nip = ${nipBersih},
      tempat_lahir = ${formData.get("tempat_lahir")},
      tanggal_lahir = ${parseDate(
        formData.get("tanggal_lahir")
      )},
      bidang = ${formData.get("bidang")},
      pangkat_golongan = ${formData.get(
        "pangkat_golongan"
      )},
      tmt_pangkat_terakhir = ${parseDate(
        formData.get("tmt_pangkat_terakhir")
      )},
      jabatan = ${formData.get("jabatan")},
      tmt_jabatan_terakhir = ${parseDate(
        formData.get("tmt_jabatan_terakhir")
      )},
      status_kepegawaian = ${formData.get(
        "status_kepegawaian"
      )},
      sisa_cuti_tahun_lalu = ${parseNumber(
        formData.get("sisa_cuti_tahun_lalu")
      )},
      cuti_tahun_ini = ${parseNumber(
        formData.get("cuti_tahun_ini")
      )}
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
// B. CUTI TAHUNAN
// ==========================================

export async function simpanCutiTahunan(
  pegawaiId: number,
  bulanAngka: number,
  tahun: number,
  durasi: number
) {
  if (!Number.isInteger(durasi) || durasi <= 0) {
    return {
      success: false,
      message: "Durasi harus lebih dari 0.",
    };
  }

  if (
    !Number.isInteger(bulanAngka) ||
    bulanAngka < 1 ||
    bulanAngka > 12
  ) {
    return {
      success: false,
      message: "Bulan cuti tidak valid.",
    };
  }

  try {
    const pRows = await sql`
      SELECT
        sisa_cuti_tahun_lalu,
        cuti_tahun_ini
      FROM data_pegawai
      WHERE id = ${pegawaiId}
    `;

    if (pRows.length === 0) {
      throw new Error("Pegawai tidak ditemukan.");
    }

    const quotaLalu =
      Number(pRows[0].sisa_cuti_tahun_lalu) || 0;

    const quotaKini =
      Number(pRows[0].cuti_tahun_ini) || 0;

    const totalKuota =
      quotaLalu + quotaKini;

    if (durasi > totalKuota) {
      throw new Error(
        `Kuota tidak cukup. Total sisa cuti: ${totalKuota} hari.`
      );
    }

    let sisaDurasi = durasi;

    let newQuotaLalu = quotaLalu;
    let newQuotaKini = quotaKini;

    // Prioritas memakai sisa tahun lalu
    if (newQuotaLalu > 0) {
      const terpakaiDiLalu = Math.min(
        sisaDurasi,
        newQuotaLalu
      );

      newQuotaLalu -= terpakaiDiLalu;
      sisaDurasi -= terpakaiDiLalu;
    }

    // Sisanya memakai kuota tahun berjalan
    if (sisaDurasi > 0) {
      newQuotaKini -= sisaDurasi;
    }

    await sql.transaction([
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
          'Tahunan',
          ${bulanAngka},
          ${tahun},
          ${durasi},
          'Pengambilan otomatis dari panel bulanan.'
        )
      `,

      sql`
        UPDATE data_pegawai
        SET
          sisa_cuti_tahun_lalu = ${newQuotaLalu},
          cuti_tahun_ini = ${newQuotaKini}
        WHERE id = ${pegawaiId}
      `,
    ]);

    revalidatePath("/admin");
    revalidatePath("/admin/manajemen-cuti");
    revalidatePath(`/admin/data-pegawai/${pegawaiId}`);

    return {
      success: true,
      message:
        "Cuti Tahunan berhasil dicatat dan kuota diperbarui.",
    };
  } catch (error: unknown) {
    console.error(
      "Gagal memproses cuti tahunan:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal menyimpan cuti tahunan.";

    return {
      success: false,
      message,
    };
  }
}

// ==========================================
// C. CUTI LAINNYA
// ==========================================

export async function simpanCutiLainnya(
  formData: FormData
) {
  try {
    const pegawaiId = parseNumber(
      formData.get("pegawaiId")
    );

    const jenis = String(
      formData.get("jenis") ?? ""
    ).trim();

    const bulan = parseNumber(
      formData.get("bulan")
    );

    const durasi = parseNumber(
      formData.get("durasi")
    );

    const keterangan = String(
      formData.get("keterangan") ?? ""
    ).trim();

    const tahun = new Date().getFullYear();

    if (!pegawaiId) {
      throw new Error(
        "Pegawai tidak valid."
      );
    }

    if (!jenis) {
      throw new Error(
        "Jenis cuti wajib dipilih."
      );
    }

    if (
      bulan < 1 ||
      bulan > 12
    ) {
      throw new Error(
        "Bulan cuti wajib dipilih."
      );
    }

    if (durasi <= 0) {
      throw new Error(
        "Durasi harus lebih dari 0."
      );
    }

    if (!keterangan) {
      throw new Error(
        "Keterangan wajib diisi."
      );
    }

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
        ${jenis},
        ${bulan},
        ${tahun},
        ${durasi},
        ${keterangan}
      )
    `;

    revalidatePath("/admin");
    revalidatePath("/admin/manajemen-cuti");
    revalidatePath(`/admin/data-pegawai/${pegawaiId}`);

    return {
      success: true,
      message: `Cuti ${jenis} berhasil dicatat.`,
    };
  } catch (error: unknown) {
    console.error(
      "Gagal menyimpan cuti lainnya:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal menyimpan cuti.";

    return {
      success: false,
      message,
    };
  }
}

// ==========================================
// D. RESET KUOTA
// ==========================================

export async function resetCutiPegawai(
  id: number,
  cutiTahunIni: number,
  sisaLalu: number
) {
  try {
    if (
      cutiTahunIni < 0 ||
      sisaLalu < 0
    ) {
      throw new Error(
        "Kuota tidak boleh bernilai negatif."
      );
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
    console.error(
      "Gagal mereset kuota cuti:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal mereset kuota.";

    return {
      success: false,
      message,
    };
  }
}