import { neon } from "@neondatabase/serverless";
import DashboardDetailClient from "./DashboardDetailClient";
import type { Pegawai, LeaveRecord } from "../types";

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    filter?: string;
    value?: string;
    category?: string;
  }>;
}

export default async function DashboardDetailPage({
  searchParams,
}: PageProps) {
  const sql = neon(process.env.DATABASE_URL!);

  const params = await searchParams;

  const filter = params.filter || "";
  const value = params.value || "";
  const category = params.category || "";

  const pegawaiRows =
    await sql`SELECT * FROM data_pegawai ORDER BY nama ASC`;

  const leaveRows =
    await sql`SELECT * FROM leave_records ORDER BY tahun DESC, bulan_angka DESC, created_at DESC`;

  const leaveMap = new Map<number, LeaveRecord[]>();

  for (const leave of leaveRows) {
    const pegawaiId = Number(leave.pegawai_id);

    const existing =
      leaveMap.get(pegawaiId) || [];

    existing.push(leave as LeaveRecord);

    leaveMap.set(pegawaiId, existing);
  }

  const data: Pegawai[] = pegawaiRows.map(
    (pegawai) => ({
      ...(pegawai as Pegawai),
      riwayat_cuti:
        leaveMap.get(Number(pegawai.id)) || [],
    })
  );

  return (
    <DashboardDetailClient
      initialData={data}
      filter={filter}
      value={value}
      category={category}
    />
  );
}