'use client'
import { useState, useRef } from 'react';
import { tambahPegawai } from './actions';

export default function FormPegawai() {
  const [nip, setNip] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleNipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); 
    let res = '';
    if (val.length > 0) res += val.substring(0, 8);
    if (val.length > 8) res += ' ' + val.substring(8, 14);
    if (val.length > 14) res += ' ' + val.substring(14, 15);
    if (val.length > 15) res += ' ' + val.substring(15, 18);
    setNip(res);
  };

  const onSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    await tambahPegawai(formData);
    formRef.current?.reset();
    setNip('');
    setIsSubmitting(false);
    
    // Munculkan notifikasi sukses selama 3 detik
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const inputClass = "w-full bg-gray-50/50 border-gray-200 text-gray-800 rounded-xl border-2 p-3 focus:bg-white focus:border-[#15406A] focus:ring-4 focus:ring-[#15406A]/10 transition-all duration-300 outline-none";
  const labelClass = "block text-sm font-bold text-[#15406A] mb-1.5 ml-1";

  return (
    <div className="relative">
      
      {/* Toast Notifikasi Sukses */}
      <div className={`absolute -top-16 right-0 bg-green-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-green-500/30 flex items-center space-x-2 transition-all duration-500 z-50 ${showSuccess ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        <span>Data Pegawai Berhasil Disimpan!</span>
      </div>

      <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden group">
        
        {/* Dekorasi Form */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-amber-50 rounded-full blur-3xl opacity-50 -z-10 group-hover:scale-110 transition-transform duration-700"></div>

        <div className="flex items-center space-x-4 mb-8">
          <div className="bg-[#15406A] p-3 rounded-2xl shadow-lg shadow-blue-900/20 text-amber-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-[#15406A]">Formulir Data Pegawai</h2>
            <p className="text-gray-500 text-sm font-medium mt-1">Lengkapi informasi kepegawaian di bawah ini</p>
          </div>
        </div>
        
        <form ref={formRef} action={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
            
            {/* KOLOM KIRI */}
            <div className="space-y-6">
              <div className="transform transition-all duration-300 focus-within:-translate-y-1">
                <label className={labelClass}>Nama Lengkap & Gelar</label>
                <input type="text" name="nama" required className={inputClass} placeholder="Budi Santoso, S.Kom." />
              </div>
              <div className="transform transition-all duration-300 focus-within:-translate-y-1">
                <label className={labelClass}>NIP</label>
                <input type="text" name="nip" value={nip} onChange={handleNipChange} maxLength={21} placeholder="19691203 260184 1 001" required className={`${inputClass} font-mono tracking-wider`} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="transform transition-all duration-300 focus-within:-translate-y-1">
                  <label className={labelClass}>Tempat Lahir</label>
                  <input type="text" name="tempat_lahir" required className={inputClass} placeholder="Makassar" />
                </div>
                <div className="transform transition-all duration-300 focus-within:-translate-y-1">
                  <label className={labelClass}>Tanggal Lahir</label>
                  <input type="date" name="tanggal_lahir" required className={inputClass} />
                </div>
              </div>

              <div className="transform transition-all duration-300 focus-within:-translate-y-1">
                <label className={labelClass}>Pangkat / Golongan</label>
                <select name="pangkat_golongan" className={`${inputClass} cursor-pointer`}>
                  {/* Option Pangkat Sama Seperti Sebelumnya... */}
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
              
              <div className="transform transition-all duration-300 focus-within:-translate-y-1">
                <label className={labelClass}>TMT Pangkat Terakhir</label>
                <input type="date" name="tmt_pangkat_terakhir" className={inputClass} />
              </div>
            </div>

            {/* KOLOM KANAN */}
            <div className="space-y-6">
              <div className="transform transition-all duration-300 focus-within:-translate-y-1">
                <label className={labelClass}>Jabatan</label>
                <select name="jabatan" className={`${inputClass} cursor-pointer`}>
                  {/* Option Jabatan Sama Seperti Sebelumnya... */}
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
              
              <div className="transform transition-all duration-300 focus-within:-translate-y-1">
                <label className={labelClass}>TMT Jabatan Terakhir</label>
                <input type="date" name="tmt_jabatan_terakhir" className={inputClass} />
              </div>

              <div className="transform transition-all duration-300 focus-within:-translate-y-1">
                <label className={labelClass}>Bidang / Unit Kerja</label>
                <input type="text" name="bidang" required className={inputClass} placeholder="Pemberdayaan..." />
              </div>

              <div className="transform transition-all duration-300 focus-within:-translate-y-1">
                <label className={labelClass}>Status Kepegawaian</label>
                <select name="status_kepegawaian" className={`${inputClass} cursor-pointer`}>
                  <option value="PNS">PNS</option>
                  <option value="PPPK">PPPK</option>
                  <option value="Non ASN">Non ASN</option>
                </select>
              </div>
            </div>
            
          </div>

          <div className="flex justify-end pt-8 mt-6 border-t border-gray-100">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`relative overflow-hidden bg-gradient-to-r from-[#15406A] to-[#215d9c] text-white px-10 py-4 rounded-xl font-bold text-lg shadow-[0_8px_20px_rgba(21,64,106,0.3)] hover:shadow-[0_15px_25px_rgba(21,64,106,0.4)] hover:-translate-y-1 transition-all duration-300 group ${isSubmitting ? 'opacity-80 cursor-not-allowed' : ''}`}
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 scale-x-0 group-hover:scale-x-100 transform origin-left transition-transform duration-500"></div>
              <span className="relative flex items-center space-x-2">
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                    <span>Simpan Data Pegawai</span>
                  </>
                )}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}