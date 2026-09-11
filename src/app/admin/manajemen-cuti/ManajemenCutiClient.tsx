"use client";

import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

import PageLoading from "../../components/PageLoading";
import type { Pegawai } from "./types";

import { simpanCutiTahunan, simpanCutiLainnya, resetCutiPegawai, hapusCuti, bersihkanSemuaCutiPegawai } from "../data-pegawai/actions";

interface ManajemenCutiClientProps {
  initialData: Pegawai[];
  sortedBidangKeys?: string[];
  groupedData?: Record<string, Pegawai[]>;
}

const BULAN = [
  { angka: 1, nama: "JANUARI" },
  { angka: 2, nama: "FEBRUARI" },
  { angka: 3, nama: "MARET" },
  { angka: 4, nama: "APRIL" },
  { angka: 5, nama: "MEI" },
  { angka: 6, nama: "JUNI" },
  { angka: 7, nama: "JULI" },
  { angka: 8, nama: "AGUSTUS" },
  { angka: 9, nama: "SEPTEMBER" },
  { angka: 10, nama: "OKTOBER" },
  { angka: 11, nama: "NOVEMBER" },
  { angka: 12, nama: "DESEMBER" },
];

const JENIS_CUTI = [
  {
    key: "Melahirkan",
    label: "MELAHIRKAN",
  },
  {
    key: "Sakit",
    label: "SAKIT",
  },
  {
    key: "Tahunan",
    label: "TAHUNAN",
  },
  {
    key: "Alasan Penting",
    label: "PENTING",
  },
  {
    key: "Izin",
    label: "IZIN",
  },
];

type ActiveTable = "asnNonSatpel" | "nonAsnNonSatpel" | "asnSatpel" | "nonAsnSatpel";

type ModalType = "CUTI" | "RESET" | "BERSIHKAN" | null;

type CellTarget = {
  pegawai: Pegawai;
  bulan: number;
  jenis: string;
  nilai: number;
};

type TableOption = {
  key: ActiveTable;
  label: string;
  shortLabel: string;
  description: string;
  data: Pegawai[];
};

const SATPEL_SPESIFIK = ["Satpel Mamuju", "Satpel Majene", "Satpel Palu"];

export default function ManajemenCutiClient({ initialData }: ManajemenCutiClientProps) {
  const router = useRouter();

  const currentYear = 2026;

  const [search, setSearch] = useState("");
  const [activeTable, setActiveTable] = useState<ActiveTable>("asnNonSatpel");

  const [modalType, setModalType] = useState<ModalType>(null);

  const [selectedCell, setSelectedCell] = useState<CellTarget | null>(null);

  const [durasi, setDurasi] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const [cutiTahunIni, setCutiTahunIni] = useState<number>(12);

  const [sisaLalu, setSisaLalu] = useState<number>(0);

  const [isLoading, setIsLoading] = useState(false);

  // =====================================================
  // SORT DATA
  // =====================================================

  const sortedData = useMemo(() => {
    return [...initialData].sort((a, b) =>
      a.nama.localeCompare(b.nama, "id", {
        sensitivity: "base",
      }),
    );
  }, [initialData]);

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredData = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) {
      return sortedData;
    }

    return sortedData.filter((pegawai) => {
      return pegawai.nama.toLowerCase().includes(q) || pegawai.nip.toLowerCase().includes(q) || (pegawai.jabatan || "").toLowerCase().includes(q) || (pegawai.bidang || "").toLowerCase().includes(q);
    });
  }, [sortedData, search]);

  // =====================================================
  // IDENTIFIKASI SATPEL
  // =====================================================

  const isSatpelSpesifik = (pegawai: Pegawai) => {
    const bidang = (pegawai.bidang || "").trim().toLowerCase();

    return SATPEL_SPESIFIK.some((satpel) => satpel.toLowerCase() === bidang);
  };

  // =====================================================
  // IDENTIFIKASI ASN
  // =====================================================

  const isASN = (pegawai: Pegawai) => {
    const status = (pegawai.status_kepegawaian || "").trim().toLowerCase();

    return status === "pns" || status === "pppk";
  };

  // =====================================================
  // PEMBAGIAN DATA
  // =====================================================

  const asnNonSatpel = useMemo(() => {
    return filteredData.filter((pegawai) => isASN(pegawai) && !isSatpelSpesifik(pegawai));
  }, [filteredData]);

  const nonAsnNonSatpel = useMemo(() => {
    return filteredData.filter((pegawai) => !isASN(pegawai) && !isSatpelSpesifik(pegawai));
  }, [filteredData]);

  const asnSatpel = useMemo(() => {
    return filteredData.filter((pegawai) => isASN(pegawai) && isSatpelSpesifik(pegawai));
  }, [filteredData]);

  const nonAsnSatpel = useMemo(() => {
    return filteredData.filter((pegawai) => !isASN(pegawai) && isSatpelSpesifik(pegawai));
  }, [filteredData]);

  // =====================================================
  // TABLE OPTIONS
  // =====================================================

  const tableOptions = useMemo<TableOption[]>(
    () => [
      {
        key: "asnNonSatpel",
        label: "ASN — BBPVP MAKASSAR",
        shortLabel: "asn-bbpvp",
        description: "ASN yang berada di lingkungan BBPVP Makassar.",
        data: asnNonSatpel,
      },
      {
        key: "nonAsnNonSatpel",
        label: "NON ASN — BBPVP MAKASSAR",
        shortLabel: "non-asn-bbpvp",
        description: "Non ASN yang berada di lingkungan BBPVP Makassar.",
        data: nonAsnNonSatpel,
      },
      {
        key: "asnSatpel",
        label: "ASN — SATPEL",
        shortLabel: "asn-satpel",
        description: "ASN pada Satpel Mamuju, Majene, dan Palu.",
        data: asnSatpel,
      },
      {
        key: "nonAsnSatpel",
        label: "NON ASN — SATPEL",
        shortLabel: "non-asn-satpel",
        description: "Non ASN pada Satpel Mamuju, Majene, dan Palu.",
        data: nonAsnSatpel,
      },
    ],
    [asnNonSatpel, nonAsnNonSatpel, asnSatpel, nonAsnSatpel],
  );

  // =====================================================
  // DATA TABLE AKTIF
  // =====================================================

  const activeTableData = useMemo<TableOption>(() => {
    const selected = tableOptions.find((option) => option.key === activeTable);

    return selected ?? tableOptions[0];
  }, [activeTable, tableOptions]);

  // =====================================================
  // RECORD CUTI
  // =====================================================

  const getRecords = (pegawai: Pegawai, bulan: number) => {
    return (pegawai.riwayat_cuti || []).filter((cuti) => Number(cuti.tahun) === currentYear && Number(cuti.bulan_angka) === bulan);
  };

  // =====================================================
  // NILAI SEL
  // =====================================================

  const getCellValue = (pegawai: Pegawai, bulan: number, jenis: string) => {
    return getRecords(pegawai, bulan)
      .filter((cuti) => cuti.jenis_cuti === jenis)
      .reduce((total, cuti) => total + (Number(cuti.durasi) || 0), 0);
  };

  // =====================================================
  // KETERANGAN PER BULAN
  // =====================================================

  const getMonthKeterangan = (pegawai: Pegawai, bulan: number) => {
    const records = getRecords(pegawai, bulan);

    return records
      .filter((record) => {
        if (!("keterangan" in record)) {
          return false;
        }

        const value = record.keterangan;

        return typeof value === "string" && value.trim() !== "";
      })
      .map((record) => {
        const value = "keterangan" in record ? record.keterangan : "";

        return `${record.jenis_cuti}: ${String(value)}`;
      })
      .join(" | ");
  };

  // =====================================================
  // CUTI TAHUNAN PER BULAN
  // =====================================================

  const getAnnualLeaveByMonth = (pegawai: Pegawai, bulan: number) => {
    return getCellValue(pegawai, bulan, "Tahunan");
  };

  // =====================================================
  // TOTAL CUTI TAHUNAN
  // =====================================================

  const getTotalCutiTahunan = (pegawai: Pegawai) => {
    return BULAN.reduce((total, bulan) => total + getAnnualLeaveByMonth(pegawai, bulan.angka), 0);
  };

  // =====================================================
  // SISA KUOTA
  //
  // SISA TAHUN LALU + THN 2026
  // - JANUARI - FEBRUARI - ... - DESEMBER
  // =====================================================

  const getSisaKuota = (pegawai: Pegawai) => {
    const sisaTahunLalu = Number(pegawai.sisa_cuti_tahun_lalu) || 0;

    const sisaTahunIni = Number(pegawai.cuti_tahun_ini) || 0;

    const totalCutiTahunan = getTotalCutiTahunan(pegawai);

    return sisaTahunLalu + sisaTahunIni - totalCutiTahunan;
  };

  // =====================================================
  // BUKA MODAL CUTI
  // =====================================================

  const openCutiModal = (pegawai: Pegawai, bulan: number, jenis: string) => {
    const nilai = getCellValue(pegawai, bulan, jenis);

    setSelectedCell({
      pegawai,
      bulan,
      jenis,
      nilai,
    });

    setDurasi("");
    setKeterangan("");
    setModalType("CUTI");
  };

  // =====================================================
  // BUKA MODAL RESET
  // =====================================================

  const openResetModal = (pegawai: Pegawai) => {
    setSelectedCell({
      pegawai,
      bulan: 0,
      jenis: "",
      nilai: 0,
    });

    setCutiTahunIni(Number(pegawai.cuti_tahun_ini) || 0);

    setSisaLalu(Number(pegawai.sisa_cuti_tahun_lalu) || 0);

    setModalType("RESET");
  };

  // =====================================================
  // BUKA MODAL BERSIHKAN
  // =====================================================

  const openBersihkanModal = (pegawai: Pegawai) => {
    setSelectedCell({
      pegawai,
      bulan: 0,
      jenis: "",
      nilai: 0,
    });

    setModalType("BERSIHKAN");
  };

  // =====================================================
  // SIMPAN CUTI
  // =====================================================

  const handleSaveCuti = async () => {
    if (!selectedCell) {
      return;
    }

    const jumlah = Number(durasi);

    if (!jumlah || jumlah <= 0) {
      alert("Durasi cuti harus lebih dari 0 hari.");
      return;
    }

    const pegawai = selectedCell.pegawai;

    // Untuk validasi, gunakan kuota sumber
    // tanpa mengubah nilai sisa_tahun_lalu
    // dan cuti_tahun_ini di database.
    const totalKuota = Number(pegawai.cuti_tahun_ini) + Number(pegawai.sisa_cuti_tahun_lalu);

    if (selectedCell.jenis === "Tahunan") {
      const cutiLama = selectedCell.nilai;

      const sisaKuotaSaatIni = totalKuota - getTotalCutiTahunan(pegawai);

      const sisaSetelahMengembalikanCell = sisaKuotaSaatIni + cutiLama;

      if (jumlah > sisaSetelahMengembalikanCell) {
        alert(`Kuota tidak cukup. Sisa kuota yang tersedia: ${sisaSetelahMengembalikanCell} hari.`);
        return;
      }
    }

    setIsLoading(true);

    try {
      if (selectedCell.jenis === "Tahunan") {
        const result = await simpanCutiTahunan(pegawai.id, selectedCell.bulan, currentYear, jumlah);

        if (!result.success) {
          alert(result.message || "Gagal menyimpan cuti.");
          return;
        }
      } else {
        const formData = new FormData();

        formData.append("pegawaiId", String(pegawai.id));

        formData.append("jenis", selectedCell.jenis);

        formData.append("bulan", String(selectedCell.bulan));

        formData.append("durasi", String(jumlah));

        formData.append("keterangan", keterangan);

        const result = await simpanCutiLainnya(formData);

        if (!result.success) {
          alert(result.message || "Gagal menyimpan cuti.");
          return;
        }
      }

      closeModal();
      router.refresh();
    } catch (error) {
      console.error(error);

      alert("Terjadi kesalahan saat menyimpan cuti.");
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================
  // RESET KUOTA
  // =====================================================

  const handleReset = async () => {
    if (!selectedCell) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetCutiPegawai(selectedCell.pegawai.id, Number(cutiTahunIni), Number(sisaLalu));

      if (!result.success) {
        alert(result.message || "Gagal mereset kuota.");
        return;
      }

      closeModal();
      router.refresh();
    } catch (error) {
      console.error(error);

      alert("Terjadi kesalahan saat reset kuota.");
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================
  // HAPUS DATA PADA SEL
  // =====================================================

  const handleHapusCell = async () => {
    if (!selectedCell) {
      return;
    }

    const { pegawai, bulan, jenis } = selectedCell;

    setIsLoading(true);

    try {
      const result = await hapusCuti(pegawai.id, bulan, currentYear, jenis);

      if (!result.success) {
        alert(result.message || "Gagal menghapus data cuti.");
        return;
      }

      closeModal();
      router.refresh();
    } catch (error) {
      console.error(error);

      alert("Terjadi kesalahan saat menghapus data cuti.");
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================
  // BERSIHKAN SELURUH DATA CUTI PEGAWAI
  // =====================================================

  const handleBersihkanSemua = async () => {
    if (!selectedCell) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await bersihkanSemuaCutiPegawai(selectedCell.pegawai.id, currentYear);

      if (!result.success) {
        alert(result.message || "Gagal membersihkan data cuti.");
        return;
      }

      closeModal();
      router.refresh();
    } catch (error) {
      console.error(error);

      alert("Terjadi kesalahan saat membersihkan data cuti.");
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================
  // TUTUP MODAL
  // =====================================================

  const closeModal = () => {
    setModalType(null);
    setSelectedCell(null);
    setDurasi("");
    setKeterangan("");
  };

  // =====================================================
  // DOWNLOAD EXCEL
  //
  // HANYA DATA ACTIVE TABLE
  // + MENGIKUTI SEARCH
  // =====================================================

  const handleDownloadExcel = () => {
    const data = activeTableData.data;

    if (data.length === 0) {
      alert("Tidak ada data pegawai untuk diekspor.");
      return;
    }

    const rows: Record<string, string | number>[] = data.map((pegawai, index) => {
      const row: Record<string, string | number> = {
        NO: index + 1,
        NIP: pegawai.nip,
        NAMA: pegawai.nama,
        JABATAN: pegawai.jabatan || "-",
        "BIDANG / UNIT KERJA": pegawai.bidang || "-",
        "STATUS KEPEGAWAIAN": pegawai.status_kepegawaian || "-",
        "SISA TAHUN LALU": Number(pegawai.sisa_cuti_tahun_lalu) || 0,
        [`THN ${currentYear}`]: Number(pegawai.cuti_tahun_ini) || 0,
      };

      BULAN.forEach((bulan) => {
        JENIS_CUTI.forEach((jenis) => {
          row[`${bulan.nama} - ${jenis.label}`] = getCellValue(pegawai, bulan.angka, jenis.key);
        });

        row[`${bulan.nama} - KETERANGAN`] = getMonthKeterangan(pegawai, bulan.angka) || "-";
      });

      row["TOTAL CUTI TAHUNAN"] = getTotalCutiTahunan(pegawai);

      row["SISA KUOTA"] = getSisaKuota(pegawai);

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Lebar kolom dasar
    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 30 },
      { wch: 32 },
      { wch: 28 },
      { wch: 22 },
      { wch: 18 },
      { wch: 14 },

      ...BULAN.flatMap(() => [{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 40 }]),

      { wch: 20 },
      { wch: 16 },
    ];

    // Freeze baris pertama
    worksheet["!freeze"] = {
      xSplit: 0,
      ySplit: 1,
    };

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Cuti");

    const safeLabel = activeTableData.shortLabel;

    XLSX.writeFile(workbook, `rekap-cuti-${safeLabel}-${currentYear}.xlsx`);
  };

  // =====================================================
  // RENDER TABLE
  // =====================================================

  const renderTable = (data: Pegawai[], label: string) => {
    const totalColumns = 5 + BULAN.length * JENIS_CUTI.length + 2;

    return (
      <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden">
        {/* TABLE HEADER */}
        <div className="px-4 py-4 border-b border-slate-200 bg-white">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#15406A]/10 text-[#15406A] flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M5 6h14M7 14h10M9 18h6" />
                  </svg>
                </div>

                <div>
                  <h2 className="text-base font-black text-slate-800">{label}</h2>

                  <p className="text-xs text-slate-500 mt-0.5">{activeTableData.description}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={data.length === 0}
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                px-4
                py-2.5
                rounded-xl
                bg-[#15406A]
                text-white
                text-xs
                font-black
                shadow-sm
                hover:bg-[#103653]
                disabled:opacity-40
                disabled:cursor-not-allowed
                transition-all
              "
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2" />
              </svg>
              Download Excel
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-auto max-h-[calc(100vh-330px)]">
          <table className="border-collapse text-[10px] whitespace-nowrap">
            <thead>
              <tr>
                {/* NO */}
                <th
                  rowSpan={2}
                  className="
                    sticky left-0 z-50
                    top-0
                    bg-white
                    border border-slate-300
                    px-3
                    w-12
                    text-center
                    font-black
                  "
                >
                  NO
                </th>

                {/* NIP */}
                <th
                  rowSpan={2}
                  className="
                    sticky left-12 z-50
                    top-0
                    bg-white
                    border border-slate-300
                    px-3
                    min-w-[150px]
                    text-center
                    font-black
                  "
                >
                  NIP
                </th>

                {/* NAMA */}
                <th
                  rowSpan={2}
                  className="
                    sticky left-[198px] z-50
                    top-0
                    bg-white
                    border border-slate-300
                    px-3
                    min-w-[220px]
                    text-center
                    font-black
                  "
                >
                  NAMA
                </th>

                {/* SISA TAHUN LALU */}
                <th
                  rowSpan={2}
                  className="
                  sticky 
                    border border-slate-300
                    top-0
                    px-3
                    min-w-[80px]
                    text-center
                    font-black
                    bg-slate-50
                  "
                >
                  SISA
                  <br />
                  TAHUN LALU
                </th>

                {/* THN 2026 */}
                <th
                  rowSpan={2}
                  className="
                  sticky
                    border border-slate-300
                    top-0
                    px-3
                    min-w-[70px]
                    text-center
                    font-black
                    bg-slate-50
                  "
                >
                  THN
                  <br />
                  {currentYear}
                </th>

                {/* BULAN */}
                {BULAN.map((bulan) => (
                  <th
                    key={bulan.angka}
                    colSpan={JENIS_CUTI.length}
                    className="
                      sticky
                        border border-slate-300
                        top-0
                        bg-slate-50
                        px-2
                        py-2
                        text-center
                        font-black
                      "
                  >
                    {bulan.nama}
                  </th>
                ))}

                {/* SISA KUOTA */}
                <th
                  rowSpan={2}
                  className="
                    sticky right-[100px] z-50
                    border border-slate-300
                    px-3
                    top-0
                    text-center
                    font-black
                    bg-emerald-50
                    min-w-[100px]
                  "
                >
                  SISA
                  <br />
                  KUOTA
                </th>

                {/* ACTION */}
                <th
                  rowSpan={2}
                  className="
                    sticky right-0 z-50
                    border border-slate-300
                    top-0
                    px-3
                    text-center
                    font-black
                    bg-red-50
                    min-w-[100px]
                  "
                >
                  ACTION
                </th>
              </tr>

              {/* JENIS CUTI */}
              <tr>
                {BULAN.map((bulan) => (
                  <React.Fragment key={bulan.angka}>
                    {JENIS_CUTI.map((jenis) => (
                      <th
                        key={`${bulan.angka}-${jenis.key}`}
                        className="
                        sticky
                              border border-slate-300
                              bg-white
                              top-10
                              px-2
                              py-2
                              text-center
                              font-black
                              [writing-mode:vertical-rl]
                              rotate-180
                              h-[85px]
                              min-w-[40px]
                            "
                      >
                        {jenis.label}
                      </th>
                    ))}
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={totalColumns}
                    className="
                      py-16
                      text-center
                      text-slate-400
                      border border-slate-300
                    "
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7m16 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5m16 0H4" />
                      </svg>

                      <span>Data pegawai tidak ditemukan.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((pegawai, index) => {
                  const sisaKuota = getSisaKuota(pegawai);

                  return (
                    <tr
                      key={pegawai.id}
                      className="
                          hover:bg-blue-50/40
                          transition-colors
                        "
                    >
                      {/* NO */}
                      <td
                        className="
                            sticky left-0 z-30
                            bg-white
                            border border-slate-300
                            px-2
                            py-2
                            text-center
                            font-bold
                          "
                      >
                        {index + 1}
                      </td>

                      {/* NIP */}
                      <td
                        className="
                            sticky left-12 z-30
                            bg-white
                            border border-slate-300
                            px-2
                            py-2
                            font-mono
                            text-[9px]
                          "
                      >
                        {pegawai.nip}
                      </td>

                      {/* NAMA */}
                      <td
                        className="
                            sticky left-[198px] z-30
                            bg-white
                            border border-slate-300
                            px-2
                            py-2
                            min-w-[220px]
                          "
                      >
                        <div className="font-black text-slate-700">{pegawai.nama}</div>

                        <div className="text-[8px] text-slate-400">{pegawai.jabatan || "-"}</div>
                      </td>

                      {/* SISA TAHUN LALU */}
                      <td
                        className="
                            border border-slate-300
                            text-center
                            font-bold
                            bg-slate-50
                          "
                      >
                        {pegawai.sisa_cuti_tahun_lalu}
                      </td>

                      {/* THN 2026 */}
                      <td
                        className="
                            border border-slate-300
                            text-center
                            font-bold
                            bg-slate-50
                          "
                      >
                        {pegawai.cuti_tahun_ini}
                      </td>

                      {/* SEMUA BULAN */}
                      {BULAN.map((bulan) => (
                        <React.Fragment key={bulan.angka}>
                          {JENIS_CUTI.map((jenis) => {
                            const nilai = getCellValue(pegawai, bulan.angka, jenis.key);

                            return (
                              <td
                                key={`${bulan.angka}-${jenis.key}`}
                                onClick={() => openCutiModal(pegawai, bulan.angka, jenis.key)}
                                className="
                                        border border-slate-200
                                        text-center
                                        min-w-[40px]
                                        h-10
                                        cursor-pointer
                                        hover:bg-blue-100
                                        transition-colors
                                      "
                                title={`Klik untuk mencatat ${jenis.key} - ${bulan.nama}`}
                              >
                                {nilai > 0 ? (
                                  <span
                                    className="
                                            inline-flex
                                            items-center
                                            justify-center
                                            min-w-6
                                            h-6
                                            px-1
                                            rounded
                                            bg-blue-100
                                            text-[#15406A]
                                            font-black
                                          "
                                  >
                                    {nilai}
                                  </span>
                                ) : (
                                  <span className="text-slate-200">+</span>
                                )}
                              </td>
                            );
                          })}
                        </React.Fragment>
                      ))}

                      {/* SISA KUOTA */}
                      <td
                        className="
                            sticky right-[100px] z-30
                            border border-slate-300
                            text-center
                            font-black
                            bg-emerald-50
                            min-w-[100px]
                          "
                      >
                        <span className={sisaKuota < 0 ? "text-red-600" : sisaKuota <= 3 ? "text-amber-600" : "text-emerald-700"}>{sisaKuota}</span>
                      </td>

                      {/* ACTION */}
                      <td
                        className="
                            sticky right-0 z-30
                            border border-slate-300
                            text-center
                            bg-red-50
                            min-w-[100px]
                          "
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openResetModal(pegawai)}
                            className="
                                px-2
                                py-1
                                rounded-lg
                                bg-red-100
                                text-red-600
                                font-black
                                text-[9px]
                                hover:bg-red-200
                                transition
                              "
                          >
                            RESET
                          </button>

                          <button
                            type="button"
                            onClick={() => openBersihkanModal(pegawai)}
                            className="
                                px-2
                                py-1
                                rounded-lg
                                bg-slate-100
                                text-slate-600
                                font-black
                                text-[9px]
                                hover:bg-slate-200
                                transition
                              "
                            title="Bersihkan seluruh data cuti pegawai"
                          >
                            CLEAR
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div
          className="
            px-4
            py-3
            border-t
            border-slate-300
            bg-slate-50
            flex
            flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-2
            text-xs
            text-slate-500
          "
        >
          <span>
            Menampilkan <b className="text-slate-700">{data.length}</b> pegawai
          </span>

          <span>
            Total kolom: <b>{BULAN.length * JENIS_CUTI.length}</b> kolom cuti
          </span>
        </div>
      </div>
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
      {isLoading && <PageLoading />}

      <div className="w-full space-y-5 text-black">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-800">Daftar Sisa Cuti Pegawai</h1>

              <p className="text-sm text-slate-500 mt-1">Rekap pencatatan cuti pegawai tahun {currentYear}.</p>
            </div>

            <div className="relative w-full xl:w-96">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
              </svg>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, NIP, jabatan, atau bidang..."
                className="
                  w-full
                  pl-10
                  pr-4
                  py-3
                  rounded-xl
                  border border-slate-200
                  bg-slate-50
                  text-sm
                  font-medium
                  outline-none
                  focus:bg-white
                  focus:border-[#15406A]
                  focus:ring-2
                  focus:ring-blue-100
                "
              />
            </div>
          </div>
        </div>

        {/* =====================================================
            PETUNJUK
        ===================================================== */}

        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <span className="font-bold text-[#15406A]">💡 Cara penggunaan:</span>

            <span className="text-slate-600">Klik sel bulan untuk mencatat cuti.</span>

            <span className="flex items-center gap-1 text-slate-600">
              <span className="w-5 h-5 rounded bg-blue-100 inline-flex items-center justify-center font-bold text-[#15406A]">3</span>
              Sudah ada cuti
            </span>

            <span className="text-slate-600">
              Klik <b>RESET</b> untuk memperbaiki kuota.
            </span>

            <span className="text-slate-600">
              Klik <b>CLEAR</b> untuk menghapus seluruh riwayat cuti pegawai.
            </span>
          </div>
        </div>

        {/* =====================================================
            PILIH TABLE
        ===================================================== */}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Kelompok Pegawai</p>

              <h2 className="text-sm font-black text-slate-800 mt-1">Pilih data yang ingin ditampilkan</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 w-full lg:w-auto">
              {tableOptions.map((option) => {
                const isActive = activeTable === option.key;

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setActiveTable(option.key)}
                    className={`
                        px-4
                        py-3
                        rounded-xl
                        border
                        text-left
                        transition-all
                        ${isActive ? "bg-[#15406A] border-[#15406A] text-white shadow-md" : "bg-white border-slate-200 text-slate-600 hover:border-[#15406A]/40 hover:bg-slate-50"}
                      `}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black">{option.label}</span>

                      <span
                        className={`
                            min-w-6
                            h-6
                            px-1.5
                            rounded-lg
                            flex
                            items-center
                            justify-center
                            text-[10px]
                            font-black
                            ${isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}
                          `}
                      >
                        {option.data.length}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* =====================================================
            TABLE AKTIF
        ===================================================== */}

        {renderTable(activeTableData.data, activeTableData.label)}

        {/* =====================================================
            MODAL
        ===================================================== */}

        {modalType &&
          selectedCell &&
          typeof window !== "undefined" &&
          createPortal(
            <div
              className="
                fixed
                inset-0
                z-[9999]
                bg-black/40
                backdrop-blur-sm
                flex
                items-center
                justify-center
                p-4
              "
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                  closeModal();
                }
              }}
            >
              <div
                className="
                  bg-white
                  rounded-2xl
                  shadow-2xl
                  w-full
                  max-w-md
                  overflow-hidden
                "
              >
                {/* MODAL HEADER */}
                <div
                  className="
                    px-6
                    py-5
                    border-b
                    border-slate-100
                  "
                >
                  {modalType === "CUTI" && (
                    <>
                      <h2 className="text-lg font-black text-[#15406A]">Catat Cuti</h2>

                      <p className="text-xs text-slate-500 mt-1">{selectedCell.pegawai.nama}</p>
                    </>
                  )}

                  {modalType === "RESET" && (
                    <>
                      <h2 className="text-lg font-black text-red-600">Reset Kuota Cuti</h2>

                      <p className="text-xs text-slate-500 mt-1">{selectedCell.pegawai.nama}</p>
                    </>
                  )}

                  {modalType === "BERSIHKAN" && (
                    <>
                      <h2 className="text-lg font-black text-red-600">Bersihkan Data Cuti</h2>

                      <p className="text-xs text-slate-500 mt-1">{selectedCell.pegawai.nama}</p>
                    </>
                  )}
                </div>

                {/* MODAL BODY */}
                <div className="p-6">
                  {modalType === "CUTI" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl p-3">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Bulan</div>

                          <div className="text-sm font-black text-slate-700 mt-1">{BULAN.find((b) => b.angka === selectedCell.bulan)?.nama}</div>
                        </div>

                        <div className="bg-blue-50 rounded-xl p-3">
                          <div className="text-[10px] font-bold text-blue-400 uppercase">Jenis</div>

                          <div className="text-sm font-black text-[#15406A] mt-1">{selectedCell.jenis}</div>
                        </div>
                      </div>

                      {selectedCell.nilai > 0 && (
                        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
                          Sudah tercatat <b>{selectedCell.nilai} hari</b> pada bulan ini.
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Durasi Cuti</label>

                        <input
                          type="number"
                          min={1}
                          value={durasi}
                          onChange={(e) => setDurasi(e.target.value)}
                          placeholder="Contoh: 3"
                          autoFocus
                          className="
                            w-full
                            px-4
                            py-3
                            rounded-xl
                            border
                            border-slate-200
                            bg-slate-50
                            font-bold
                            outline-none
                            focus:bg-white
                            focus:border-[#15406A]
                            focus:ring-2
                            focus:ring-blue-100
                          "
                        />
                      </div>

                      {selectedCell.jenis !== "Tahunan" && (
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Keterangan</label>

                          <textarea
                            rows={3}
                            value={keterangan}
                            onChange={(e) => setKeterangan(e.target.value)}
                            placeholder="Keterangan cuti..."
                            className="
                              w-full
                              px-4
                              py-3
                              rounded-xl
                              border
                              border-slate-200
                              bg-slate-50
                              text-sm
                              outline-none
                              resize-none
                              focus:bg-white
                              focus:border-[#15406A]
                              focus:ring-2
                              focus:ring-blue-100
                            "
                          />
                        </div>
                      )}

                      {selectedCell.jenis === "Tahunan" && (
                        <div className="px-4 py-3 rounded-xl bg-blue-50 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Sisa kuota saat ini</span>

                            <b className="text-[#15406A] text-base">{getSisaKuota(selectedCell.pegawai)} hari</b>
                          </div>

                          {selectedCell.nilai > 0 && <p className="text-[10px] text-slate-400 mt-1">Nilai pada sel ini akan diganti, bukan ditambahkan.</p>}
                        </div>
                      )}
                    </div>
                  )}

                  {modalType === "RESET" && (
                    <div className="space-y-4">
                      <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-xs text-red-700">Reset akan mengubah kuota utama pegawai. Gunakan hanya jika terdapat kesalahan pencatatan.</div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Kuota Tahun Ini</label>

                        <input
                          type="number"
                          min={0}
                          value={cutiTahunIni}
                          onChange={(e) => setCutiTahunIni(Number(e.target.value))}
                          className="
                            w-full
                            px-4
                            py-3
                            rounded-xl
                            border
                            border-slate-200
                            font-bold
                            outline-none
                            focus:border-red-500
                            focus:ring-2
                            focus:ring-red-100
                          "
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Sisa Cuti Tahun Lalu</label>

                        <input
                          type="number"
                          min={0}
                          value={sisaLalu}
                          onChange={(e) => setSisaLalu(Number(e.target.value))}
                          className="
                            w-full
                            px-4
                            py-3
                            rounded-xl
                            border
                            border-slate-200
                            font-bold
                            outline-none
                            focus:border-red-500
                            focus:ring-2
                            focus:ring-red-100
                          "
                        />
                      </div>
                    </div>
                  )}

                  {modalType === "BERSIHKAN" && (
                    <div className="space-y-4">
                      <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h12" />
                        </svg>
                      </div>

                      <div className="text-center">
                        <h3 className="text-base font-black text-slate-800">Bersihkan seluruh data cuti?</h3>

                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                          Seluruh riwayat cuti tahun {currentYear} milik <b>{selectedCell.pegawai.nama}</b> akan dihapus.
                        </p>
                      </div>

                      <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600">
                        <b>Perhatian:</b> Tindakan ini tidak digunakan untuk mengubah kuota utama. Data sumber kuota tetap mengikuti nilai yang tersimpan pada pegawai.
                      </div>
                    </div>
                  )}
                </div>

                {/* MODAL FOOTER */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={closeModal}
                    className="
                      flex-1
                      px-4
                      py-3
                      rounded-xl
                      bg-white
                      border
                      border-slate-200
                      font-bold
                      text-slate-600
                      hover:bg-slate-100
                      transition
                    "
                  >
                    Batal
                  </button>

                  {modalType === "CUTI" && (
                    <>
                      {selectedCell.nilai > 0 && (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={handleHapusCell}
                          className="
                            px-4
                            py-3
                            rounded-xl
                            bg-red-100
                            text-red-600
                            font-bold
                            hover:bg-red-200
                            transition
                          "
                        >
                          Hapus
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={handleSaveCuti}
                        className="
                          flex-1
                          px-4
                          py-3
                          rounded-xl
                          bg-[#15406A]
                          text-white
                          font-bold
                          hover:bg-blue-900
                          transition
                        "
                      >
                        {isLoading ? "Menyimpan..." : "Simpan Cuti"}
                      </button>
                    </>
                  )}

                  {modalType === "RESET" && (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleReset}
                      className="
                        flex-1
                        px-4
                        py-3
                        rounded-xl
                        bg-red-600
                        text-white
                        font-bold
                        hover:bg-red-700
                        transition
                      "
                    >
                      {isLoading ? "Mereset..." : "Reset Sekarang"}
                    </button>
                  )}

                  {modalType === "BERSIHKAN" && (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleBersihkanSemua}
                      className="
                        flex-1
                        px-4
                        py-3
                        rounded-xl
                        bg-red-600
                        text-white
                        font-bold
                        hover:bg-red-700
                        transition
                      "
                    >
                      {isLoading ? "Membersihkan..." : "Bersihkan Data"}
                    </button>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )}
      </div>
    </>
  );
}
