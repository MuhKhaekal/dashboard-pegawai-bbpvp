'use client'
import { useState, useRef } from 'react';
import { tambahPegawai } from './actions';

export default function FormPegawai() {
  const [nip, setNip] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  // Logika otomatis spasi pada NIP (Format: 8 - 6 - 1 - 3)
  const handleNipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // Hanya boleh angka
    let res = '';
    if (val.length > 0) res += val.substring(0, 8);
    if (val.length > 8) res += ' ' + val.substring(8, 14);
    if (val.length > 14) res += ' ' + val.substring(14, 15);
    if (val.length > 15) res += ' ' + val.substring(15, 18);
    setNip(res);
  };

  const onSubmit = async (formData: FormData) => {
    // Karena action ditarik dari server, kita bungkus di sini agar form bisa dikosongkan setelah sukses
    await tambahPegawai(formData);
    formRef.current?.reset();
    setNip(''); // Kosongkan NIP state
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg border border-blue-50 animate-fade-in">
      <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-100">
        <div className="bg-blue-100 p-2 rounded-lg">
          <svg className="w-6 h-6 text-[#15406A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
        </div>
        <h2 className="text-xl font-bold text-[#15406A]">Tambah Data Pegawai</h2>
      </div>
      
      <form ref={formRef} action={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Kolom Kiri */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Lengkap & Gelar</label>
              <input type="text" name="nama" required className="w-full border-gray-300 rounded-lg shadow-sm border p-2.5 focus:ring-2 focus:ring-[#15406A] focus:border-[#15406A] transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">NIP</label>
              <input type="text" name="nip" value={nip} onChange={handleNipChange} maxLength={21} placeholder="19691203 260184 1 001" required className="w-full border-gray-300 rounded-lg shadow-sm border p-2.5 font-mono focus:ring-2 focus:ring-[#15406A] transition-all" />
            </div>
            
            {/* TTL */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tempat Lahir</label>
                <input type="text" name="tempat_lahir" required className="w-full border-gray-300 rounded-lg shadow-sm border p-2.5 focus:ring-2 focus:ring-[#15406A] transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal Lahir</label>
                <input type="date" name="tanggal_lahir" required className="w-full border-gray-300 rounded-lg shadow-sm border p-2.5 focus:ring-2 focus:ring-[#15406A] transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Pangkat / Golongan</label>
              <select name="pangkat_golongan" className="w-full border-gray-300 rounded-lg shadow-sm border p-2.5 focus:ring-2 focus:ring-[#15406A] transition-all bg-white cursor-pointer">
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
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">TMT Pangkat Terakhir</label>
              <input type="date" name="tmt_pangkat_terakhir" className="w-full border-gray-300 rounded-lg shadow-sm border p-2.5 focus:ring-2 focus:ring-[#15406A] transition-all" />
            </div>
          </div>

          {/* Kolom Kanan */}
          <div className="space-y-5">
             <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Jabatan</label>
              <select name="jabatan" className="w-full border-gray-300 rounded-lg shadow-sm border p-2.5 focus:ring-2 focus:ring-[#15406A] transition-all bg-white cursor-pointer">
                <option value="Struktural">Struktural</option>
                <option value="Instruktur Non Kejuruan">Instruktur Non Kejuruan</option>
                <option value="Kej. Manufaktur">Kej. Manufaktur</option>
                <option value="Kej. Otomotif">Kej. Otomotif</option>
                <option value="Kej. Elektronika">Kej. Elektronika</option>
                <option value="Kej. Listrik">Kej. Listrik</option>
                <option value="Kej. Teknik Pendingin">Kej. Teknik Pendingin</option>
                <option value="Kej. Garmen Apparel">Kej. Garmen Apparel</option>
                <option value="Kej. Administrasi Bisnis dan Manajemen">Kej. Adminisitrasi Bisnis dan Manajemen</option>
                <option value="Kej. Teknik Las">Kej. Teknik Las</option>
                <option value="Kej. Teknologi Informasi dan Komunikasi">Kej. Teknologi Informasi dan Komunikasi</option>
                <option value="Kej. Tata Kecantikan">Kej. Tata Kecantikan</option>
                <option value="Kej. Bangunan">Kej. Bangunan</option>
                <option value="Kej. Pariwisata">Kej. Pariwisata</option>
                <optgroup label="Bagian Umum">
                  <option value="Bagian Umum SDMA">-- Bagian Umum SDMA</option>
                  <option value="Bagian Umum Keuangan">-- Bagian Umum Keuangan</option>
                  <option value="Bagian Umum Pengadaan">-- Bagian Umum Pengadaaan</option>
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
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">TMT Jabatan Terakhir</label>
              <input type="date" name="tmt_jabatan_terakhir" className="w-full border-gray-300 rounded-lg shadow-sm border p-2.5 focus:ring-2 focus:ring-[#15406A] transition-all" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Bidang / Unit Kerja</label>
              <input type="text" name="bidang" required className="w-full border-gray-300 rounded-lg shadow-sm border p-2.5 focus:ring-2 focus:ring-[#15406A] transition-all" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Status Kepegawaian</label>
              <select name="status_kepegawaian" className="w-full border-gray-300 rounded-lg shadow-sm border p-2.5 focus:ring-2 focus:ring-[#15406A] transition-all bg-white cursor-pointer">
                <option value="PNS">PNS</option>
                <option value="PPPK">PPPK</option>
                <option value="Non ASN">Non ASN</option>
              </select>
            </div>
          </div>
          
        </div>
        <div className="flex justify-end pt-6">
          <button type="submit" className="bg-[#15406A] hover:bg-blue-900 text-white px-10 py-3 rounded-lg font-bold shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
            Simpan Data Pegawai
          </button>
        </div>
      </form>
    </div>
  );
}