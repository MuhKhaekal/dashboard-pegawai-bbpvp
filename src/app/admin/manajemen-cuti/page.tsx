import { neon } from "@neondatabase/serverless";
import ManajemenCutiClient from "./ManajemenCutiClient";
import type { LeaveRecord, Pegawai } from "./types";

export const revalidate = 0;

// ==========================================
// URUTAN BIDANG
// ==========================================

const URUTAN_BIDANG = [
  "Struktural",
  "Instruktur Non Kejuruan",
  "Kej. Manufaktur",
  "Kej. Otomotif",
  "Kej. Elektronika",
  "Kej. Listrik",
  "Kej. Teknik Pendingin",
  "Kej. Garmen Apparel",
  "Kej. Adminisitrasi Bisnis dan Manajemen",
  "Kej. Teknik Las",
  "Kej. Teknologi Informasi dan Komunikasi",
  "Kej. Tata Kecantikan",
  "Kej. Bangunan",
  "Kej. Pariwisata",
  "Bagian Umum",
  "Bagian Umum SDMA",
  "Bagian Umum Keuangan",
  "Bagian Umum Pengadaaan",
  "Bagian Umum Gudang",
  "Bidang Pemberdayaan",
  "Bidang Penyelenggara",
  "Bidang Intala dan Uji Coba Program",
  "LSP",
  "SATPEL",
  "Security",
  "Cleaning Services",
  "Teknisi",
  "Driver",
];

// ==========================================
// PAGE
// ==========================================

export default async function ManajemenCutiPage() {
  const sql = neon(process.env.DATABASE_URL!);

  const currentYear = new Date().getFullYear();

  // ==========================================
  // 1. DATA PEGAWAI
  // ==========================================

  const rows = await sql`
    SELECT
      id,
      nama,
      nip,
      jabatan,
      bidang,
      status_kepegawaian,
      sisa_cuti_tahun_lalu,
      cuti_tahun_ini
    FROM data_pegawai
    ORDER BY created_at DESC
  `;

  // ==========================================
  // 2. RIWAYAT CUTI TAHUN BERJALAN
  // ==========================================

  const leaveRows = await sql`
    SELECT
      id,
      pegawai_id,
      jenis_cuti,
      bulan_angka,
      tahun,
      durasi,
      keterangan
    FROM leave_records
    WHERE tahun = ${currentYear}
    ORDER BY
      tahun ASC,
      bulan_angka ASC NULLS LAST,
      id ASC
  `;

  // ==========================================
  // 3. GROUP RIWAYAT CUTI BERDASARKAN PEGAWAI
  // ==========================================

  const leaveByPegawai = new Map<number, LeaveRecord[]>();

  leaveRows.forEach((r) => {
    const record: LeaveRecord = {
      id: Number(r.id),
      pegawai_id: Number(r.pegawai_id),
      jenis_cuti: String(r.jenis_cuti),
      bulan_angka:
        r.bulan_angka !== null
          ? Number(r.bulan_angka)
          : null,
      tahun: Number(r.tahun),
      durasi: Number(r.durasi) || 0,
      keterangan: r.keterangan ?? null,
    };

    const existing = leaveByPegawai.get(record.pegawai_id) || [];

    existing.push(record);

    leaveByPegawai.set(record.pegawai_id, existing);
  });

  // ==========================================
  // 4. GABUNG PEGAWAI + RIWAYAT CUTI
  // ==========================================

  const pegawaiData: Pegawai[] = rows.map((r) => ({
    id: Number(r.id),
    nama: String(r.nama ?? ""),
    nip: String(r.nip ?? ""),
    jabatan: String(r.jabatan ?? ""),
    bidang: String(r.bidang ?? ""),
    status_kepegawaian: String(r.status_kepegawaian ?? ""),

    sisa_cuti_tahun_lalu:
      Number(r.sisa_cuti_tahun_lalu) || 0,

    cuti_tahun_ini:
      Number(r.cuti_tahun_ini) || 0,

    riwayat_cuti:
      leaveByPegawai.get(Number(r.id)) || [],
  }));

  // ==========================================
  // 5. GROUP BY BIDANG
  // ==========================================

  const groupedData: Record<string, Pegawai[]> = {};

  pegawaiData.forEach((p) => {
    let bidang = p.bidang || "Belum Ditentukan";

    if (bidang.includes("--")) {
      bidang = bidang.replace("-- ", "");
    }

    if (!groupedData[bidang]) {
      groupedData[bidang] = [];
    }

    groupedData[bidang].push(p);
  });

  // ==========================================
  // 6. SORT BIDANG
  // ==========================================

  const sortedBidangKeys = Object.keys(groupedData).sort(
    (a, b) => {
      const indexA = URUTAN_BIDANG.indexOf(a);
      const indexB = URUTAN_BIDANG.indexOf(b);

      return (
        (indexA === -1 ? 999 : indexA) -
        (indexB === -1 ? 999 : indexB)
      );
    }
  );

  // ==========================================
  // 7. TOTAL PEGAWAI
  // ==========================================

  const totalPegawai = pegawaiData.length;

  // ==========================================
  // 8. RENDER
  // ==========================================

  return (
    <div className="p-4 md:p-6 lg:p-10 max-w-7xl mx-auto space-y-6 lg:space-y-8 bg-slate-50/50 min-h-screen">

      <style>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-up {
          animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }

        .scrollbar-cuti::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }

        .scrollbar-cuti::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 4px;
        }

        .scrollbar-cuti::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>

      {/* HEADER */}

      <div className="animate-fade-up flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">

        <div>

          <div className="inline-flex items-center space-x-2 bg-purple-100/50 text-purple-800 px-3 py-1 rounded-full mb-2 lg:mb-3 text-[10px] lg:text-xs font-black tracking-widest uppercase border border-purple-200 shadow-sm">

            <span className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></span>

            <span>Live Data - Manajemen Cuti</span>

          </div>

          <h1 className="text-3xl lg:text-4xl font-black text-[#15406A] tracking-tight">
            Pencatatan Cuti {currentYear}
          </h1>

          <p className="text-gray-500 mt-1 lg:mt-2 font-medium text-sm lg:text-base">
            Kelola jatah dan histori cuti tahunan, sakit,
            melahirkan, penting, dan izin pegawai BBPVP Makassar.
          </p>

        </div>

        <div className="flex gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm self-start sm:self-auto">

          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Total Pegawai
            </p>

            <p className="text-2xl font-black text-[#15406A]">
              {totalPegawai}
            </p>
          </div>

          <div className="w-px h-10 bg-gray-100"></div>

          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Tahun Cuti
            </p>

            <p className="text-2xl font-black text-[#15406A]">
              {currentYear}
            </p>
          </div>

        </div>

      </div>

      {/* CLIENT */}

      <div className="animate-fade-up">

        <ManajemenCutiClient
          initialData={pegawaiData}
          sortedBidangKeys={sortedBidangKeys}
          groupedData={groupedData}
        />

      </div>

    </div>
  );
}