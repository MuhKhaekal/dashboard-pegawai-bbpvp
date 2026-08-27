"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { updatePegawai } from "../../data-pegawai/actions";

// 1. Tambahkan tipe data Pegawai di sini
export type Pegawai = {
  id: number;
  nama: string;
  nip: string;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  pangkat_golongan: string;
  tmt_pangkat_terakhir: string | null;
  jabatan: string;
  tmt_jabatan_terakhir: string | null;
  bidang: string;
  status_kepegawaian: string;
};

const SelectArrow = () => (
  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
    </svg>
  </div>
);

const formatForDB = (date: Date | null) => {
  if (!date) return "";
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

const formatNipAwal = (nipAsli: string) => {
  if (!nipAsli) return "";
  const val = nipAsli.replace(/\D/g, "");
  let res = "";
  if (val.length > 0) res += val.substring(0, 8);
  if (val.length > 8) res += " " + val.substring(8, 14);
  if (val.length > 14) res += " " + val.substring(14, 15);
  if (val.length > 15) res += " " + val.substring(15, 18);
  return res;
};

// 2. Ganti 'any' menjadi 'Pegawai'
export default function FormEditPegawai({ pegawai }: { pegawai: Pegawai }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [nip, setNip] = useState(formatNipAwal(pegawai.nip));

  // Konversi string database kembali menjadi objek Date untuk kalender
  const [tglLahir, setTglLahir] = useState<Date | null>(pegawai.tanggal_lahir ? new Date(pegawai.tanggal_lahir) : null);
  const [tmtPangkat, setTmtPangkat] = useState<Date | null>(pegawai.tmt_pangkat_terakhir ? new Date(pegawai.tmt_pangkat_terakhir) : null);
  const [tmtJabatan, setTmtJabatan] = useState<Date | null>(pegawai.tmt_jabatan_terakhir ? new Date(pegawai.tmt_jabatan_terakhir) : null);

  const handleNipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    let res = "";
    if (val.length > 0) res += val.substring(0, 8);
    if (val.length > 8) res += " " + val.substring(8, 14);
    if (val.length > 14) res += " " + val.substring(14, 15);
    if (val.length > 15) res += " " + val.substring(15, 18);
    setNip(res);
  };

  const onSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    await updatePegawai(pegawai.id, formData);
    setIsSubmitting(false);
    setShowModal(true);
  };

  const inputClass = "w-full bg-gray-50 border-gray-200 text-gray-800 rounded-xl border-2 p-3.5 focus:bg-white focus:border-[#15406A] focus:ring-4 focus:ring-[#15406A]/10 transition-all duration-300 outline-none font-medium";
  const selectWrapperClass = "relative w-full";
  const selectClass = `${inputClass} appearance-none cursor-pointer pr-10`;
  const labelClass = "block text-sm font-bold text-[#15406A] mb-1.5 ml-1";

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl scale-100 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-black text-gray-800 mb-2">Sukses!</h3>
            <p className="text-gray-500 font-medium mb-8">Data pegawai berhasil diperbarui.</p>
            <button onClick={() => router.push("/admin/data-pegawai")} className="w-full bg-[#15406A] hover:bg-blue-900 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-900/30">
              Kembali ke Tabel Data
            </button>
          </div>
        </div>
      )}

      <style>{`
        .react-datepicker-wrapper { width: 100%; }
        .react-datepicker__input-container input { width: 100%; }
        .react-datepicker-popper { z-index: 9999 !important; }
      `}</style>

      <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-xl border border-gray-100">
        <form action={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-6">
              <div className="relative z-[70]">
                <label className={labelClass}>Nama Lengkap & Gelar</label>
                <input type="text" name="nama" defaultValue={pegawai.nama} required className={inputClass} />
              </div>

              <div className="relative z-[65]">
                <label className={labelClass}>NIP</label>
                <input type="text" name="nip" value={nip} onChange={handleNipChange} maxLength={21} required className={`${inputClass} font-mono tracking-wider`} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative z-[60]">
                  <label className={labelClass}>Tempat Lahir</label>
                  <input type="text" name="tempat_lahir" defaultValue={pegawai.tempat_lahir || ""} required className={inputClass} />
                </div>

                <div className="relative z-[60]">
                  <label className={labelClass}>Tanggal Lahir</label>
                  <DatePicker selected={tglLahir} onChange={(date: Date | null) => setTglLahir(date)} dateFormat="dd/MM/yyyy" className={inputClass} required showMonthDropdown showYearDropdown dropdownMode="select" />
                  <input type="hidden" name="tanggal_lahir" value={formatForDB(tglLahir)} />
                </div>
              </div>

              <div className="relative z-[55]">
                <label className={labelClass}>Pangkat / Golongan</label>
                <div className={selectWrapperClass}>
                  <select name="pangkat_golongan" defaultValue={pegawai.pangkat_golongan} className={selectClass} required>
                    <optgroup label="Golongan I (Juru)">
                      <option value="I/a: Juru Muda">I/a: Juru Muda</option>
                      <option value="I/b: Juru Muda Tingkat I">I/b: Juru Muda Tingkat I</option>
                      <option value="I/c: Juru">I/c: Juru</option>
                      <option value="I/d: Juru Tingkat I">I/d: Juru Tingkat I</option>
                    </optgroup>
                    <optgroup label="Golongan II (Pengatur)">
                      <option value="II/a: Pengatur Muda">II/a: Pengatur Muda</option>
                      <option value="II/b: Pengatur Muda Tingkat I">II/b: Pengatur Muda Tingkat I</option>
                      <option value="II/c: Pengatur">II/c: Pengatur</option>
                      <option value="II/d: Pengatur Tingkat I">II/d: Pengatur Tingkat I</option>
                    </optgroup>
                    <optgroup label="Golongan III (Penata)">
                      <option value="III/a: Penata Muda">III/a: Penata Muda</option>
                      <option value="III/b: Penata Muda Tingkat I">III/b: Penata Muda Tingkat I</option>
                      <option value="III/c: Penata">III/c: Penata</option>
                      <option value="III/d: Penata Tingkat I">III/d: Penata Tingkat I</option>
                    </optgroup>
                    <optgroup label="Golongan IV (Pembina)">
                      <option value="IV/a: Pembina">IV/a: Pembina</option>
                      <option value="IV/b: Pembina Tingkat I">IV/b: Pembina Tingkat I</option>
                      <option value="IV/c: Pembina Utama Muda">IV/c: Pembina Utama Muda</option>
                      <option value="IV/d: Pembina Utama Madya">IV/d: Pembina Utama Madya</option>
                      <option value="IV/e: Pembina Utama">IV/e: Pembina Utama</option>
                    </optgroup>
                  </select>
                  <SelectArrow />
                </div>
              </div>

              <div className="relative z-[50]">
                <label className={labelClass}>TMT Pangkat Terakhir</label>
                <DatePicker selected={tmtPangkat} onChange={(date: Date | null) => setTmtPangkat(date)} dateFormat="dd/MM/yyyy" className={inputClass} required showMonthDropdown showYearDropdown dropdownMode="select" />
                <input type="hidden" name="tmt_pangkat_terakhir" value={formatForDB(tmtPangkat)} />
              </div>
            </div>

            <div className="space-y-6">
              <div className="relative z-[45]">
                <label className={labelClass}>Jabatan</label>
                <div className={selectWrapperClass}>
                  <select name="jabatan" defaultValue={pegawai.jabatan} className={selectClass} required>
                    <optgroup label="Struktural / Pimpinan">
                      <option value="Kepala BBPVP Makassar">Kepala BBPVP Makassar</option>
                      <option value="Kabag Umum">Kabag Umum</option>
                    </optgroup>
                    <optgroup label="Fungsional Instruktur">
                      <option value="Instruktur Ahli Utama">Instruktur Ahli Utama</option>
                      <option value="Instruktur Ahli Madya">Instruktur Ahli Madya</option>
                      <option value="Instruktur Ahli Muda">Instruktur Ahli Muda</option>
                      <option value="Instruktur Ahli Pertama">Instruktur Ahli Pertama</option>
                      <option value="Instruktur Mahir">Instruktur Mahir</option>
                      <option value="Instruktur Penyelia">Instruktur Penyelia</option>
                    </optgroup>
                    <optgroup label="Fungsional Khusus / Tertentu">
                      <option value="Analis Sumber Daya Manusia Aparatur Ahli Muda">Analis SDM Aparatur Ahli Muda</option>
                      <option value="Analis Sumber Daya Manusia Aparatur Ahli Pertama">Analis SDM Aparatur Ahli Pertama</option>
                      <option value="Pengantar Kerja Ahli Madya">Pengantar Kerja Ahli Madya</option>
                      <option value="Pengantar Kerja Ahli Muda">Pengantar Kerja Ahli Muda</option>
                      <option value="Pengantar Kerja Ahli Pertama">Pengantar Kerja Ahli Pertama</option>
                      <option value="Perencana Ahli Madya">Perencana Ahli Madya</option>
                      <option value="Perencana Ahli Pertama">Perencana Ahli Pertama</option>
                      <option value="Arsiparis Ahli Muda">Arsiparis Ahli Muda</option>
                      <option value="Arsiparis Ahli Pertama">Arsiparis Ahli Pertama</option>
                      <option value="Pranata Komputer Ahli Pertama">Pranata Komputer Ahli Pertama</option>
                      <option value="Pranata Komputer Terampil">Pranata Komputer Terampil</option>
                      <option value="Analis Pengelolaan Keuangan APBN Ahli Pertama">Analis Pengelolaan Keu. APBN Ahli Pertama</option>
                      <option value="Pranata Keuangan APBN Terampil">Pranata Keuangan APBN Terampil</option>
                      <option value="Penelaah Teknis Kebijakan">Penelaah Teknis Kebijakan</option>
                      <option value="Konselor SDM">Konselor SDM</option>
                    </optgroup>
                    <optgroup label="Pelaksana / Umum / Teknis">
                      <option value="Penata Layanan Operasional">Penata Layanan Operasional</option>
                      <option value="Pengelola Layanan Operasional">Penata Layanan Operasional</option>
                      <option value="Pengadministrasi Perkantoran">Pengadministrasi Perkantoran</option>
                      <option value="Penata Laksana Barang Terampil">Penata Laksana Barang Terampil</option>
                      <option value="Penata Kelola Sistem dan Teknologi Informasi">Penata Kelola Sistem & TI</option>
                      <option value="Teknisi Sarana dan Prasarana">Teknisi Sarana dan Prasarana</option>
                      <option value="Pramubakti">Pramubakti</option>
                    </optgroup>
                  </select>
                  <SelectArrow />
                </div>
              </div>

              <div className="relative z-[40]">
                <label className={labelClass}>TMT Jabatan Terakhir</label>
                <DatePicker selected={tmtJabatan} onChange={(date: Date | null) => setTmtJabatan(date)} dateFormat="dd/MM/yyyy" className={inputClass} required showMonthDropdown showYearDropdown dropdownMode="select" />
                <input type="hidden" name="tmt_jabatan_terakhir" value={formatForDB(tmtJabatan)} />
              </div>

              <div className="relative z-[35]">
                <label className={labelClass}>Bidang / Unit Kerja</label>
                <div className={selectWrapperClass}>
                  <select name="bidang" defaultValue={pegawai.bidang} className={selectClass} required>
                    <option value="Struktural">Struktural</option>
                    <option value="Instruktur Non Kejuruan">Instruktur Non Kejuruan</option>
                    <option value="Kej. Manufaktur">Kej. Manufaktur</option>
                    <option value="Kej. Otomotif">Kej. Otomotif</option>
                    <option value="Kej. Elektronika">Kej. Elektronika</option>
                    <option value="Kej. Listrik">Kej. Listrik</option>
                    <option value="Kej. Teknik Pendingin">Kej. Teknik Pendingin</option>
                    <option value="Kej. Garmen Apparel">Kej. Garmen Apparel</option>
                    <option value="Kej. Adminisitrasi Bisnis dan Manajemen">Kej. Adminisitrasi Bisnis dan Manajemen</option>
                    <option value="Kej. Teknik Las">Kej. Teknik Las</option>
                    <option value="Kej. Teknologi Informasi dan Komunikasi">Kej. Teknologi Informasi dan Komunikasi</option>
                    <option value="Kej. Tata Kecantikan">Kej. Tata Kecantikan</option>
                    <option value="Kej. Bangunan">Kej. Bangunan</option>
                    <option value="Kej. Pariwisata">Kej. Pariwisata</option>
                    <optgroup label="Bagian Umum">
                      <option value="Bagian Umum SDMA">-- Bagian Umum SDMA</option>
                      <option value="Bagian Umum Keuangan">-- Bagian Umum Keuangan</option>
                      <option value="Bagian Umum Pengadaaan">-- Bagian Umum Pengadaaan</option>
                      <option value="Bagian Umum Gudang">-- Bagian Umum Gudang</option>
                    </optgroup>
                    <option value="Bidang Pemberdayaan">Bidang Pemberdayaan</option>
                    <option value="Bidang Penyelenggara">Bidang Penyelenggara</option>
                    <option value="Bidang Intala dan Uji Coba Program">Bidang Intala dan Uji Coba Program</option>
                    <option value="LSP">LSP</option>
                    <option value="SATPEL">SATPEL</option>
                    <option value="Security">Security</option>
                    <option value="Cleaning Services">Cleaning Services</option>
                    <option value="Teknisi">Teknisi</option>
                    <option value="Driver">Driver</option>
                  </select>
                  <SelectArrow />
                </div>
              </div>

              <div className="relative z-[30]">
                <label className={labelClass}>Status Kepegawaian</label>
                <div className={selectWrapperClass}>
                  <select name="status_kepegawaian" defaultValue={pegawai.status_kepegawaian} className={selectClass} required>
                    <option value="PNS">PNS</option>
                    <option value="PPPK">PPPK</option>
                    <option value="Non ASN">Non ASN</option>
                  </select>
                  <SelectArrow />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-8 border-t border-gray-100">
            <button type="button" onClick={() => router.push("/admin/data-pegawai")} className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">
              Batal
            </button>
            <button type="submit" disabled={isSubmitting} className="px-10 py-4 bg-gradient-to-r from-[#15406A] to-[#215d9c] text-white font-bold rounded-xl shadow-lg hover:-translate-y-1 transition-transform">
              {isSubmitting ? "Memperbarui..." : "Perbarui Data Pegawai"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
