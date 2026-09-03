import { neon } from "@neondatabase/serverless";
import DashboardClient from "./DashboardClient";
import type { Pegawai, LeaveRecord } from "./types";

export const revalidate = 0;

export default async function DashboardPage() {
  const sql = neon(process.env.DATABASE_URL!);

  const rows = await sql`
    SELECT
      id,
      nama,
      nip,
      bidang,
      pangkat_golongan,
      tmt_pangkat_terakhir,
      jabatan,
      tmt_jabatan_terakhir,
      status_kepegawaian,
      created_at,
      tempat_lahir,
      tanggal_lahir,
      sisa_cuti_tahun_lalu,
      cuti_tahun_ini
    FROM data_pegawai
    ORDER BY created_at DESC
  `;

  const leaveRows = await sql`
    SELECT
      id,
      pegawai_id,
      jenis_cuti,
      bulan_angka,
      tahun,
      durasi,
      keterangan,
      created_at
    FROM leave_records
    ORDER BY tahun DESC, bulan_angka DESC
  `;

  const leaveMap = new Map<number, LeaveRecord[]>();

  for (const cuti of leaveRows) {
    const pegawaiId = Number(cuti.pegawai_id);

    const data: LeaveRecord = {
      id: Number(cuti.id),
      pegawai_id: pegawaiId,
      jenis_cuti: String(cuti.jenis_cuti),
      bulan_angka:
        cuti.bulan_angka === null
          ? null
          : Number(cuti.bulan_angka),
      tahun: Number(cuti.tahun),
      durasi: Number(cuti.durasi),
      keterangan:
        cuti.keterangan === null
          ? null
          : String(cuti.keterangan),
      created_at:
        cuti.created_at === null
          ? null
          : String(cuti.created_at),
    };

    const existing = leaveMap.get(pegawaiId);

    if (existing) {
      existing.push(data);
    } else {
      leaveMap.set(pegawaiId, [data]);
    }
  }

  const dataPegawai: Pegawai[] = rows.map((pegawai) => ({
    id: Number(pegawai.id),
    nama: String(pegawai.nama),
    nip: String(pegawai.nip),
    bidang: String(pegawai.bidang),
    pangkat_golongan: String(pegawai.pangkat_golongan),

    tmt_pangkat_terakhir:
      pegawai.tmt_pangkat_terakhir === null
        ? null
        : String(pegawai.tmt_pangkat_terakhir),

    jabatan: String(pegawai.jabatan),

    tmt_jabatan_terakhir:
      pegawai.tmt_jabatan_terakhir === null
        ? null
        : String(pegawai.tmt_jabatan_terakhir),

    status_kepegawaian: String(pegawai.status_kepegawaian),

    created_at:
      pegawai.created_at === null
        ? null
        : String(pegawai.created_at),

    tempat_lahir:
      pegawai.tempat_lahir === null
        ? null
        : String(pegawai.tempat_lahir),

    tanggal_lahir:
      pegawai.tanggal_lahir === null
        ? null
        : String(pegawai.tanggal_lahir),

    sisa_cuti_tahun_lalu: Number(
      pegawai.sisa_cuti_tahun_lalu
    ),

    cuti_tahun_ini: Number(
      pegawai.cuti_tahun_ini
    ),

    riwayat_cuti:
      leaveMap.get(Number(pegawai.id)) ?? [],
  }));

  return (
    <DashboardClient
      dataPegawai={dataPegawai}
    />
  );
}