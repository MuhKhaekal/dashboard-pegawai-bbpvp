"use client";

import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
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

type CellTarget = {
  pegawai: Pegawai;
  bulan: number;
  jenis: string;
  nilai: number;
  keterangan: string;
};

type ModalType = "CUTI" | "RESET" | "BERSIHKAN" | null;

const SATPEL_SPESIFIK = ["Satpel Mamuju", "Satpel Majene", "Satpel Palu"];

export default function ManajemenCutiClient({ initialData }: ManajemenCutiClientProps) {
  const router = useRouter();

  const currentYear = 2026;

  const [search, setSearch] = useState("");

  type ActiveTable = "asnNonSatpel" | "nonAsnNonSatpel" | "asnSatpel" | "nonAsnSatpel";

  const [activeTable, setActiveTable] = useState<ActiveTable>("asnNonSatpel");

  const [modalType, setModalType] = useState<ModalType>(null);

  const [selectedCell, setSelectedCell] = useState<CellTarget | null>(null);

  const [durasi, setDurasi] = useState("");

  const [keterangan, setKeterangan] = useState("");

  const [cutiTahunIni, setCutiTahunIni] = useState<number>(12);

  const [sisaLalu, setSisaLalu] = useState<number>(0);

  const [isLoading, setIsLoading] = useState(false);

  // ==========================================
  // URUTKAN NAMA A-Z
  // ==========================================

  const sortedData = useMemo(() => {
    return [...initialData].sort((a, b) =>
      a.nama.localeCompare(b.nama, "id", {
        sensitivity: "base",
      }),
    );
  }, [initialData]);

  // ==========================================
  // FILTER
  // ==========================================

  const filteredData = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) {
      return sortedData;
    }

    return sortedData.filter((pegawai) => pegawai.nama.toLowerCase().includes(q) || pegawai.nip.toLowerCase().includes(q) || (pegawai.jabatan || "").toLowerCase().includes(q) || (pegawai.bidang || "").toLowerCase().includes(q));
  }, [sortedData, search]);

  // ==========================================
  // PEMISAHAN ASN / NON-ASN
  // + NON SATPEL / SATPEL SPESIFIK
  // ==========================================

  const isSatpelSpesifik = (pegawai: Pegawai) => {
    return SATPEL_SPESIFIK.some((satpel) => pegawai.bidang?.trim().toLowerCase() === satpel.toLowerCase());
  };

  const isASN = (pegawai: Pegawai) => {
    const status = (pegawai.status_kepegawaian || "").trim().toLowerCase();

    return status === "pns" || status === "pppk";
  };

  const asnNonSatpel = filteredData.filter((pegawai) => isASN(pegawai) && !isSatpelSpesifik(pegawai));

  const nonAsnNonSatpel = filteredData.filter((pegawai) => !isASN(pegawai) && !isSatpelSpesifik(pegawai));

  const asnSatpel = filteredData.filter((pegawai) => isASN(pegawai) && isSatpelSpesifik(pegawai));

  const nonAsnSatpel = filteredData.filter((pegawai) => !isASN(pegawai) && isSatpelSpesifik(pegawai));

  // ==========================================
  // AMBIL RECORD
  // ==========================================

  const getRecords = (pegawai: Pegawai, bulan: number) => {
    return (pegawai.riwayat_cuti || []).filter((cuti) => Number(cuti.tahun) === currentYear && Number(cuti.bulan_angka) === bulan);
  };

  // ==========================================
  // NILAI CUTI PER JENIS
  // ==========================================

  const getCellValue = (pegawai: Pegawai, bulan: number, jenis: string) => {
    return getRecords(pegawai, bulan)
      .filter((cuti) => cuti.jenis_cuti === jenis)
      .reduce((total, cuti) => total + (Number(cuti.durasi) || 0), 0);
  };

  // ==========================================
  // KETERANGAN PER BULAN
  // ==========================================

  const getMonthKeterangan = (pegawai: Pegawai, bulan: number) => {
    const records = getRecords(pegawai, bulan);

    return records
      .filter((record) => record.keterangan && record.keterangan.trim() !== "")
      .map((record) => `${record.jenis_cuti}: ${record.keterangan}`)
      .join(" | ");
  };

  // ==========================================
  // TOTAL CUTI TAHUNAN PER BULAN
  // ==========================================

  const getAnnualLeaveByMonth = (pegawai: Pegawai, bulan: number) => {
    return getCellValue(pegawai, bulan, "Tahunan");
  };

  // ==========================================
  // KALKULASI SISA KUOTA
  //
  // Sisa tahun lalu
  // + kuota tahun 2026
  // - tahunan Jan
  // - tahunan Feb
  // ...
  // - tahunan Des
  // ==========================================

  const getSisaKuota = (pegawai: Pegawai) => {
    const sisaTahunLalu = Number(pegawai.sisa_cuti_tahun_lalu) || 0;

    const sisaTahunIni = Number(pegawai.cuti_tahun_ini) || 0;

    return sisaTahunLalu + sisaTahunIni;
  };

  // ==========================================
  // BUKA MODAL CUTI
  // ==========================================

  const openCutiModal = (pegawai: Pegawai, bulan: number, jenis: string) => {
    const nilai = getCellValue(pegawai, bulan, jenis);

    const records = getRecords(pegawai, bulan).filter((record) => record.jenis_cuti === jenis);

    const existingKeterangan = records
      .map((record) => record.keterangan || "")
      .filter(Boolean)
      .join(" | ");

    setSelectedCell({
      pegawai,
      bulan,
      jenis,
      nilai,
      keterangan: existingKeterangan,
    });

    // ======================================
    // PENTING:
    // Kalau sudah ada 3, modal akan
    // menampilkan 3.
    //
    // User tinggal ubah menjadi 2.
    // ======================================

    setDurasi(nilai > 0 ? String(nilai) : "");

    setKeterangan(existingKeterangan);

    setModalType("CUTI");
  };

  // ==========================================
  // RESET
  // ==========================================

  const openResetModal = (pegawai: Pegawai) => {
    setSelectedCell({
      pegawai,
      bulan: 0,
      jenis: "",
      nilai: 0,
      keterangan: "",
    });

    setCutiTahunIni(Number(pegawai.cuti_tahun_ini));

    setSisaLalu(Number(pegawai.sisa_cuti_tahun_lalu));

    setModalType("RESET");
  };

  // ==========================================
  // BERSIHKAN SEMUA CUTI
  // ==========================================

  const openBersihkanModal = (pegawai: Pegawai) => {
    setSelectedCell({
      pegawai,
      bulan: 0,
      jenis: "",
      nilai: 0,
      keterangan: "",
    });

    setModalType("BERSIHKAN");
  };

  // ==========================================
  // SIMPAN CUTI
  // ==========================================

  const handleSaveCuti = async () => {
    if (!selectedCell) {
      return;
    }

    const jumlah = Number(durasi);

    if (!Number.isInteger(jumlah) || jumlah <= 0) {
      alert("Durasi cuti harus lebih dari 0 hari.");
      return;
    }

    const pegawai = selectedCell.pegawai;

    setIsLoading(true);

    try {
      if (selectedCell.jenis === "Tahunan") {
        const result = await simpanCutiTahunan(pegawai.id, selectedCell.bulan, currentYear, jumlah, keterangan);

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

        formData.append("tahun", String(currentYear));

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

  // ==========================================
  // RESET KUOTA
  // ==========================================

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

  // ==========================================
  // BERSIHKAN SEMUA
  // ==========================================

  const handleBersihkanSemua = async () => {
    if (!selectedCell) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await bersihkanSemuaCutiPegawai(selectedCell.pegawai.id, currentYear);

      if (!result.success) {
        alert(result.message || "Gagal membersihkan data.");
        return;
      }

      closeModal();

      router.refresh();
    } catch (error) {
      console.error(error);

      alert("Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // HAPUS SATU CELL
  // ==========================================

  const handleHapusCell = async () => {
    if (!selectedCell) {
      return;
    }

    if (selectedCell.nilai <= 0) {
      return;
    }

    const yakin = confirm(`Hapus data ${selectedCell.jenis} bulan ${BULAN.find((b) => b.angka === selectedCell.bulan)?.nama}?`);

    if (!yakin) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await hapusCuti(selectedCell.pegawai.id, selectedCell.bulan, currentYear, selectedCell.jenis);

      if (!result.success) {
        alert(result.message || "Gagal menghapus.");
        return;
      }

      closeModal();

      router.refresh();
    } catch (error) {
      console.error(error);

      alert("Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // CLOSE
  // ==========================================

  const closeModal = () => {
    setModalType(null);
    setSelectedCell(null);
    setDurasi("");
    setKeterangan("");
  };

  // ==========================================
  // RENDER TABLE
  // ==========================================

  const renderTable = (data: Pegawai[], sectionTitle: string) => {
    return (
      <div className="space-y-2">
        <div
          className="
    bg-[#15406A]
    text-white
    px-4
    py-3
    flex
    items-center
    justify-between
    gap-3
  "
        >
          <div>
            <div className="font-black text-sm">{sectionTitle}</div>

            <div className="text-[10px] text-blue-100 mt-0.5">Rekap pencatatan cuti tahun {currentYear}</div>
          </div>

          <div
            className="
      px-3
      py-1.5
      rounded-lg
      bg-white/10
      border
      border-white/10
      text-xs
      font-black
      whitespace-nowrap
    "
          >
            {data.length} PEGAWAI
          </div>
        </div>

        <div className="border border-slate-300 bg-white shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-300px)]">
            <table className="border-collapse text-[10px] whitespace-nowrap">
              <thead>
                <tr>
                  {/* NO */}
                  <th
                    rowSpan={2}
                    className="
                      sticky left-0 z-[70]
                      bg-white
                      border border-slate-300
                      px-3
                      w-[50px]
                      min-w-[50px]
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
                      sticky left-[50px] z-[70]
                      bg-white
                      border border-slate-300
                      px-3
                      w-[150px]
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
                      sticky left-[200px] z-[70]
                      bg-white
                      border border-slate-300
                      px-3
                      w-[220px]
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
                      sticky left-[420px] z-[70]
                      bg-white
                      border border-slate-300
                      px-3
                      w-[75px]
                      min-w-[75px]
                      text-center
                      font-black
                    "
                  >
                    SISA
                    <br />
                    TAHUN
                    <br />
                    LALU
                  </th>

                  {/* THN 2026 */}
                  <th
                    rowSpan={2}
                    className="
                      sticky left-[495px] z-[70]
                      bg-white
                      border border-slate-300
                      px-3
                      w-[70px]
                      min-w-[70px]
                      text-center
                      font-black
                    "
                  >
                    THN
                    <br />
                    2026
                  </th>

                  {/* SISA KUOTA */}
                  <th
                    rowSpan={2}
                    className="
                      sticky left-[565px] z-[70]
                      bg-blue-50
                      border border-slate-300
                      px-3
                      w-[85px]
                      min-w-[85px]
                      text-center
                      font-black
                      text-[#15406A]
                      shadow-[4px_0_6px_-4px_rgba(0,0,0,0.4)]
                    "
                  >
                    SISA
                    <br />
                    KUOTA
                  </th>

                  {/* BULAN */}
                  {BULAN.map((bulan) => (
                    <th
                      key={bulan.angka}
                      colSpan={6}
                      className="
                          border border-slate-300
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

                  {/* ACTION */}
                  <th
                    rowSpan={2}
                    className="
                      border border-slate-300
                      bg-red-50
                      px-3
                      w-[100px]
                      min-w-[100px]
                      text-center
                      font-black
                    "
                  >
                    ACTION
                  </th>
                </tr>

                <tr>
                  {BULAN.map((bulan) => (
                    <React.Fragment key={bulan.angka}>
                      {JENIS_CUTI.map((jenis) => (
                        <th
                          key={`${bulan.angka}-${jenis.key}`}
                          className="
                                border border-slate-300
                                bg-white
                                px-2
                                py-2
                                text-center
                                font-black
                                [writing-mode:vertical-rl]
                                rotate-180
                                h-[85px]
                                min-w-[40px]
                                w-[40px]
                              "
                        >
                          {jenis.label}
                        </th>
                      ))}

                      {/* KETERANGAN */}
                      <th
                        className="
                            border border-slate-300
                            bg-amber-50
                            px-2
                            py-2
                            text-center
                            font-black
                            [writing-mode:vertical-rl]
                            rotate-180
                            h-[85px]
                            min-w-[80px]
                            w-[80px]
                          "
                      >
                        KETERANGAN
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6 + BULAN.length * 6 + 1}
                      className="
                        py-10
                        text-center
                        text-slate-400
                        border border-slate-300
                      "
                    >
                      Tidak ada data pegawai.
                    </td>
                  </tr>
                ) : (
                  data.map((pegawai, index) => {
                    const sisaKuota = getSisaKuota(pegawai);

                    return (
                      <tr key={pegawai.id} className="hover:bg-blue-50/30">
                        {/* NO */}
                        <td
                          className="
                              sticky left-0 z-[50]
                              bg-white
                              border border-slate-300
                              px-2 py-2
                              text-center
                              font-bold
                            "
                        >
                          {index + 1}
                        </td>

                        {/* NIP */}
                        <td
                          className="
                              sticky left-[50px] z-[50]
                              bg-white
                              border border-slate-300
                              px-2 py-2
                              font-mono
                              text-[9px]
                            "
                        >
                          {pegawai.nip}
                        </td>

                        {/* NAMA */}
                        <td
                          className="
                              sticky left-[200px] z-[50]
                              bg-white
                              border border-slate-300
                              px-2 py-2
                            "
                        >
                          <div className="font-black text-slate-700">{pegawai.nama}</div>

                          <div className="text-[8px] text-slate-400">{pegawai.jabatan}</div>

                          <div className="text-[8px] text-blue-500 font-semibold">{pegawai.bidang}</div>
                        </td>

                        {/* SISA LALU */}
                        <td
                          className="
                              sticky left-[420px] z-[50]
                              bg-slate-50
                              border border-slate-300
                              text-center
                              font-bold
                            "
                        >
                          {pegawai.sisa_cuti_tahun_lalu}
                        </td>

                        {/* THN */}
                        <td
                          className="
                              sticky left-[495px] z-[50]
                              bg-slate-50
                              border border-slate-300
                              text-center
                              font-bold
                            "
                        >
                          {pegawai.cuti_tahun_ini}
                        </td>

                        {/* SISA KUOTA */}
                        <td
                          className={`
                              sticky left-[565px] z-[50]
                              border border-slate-300
                              text-center
                              font-black
                              shadow-[4px_0_6px_-4px_rgba(0,0,0,0.4)]
                              ${sisaKuota < 0 ? "bg-red-100 text-red-600" : "bg-blue-50 text-[#15406A]"}
                            `}
                        >
                          {sisaKuota}
                        </td>

                        {/* BULAN */}
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
                                          w-[40px]
                                          h-10
                                          cursor-pointer
                                          hover:bg-blue-100
                                        "
                                  title={`Klik untuk ${nilai > 0 ? "mengubah" : "menambah"} ${jenis.key}`}
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

                            {/* KETERANGAN */}
                            <td
                              className="
                                    border border-slate-300
                                    bg-amber-50/40
                                    px-2
                                    py-1
                                    min-w-[80px]
                                    w-[80px]
                                    max-w-[120px]
                                    whitespace-normal
                                    text-[8px]
                                    text-slate-600
                                  "
                              title={getMonthKeterangan(pegawai, bulan.angka)}
                            >
                              {getMonthKeterangan(pegawai, bulan.angka) || <span className="text-slate-200">-</span>}
                            </td>
                          </React.Fragment>
                        ))}

                        {/* ACTION */}
                        <td
                          className="
                              border border-slate-300
                              bg-red-50
                              text-center
                              px-2
                            "
                        >
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => openResetModal(pegawai)}
                              className="
                                  px-2 py-1
                                  rounded
                                  bg-red-100
                                  text-red-600
                                  font-black
                                  text-[9px]
                                  hover:bg-red-200
                                "
                            >
                              RESET
                            </button>

                            <button
                              onClick={() => openBersihkanModal(pegawai)}
                              className="
                                  px-2 py-1
                                  rounded
                                  bg-slate-200
                                  text-slate-600
                                  font-black
                                  text-[9px]
                                  hover:bg-slate-300
                                "
                            >
                              BERSIHKAN
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

          <div
            className="
            px-4 py-3
            border-t border-slate-300
            bg-slate-50
            flex justify-between
            text-xs text-slate-500
          "
          >
            <span>
              Menampilkan <b className="text-slate-700">{data.length}</b> pegawai
            </span>

            <span>
              {BULAN.length} bulan × {JENIS_CUTI.length} jenis + keterangan
            </span>
          </div>
        </div>
      </div>
    );
  };

  const TABLE_OPTIONS = [
    {
      key: "asnNonSatpel" as ActiveTable,
      label: "ASN — BBPVP MAKASSAR",
      shortLabel: "ASN BBPVP",
      data: asnNonSatpel,
    },
    {
      key: "nonAsnNonSatpel" as ActiveTable,
      label: "NON ASN — BBPVP MAKASSAR",
      shortLabel: "NON ASN BBPVP",
      data: nonAsnNonSatpel,
    },
    {
      key: "asnSatpel" as ActiveTable,
      label: "ASN — SATPEL",
      shortLabel: "ASN SATPEL",
      data: asnSatpel,
    },
    {
      key: "nonAsnSatpel" as ActiveTable,
      label: "NON ASN — SATPEL",
      shortLabel: "NON ASN SATPEL",
      data: nonAsnSatpel,
    },
  ];

  const activeTableData = TABLE_OPTIONS.find((item) => item.key === activeTable) ?? TABLE_OPTIONS[0];

  // ==========================================
  // MAIN
  // ==========================================

  return (
    <div className="w-full space-y-5 text-black">
      {/* HEADER */}
      <div
        className="
        bg-white
        border border-slate-200
        rounded-2xl
        shadow-sm
        p-5
      "
      >
        <div
          className="
          flex flex-col
          lg:flex-row
          lg:items-center
          lg:justify-between
          gap-4
        "
        >
          <div>
            <h1
              className="
              text-2xl
              font-black
              text-slate-800
            "
            >
              Daftar Sisa Cuti Pegawai
            </h1>

            <p
              className="
              text-sm
              text-slate-500
              mt-1
            "
            >
              Rekap pencatatan cuti pegawai tahun {currentYear}.
            </p>
          </div>

          <div className="relative w-full lg:w-80">
            <svg
              className="
                absolute left-3
                top-1/2
                -translate-y-1/2
                w-4 h-4
                text-slate-400
              "
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
            </svg>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="
                Cari nama, NIP, jabatan,
                atau bidang...
              "
              className="
                w-full
                pl-10 pr-4 py-3
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

      {/* PETUNJUK */}
      <div
        className="
        bg-blue-50
        border border-blue-100
        rounded-xl
        px-4 py-3
      "
      >
        <div
          className="
          flex flex-wrap
          items-center
          gap-x-5
          gap-y-2
          text-xs
        "
        >
          <span
            className="
            font-bold
            text-[#15406A]
          "
          >
            💡 Cara penggunaan:
          </span>

          <span className="text-slate-600">Klik sel bulan untuk menambah atau mengubah cuti.</span>

          <span className="text-slate-600">
            Jika sudah ada <b>3</b>, masukkan <b>2</b> untuk menggantinya menjadi 2.
          </span>

          <span className="text-slate-600">
            Kolom biru <b>SISA KUOTA</b>
            dihitung otomatis.
          </span>
        </div>
      </div>

      {/* ==========================================
    PILIH TABEL
========================================== */}
      <div
        className="
    bg-white
    border border-slate-200
    rounded-2xl
    shadow-sm
    p-3
  "
      >
        <div className="flex flex-col gap-3">
          {/* LABEL */}
          <div className="px-2">
            <div className="text-xs font-black text-slate-500 uppercase tracking-wide">Kelompok Pegawai</div>

            <div className="text-[11px] text-slate-400 mt-0.5">Pilih kelompok untuk menampilkan tabel cuti</div>
          </div>

          {/* BUTTON */}
          <div
            className="
        grid
        grid-cols-1
        sm:grid-cols-2
        xl:grid-cols-4
        gap-2
      "
          >
            {TABLE_OPTIONS.map((item, index) => {
              const isActive = activeTable === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTable(item.key)}
                  className={`
              group
              relative
              overflow-hidden
              rounded-xl
              border
              px-4
              py-3
              text-left
              transition-all
              duration-200
              ${isActive ? "bg-[#15406A] border-[#15406A] text-white shadow-md" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-200"}
            `}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* TEXT */}
                      <div>
                        <div
                          className={`
                      text-xs
                      font-black
                      ${isActive ? "text-white" : "text-slate-700"}
                    `}
                        >
                          {item.shortLabel}
                        </div>

                        <div
                          className={`
                      text-[10px]
                      mt-0.5
                      ${isActive ? "text-blue-100" : "text-slate-400"}
                    `}
                        >
                          {item.data.length} pegawai
                        </div>
                      </div>
                    </div>

                    {/* CHECK */}
                    <div
                      className={`
                  flex
                  items-center
                  justify-center
                  w-6
                  h-6
                  rounded-full
                  shrink-0
                  ${isActive ? "bg-white text-[#15406A]" : "bg-slate-200 text-transparent"}
                `}
                    >
                      ✓
                    </div>
                  </div>

                  {/* ACTIVE INDICATOR */}
                  {isActive && (
                    <div
                      className="
                  absolute
                  bottom-0
                  left-0
                  right-0
                  h-1
                  bg-white/40
                "
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==========================================
    TABEL AKTIF
========================================== */}
      {renderTable(activeTableData.data, `${TABLE_OPTIONS.find((item) => item.key === activeTable)?.label}`)}

      {/* MODAL */}
      {modalType &&
        selectedCell &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="
            fixed inset-0
            z-[9999]
            bg-black/40
            backdrop-blur-sm
            flex items-center
            justify-center
            p-4
          "
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
              {/* HEADER */}
              <div
                className="
                px-6 py-5
                border-b
                border-slate-100
              "
              >
                <h2
                  className={`
                  text-lg
                  font-black
                  ${modalType === "RESET" ? "text-red-600" : modalType === "BERSIHKAN" ? "text-red-600" : "text-[#15406A]"}
                `}
                >
                  {modalType === "CUTI" && "Catat / Ubah Cuti"}

                  {modalType === "RESET" && "Reset Kuota Cuti"}

                  {modalType === "BERSIHKAN" && "Bersihkan Data Cuti"}
                </h2>

                <p
                  className="
                  text-xs
                  text-slate-500
                  mt-1
                "
                >
                  {selectedCell.pegawai.nama}
                </p>
              </div>

              {/* BODY */}
              <div className="p-6">
                {/* =====================
                    CUTI
                ====================== */}
                {modalType === "CUTI" && (
                  <div className="space-y-4">
                    <div
                      className="
                        grid
                        grid-cols-2
                        gap-3
                      "
                    >
                      <div
                        className="
                          bg-slate-50
                          rounded-xl
                          p-3
                        "
                      >
                        <div
                          className="
                            text-[10px]
                            font-bold
                            text-slate-400
                          "
                        >
                          BULAN
                        </div>

                        <div
                          className="
                            text-sm
                            font-black
                            text-slate-700
                            mt-1
                          "
                        >
                          {BULAN.find((b) => b.angka === selectedCell.bulan)?.nama}
                        </div>
                      </div>

                      <div
                        className="
                          bg-blue-50
                          rounded-xl
                          p-3
                        "
                      >
                        <div
                          className="
                            text-[10px]
                            font-bold
                            text-blue-400
                          "
                        >
                          JENIS
                        </div>

                        <div
                          className="
                            text-sm
                            font-black
                            text-[#15406A]
                            mt-1
                          "
                        >
                          {selectedCell.jenis}
                        </div>
                      </div>
                    </div>

                    {/* STATUS EDIT */}
                    {selectedCell.nilai > 0 && (
                      <div
                        className="
                          px-4 py-3
                          rounded-xl
                          bg-amber-50
                          border
                          border-amber-100
                          text-xs
                          text-amber-700
                        "
                      >
                        Data saat ini: <b>{selectedCell.nilai} hari</b>
                        <br />
                        <span className="text-[10px]">Mengubah nilai akan mengganti data lama, bukan menambahnya.</span>
                      </div>
                    )}

                    {/* DURASI */}
                    <div>
                      <label
                        className="
                          block
                          text-xs
                          font-bold
                          text-slate-600
                          mb-1.5
                        "
                      >
                        Durasi Cuti
                      </label>

                      <input
                        type="number"
                        min={1}
                        value={durasi}
                        onChange={(e) => setDurasi(e.target.value)}
                        autoFocus
                        className="
                            w-full
                            px-4 py-3
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

                    {/* KETERANGAN */}
                    <div>
                      <label
                        className="
                          block
                          text-xs
                          font-bold
                          text-slate-600
                          mb-1.5
                        "
                      >
                        Keterangan
                      </label>

                      <textarea
                        rows={3}
                        value={keterangan}
                        onChange={(e) => setKeterangan(e.target.value)}
                        placeholder="
                            Masukkan keterangan...
                          "
                        className="
                            w-full
                            px-4 py-3
                            rounded-xl
                            border
                            border-slate-200
                            bg-slate-50
                            text-sm
                            outline-none
                            resize-none
                            focus:bg-white
                            focus:border-[#15406A]
                          "
                      />
                    </div>

                    {/* SISA */}
                    {selectedCell.jenis === "Tahunan" && (
                      <div
                        className="
                          flex
                          justify-between
                          items-center
                          px-4 py-3
                          rounded-xl
                          bg-blue-50
                          text-xs
                        "
                      >
                        <span className="text-slate-500">Sisa kuota</span>

                        <b
                          className="
                            text-[#15406A]
                            text-base
                          "
                        >
                          {getSisaKuota(selectedCell.pegawai)} hari
                        </b>
                      </div>
                    )}
                  </div>
                )}

                {/* =====================
                    RESET
                ====================== */}
                {modalType === "RESET" && (
                  <div className="space-y-4">
                    <div
                      className="
                        bg-red-50
                        border
                        border-red-100
                        rounded-xl
                        p-4
                        text-xs
                        text-red-700
                      "
                    >
                      Reset akan mengubah kuota utama pegawai. Gunakan hanya jika terdapat kesalahan pencatatan.
                    </div>

                    <div>
                      <label
                        className="
                          block
                          text-xs
                          font-bold
                          text-slate-600
                          mb-1
                        "
                      >
                        Kuota Tahun 2026
                      </label>

                      <input
                        type="number"
                        min={0}
                        value={cutiTahunIni}
                        onChange={(e) => setCutiTahunIni(Number(e.target.value))}
                        className="
                            w-full
                            px-4 py-3
                            rounded-xl
                            border
                            border-slate-200
                            font-bold
                            outline-none
                            focus:border-red-500
                          "
                      />
                    </div>

                    <div>
                      <label
                        className="
                          block
                          text-xs
                          font-bold
                          text-slate-600
                          mb-1
                        "
                      >
                        Sisa Cuti Tahun Lalu
                      </label>

                      <input
                        type="number"
                        min={0}
                        value={sisaLalu}
                        onChange={(e) => setSisaLalu(Number(e.target.value))}
                        className="
                            w-full
                            px-4 py-3
                            rounded-xl
                            border
                            border-slate-200
                            font-bold
                            outline-none
                            focus:border-red-500
                          "
                      />
                    </div>
                  </div>
                )}

                {/* =====================
                    BERSIHKAN
                ====================== */}
                {modalType === "BERSIHKAN" && (
                  <div className="space-y-4">
                    <div
                      className="
                        bg-red-50
                        border
                        border-red-200
                        rounded-xl
                        p-4
                        text-sm
                        text-red-700
                      "
                    >
                      <b>PERINGATAN</b>

                      <p className="mt-2">
                        Seluruh riwayat cuti tahun <b>{currentYear}</b> pegawai ini akan dihapus.
                      </p>

                      <p className="mt-2">Gunakan fitur ini hanya jika Anda benar-benar ingin membersihkan data cuti pegawai.</p>
                    </div>

                    <div
                      className="
                        bg-slate-50
                        rounded-xl
                        p-4
                        text-xs
                        text-slate-600
                      "
                    >
                      Pegawai
                      <br />
                      <b className="text-slate-800">{selectedCell.pegawai.nama}</b>
                      <br />
                      NIP: {selectedCell.pegawai.nip}
                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER */}
              <div
                className="
                px-6 py-4
                bg-slate-50
                border-t
                border-slate-100
                flex gap-3
              "
              >
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={closeModal}
                  className="
                    flex-1
                    px-4 py-3
                    rounded-xl
                    bg-white
                    border
                    border-slate-200
                    font-bold
                    text-slate-600
                    hover:bg-slate-100
                  "
                >
                  Batal
                </button>

                {modalType === "CUTI" && selectedCell.nilai > 0 && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleHapusCell}
                    className="
                        px-4 py-3
                        rounded-xl
                        bg-red-100
                        text-red-600
                        font-bold
                        hover:bg-red-200
                      "
                  >
                    Hapus
                  </button>
                )}

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    if (modalType === "RESET") {
                      handleReset();
                    } else if (modalType === "BERSIHKAN") {
                      handleBersihkanSemua();
                    } else {
                      handleSaveCuti();
                    }
                  }}
                  className={`
                    flex-1
                    px-4 py-3
                    rounded-xl
                    text-white
                    font-bold
                    ${modalType === "RESET" || modalType === "BERSIHKAN" ? "bg-red-600 hover:bg-red-700" : "bg-[#15406A] hover:bg-blue-900"}
                  `}
                >
                  {isLoading ? "Memproses..." : modalType === "RESET" ? "Reset Sekarang" : modalType === "BERSIHKAN" ? "Bersihkan Data" : selectedCell.nilai > 0 ? "Ubah Cuti" : "Simpan Cuti"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
