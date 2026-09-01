"use client";

import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import type { Pegawai } from "./types";

import { simpanCutiTahunan, simpanCutiLainnya, resetCutiPegawai } from "../data-pegawai/actions";

interface ManajemenCutiClientProps {
  initialData: Pegawai[];
  sortedBidangKeys: string[];
  groupedData: Record<string, Pegawai[]>;
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
};

type ModalType = "CUTI" | "RESET" | null;

export default function ManajemenCutiClient({ initialData, sortedBidangKeys, groupedData }: ManajemenCutiClientProps) {
  const router = useRouter();

  const currentYear = new Date().getFullYear();

  const [search, setSearch] = useState("");

  const [modalType, setModalType] = useState<ModalType>(null);

  const [selectedCell, setSelectedCell] = useState<CellTarget | null>(null);

  const [durasi, setDurasi] = useState("");

  const [keterangan, setKeterangan] = useState("");

  const [cutiTahunIni, setCutiTahunIni] = useState<number>(12);

  const [sisaLalu, setSisaLalu] = useState<number>(0);

  const [isLoading, setIsLoading] = useState(false);

  // =====================================================
  // FILTER PEGAWAI
  // =====================================================

  const filteredData = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) {
      return initialData;
    }

    return initialData.filter((pegawai) => {
      return pegawai.nama.toLowerCase().includes(q) || pegawai.nip.toLowerCase().includes(q) || (pegawai.jabatan || "").toLowerCase().includes(q);
    });
  }, [initialData, search]);

  // =====================================================
  // MENGAMBIL NILAI CUTI PADA SEL
  // =====================================================

  const getCellValue = (pegawai: Pegawai, bulan: number, jenis: string) => {
    return (pegawai.riwayat_cuti || [])
      .filter((cuti) => {
        return Number(cuti.tahun) === currentYear && Number(cuti.bulan_angka) === bulan && cuti.jenis_cuti === jenis;
      })
      .reduce((total, cuti) => {
        return total + (Number(cuti.durasi) || 0);
      }, 0);
  };

  // =====================================================
  // BUKA INPUT CUTI
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
  // BUKA RESET
  // =====================================================

  const openResetModal = (pegawai: Pegawai) => {
    setSelectedCell({
      pegawai,
      bulan: 0,
      jenis: "",
      nilai: 0,
    });

    setCutiTahunIni(pegawai.cuti_tahun_ini);
    setSisaLalu(pegawai.sisa_cuti_tahun_lalu);

    setModalType("RESET");
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

    const totalKuota = pegawai.cuti_tahun_ini + pegawai.sisa_cuti_tahun_lalu;

    if (selectedCell.jenis === "Tahunan" && jumlah > totalKuota) {
      alert(`Kuota tidak cukup. Sisa kuota: ${totalKuota} hari.`);
      return;
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
  // TUTUP MODAL
  // =====================================================

  const closeModal = () => {
    setModalType(null);
    setSelectedCell(null);
    setDurasi("");
    setKeterangan("");
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="w-full space-y-5 text-black">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Daftar Sisa Cuti Pegawai</h1>

            <p className="text-sm text-slate-500 mt-1">Rekap pencatatan cuti pegawai tahun {currentYear}.</p>
          </div>

          <div className="relative w-full lg:w-80">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
            </svg>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NIP, atau jabatan..."
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

          <span className="text-slate-600">Klik sel bulan untuk mencatat cuti</span>

          <span className="flex items-center gap-1 text-slate-600">
            <span className="w-5 h-5 rounded bg-blue-100 inline-flex items-center justify-center font-bold text-[#15406A]">3</span>
            Sudah ada cuti
          </span>

          <span className="text-slate-600">
            Klik <b>RESET</b> untuk memperbaiki kuota
          </span>
        </div>
      </div>

      {/* =====================================================
          MATRIX
      ===================================================== */}

      <div className="bg-white border border-slate-300 shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-250px)]">
          <table className="border-collapse text-[10px] whitespace-nowrap">
            {/* =================================================
                HEADER BARIS 1
                ================================================= */}

            <thead>
              <tr>
                <th
                  rowSpan={2}
                  className="
                    sticky left-0 z-40
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

                <th
                  rowSpan={2}
                  className="
                    sticky left-12 z-40
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

                <th
                  rowSpan={2}
                  className="
                    sticky left-[198px] z-40
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

                <th
                  rowSpan={2}
                  className="
                    border border-slate-300
                    px-3
                    min-w-[70px]
                    text-center
                    font-black
                  "
                >
                  SISA
                  <br />
                  TAHUN LALU
                </th>

                <th
                  rowSpan={2}
                  className="
                    border border-slate-300
                    px-3
                    min-w-[60px]
                    text-center
                    font-black
                  "
                >
                  THN
                  <br />
                  {currentYear}
                </th>

                {BULAN.map((bulan) => (
                  <th
                    key={bulan.angka}
                    colSpan={JENIS_CUTI.length}
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

                <th
                  rowSpan={2}
                  className="
                    border border-slate-300
                    px-3
                    text-center
                    font-black
                    bg-red-50
                    min-w-[70px]
                  "
                >
                  RESET
                </th>
              </tr>

              {/* =================================================
                  HEADER JENIS CUTI
                  ================================================= */}

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
                        "
                      >
                        {jenis.label}
                      </th>
                    ))}
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            {/* =================================================
                BODY
                ================================================= */}

            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={5 + BULAN.length * JENIS_CUTI.length + 1}
                    className="
                      py-16
                      text-center
                      text-slate-400
                      border border-slate-300
                    "
                  >
                    Data pegawai tidak ditemukan.
                  </td>
                </tr>
              ) : (
                filteredData.map((pegawai, index) => {
                  const totalKuota = pegawai.cuti_tahun_ini + pegawai.sisa_cuti_tahun_lalu;

                  return (
                    <tr
                      key={pegawai.id}
                      className="
                        hover:bg-blue-50/30
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
                        "
                      >
                        <div className="font-black text-slate-700">{pegawai.nama}</div>

                        <div className="text-[8px] text-slate-400">{pegawai.jabatan}</div>
                      </td>

                      {/* SISA */}

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

                      {/* THN */}

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

                      {/* =================================================
                          SEMUA BULAN
                          ================================================= */}

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
                                title={`Tambah ${jenis.key} - ${bulan.nama}`}
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

                      {/* RESET */}

                      <td
                        className="
                          border border-slate-300
                          text-center
                          bg-red-50
                        "
                      >
                        <button
                          onClick={() => openResetModal(pegawai)}
                          className="
                            px-2
                            py-1
                            rounded
                            bg-red-100
                            text-red-600
                            font-black
                            hover:bg-red-200
                            transition
                          "
                        >
                          RESET
                        </button>
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
          justify-between
          text-xs
          text-slate-500
        "
        >
          <span>
            Menampilkan <b className="text-slate-700">{filteredData.length}</b> pegawai
          </span>

          <span>
            Total kolom: <b>{BULAN.length * JENIS_CUTI.length}</b> kolom cuti
          </span>
        </div>
      </div>

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
                px-6
                py-5
                border-b
                border-slate-100
              "
              >
                {modalType === "CUTI" ? (
                  <>
                    <h2
                      className="
                      text-lg
                      font-black
                      text-[#15406A]
                    "
                    >
                      Catat Cuti
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
                  </>
                ) : (
                  <>
                    <h2
                      className="
                      text-lg
                      font-black
                      text-red-600
                    "
                    >
                      Reset Kuota Cuti
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
                  </>
                )}
              </div>

              {/* BODY */}

              <div className="p-6">
                {modalType === "CUTI" ? (
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
                          uppercase
                        "
                        >
                          Bulan
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
                          uppercase
                        "
                        >
                          Jenis
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

                    {selectedCell.nilai > 0 && (
                      <div
                        className="
                        px-4
                        py-3
                        rounded-xl
                        bg-amber-50
                        border
                        border-amber-100
                        text-xs
                        text-amber-700
                      "
                      >
                        Sudah tercatat <b>{selectedCell.nilai} hari</b> pada bulan ini.
                      </div>
                    )}

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
                          "
                        />
                      </div>
                    )}

                    {selectedCell.jenis === "Tahunan" && (
                      <div
                        className="
                        flex
                        justify-between
                        items-center
                        px-4
                        py-3
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
                          {selectedCell.pegawai.cuti_tahun_ini + selectedCell.pegawai.sisa_cuti_tahun_lalu} hari
                        </b>
                      </div>
                    )}
                  </div>
                ) : (
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
                        Kuota Tahun Ini
                      </label>

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
                          px-4
                          py-3
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
              </div>

              {/* FOOTER */}

              <div
                className="
                px-6
                py-4
                bg-slate-50
                border-t
                border-slate-100
                flex
                gap-3"
              >
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
                  "
                >
                  Batal
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={modalType === "RESET" ? handleReset : handleSaveCuti}
                  className={`
                    flex-1
                    px-4
                    py-3
                    rounded-xl
                    text-white
                    font-bold
                    ${modalType === "RESET" ? "bg-red-600 hover:bg-red-700" : "bg-[#15406A] hover:bg-blue-900"}
                  `}
                >
                  {isLoading ? "Menyimpan..." : modalType === "RESET" ? "Reset Sekarang" : "Simpan Cuti"}
                </button>
              </div>
            </div>
          </div>,

          document.body,
        )}
    </div>
  );
}
