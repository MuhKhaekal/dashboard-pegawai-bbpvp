'use client'
import React, { useState } from 'react';
import Link from 'next/link';
import { hapusPegawai } from './actions';

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
  sisa_cuti_tahun_lalu: number;
  cuti_tahun_ini: number;
};

const URUTAN_BIDANG = [
  "Struktural", "Instruktur Non Kejuruan", "Kej. Manufaktur", "Kej. Otomotif", "Kej. Elektronika", 
  "Kej. Listrik", "Kej. Teknik Pendingin", "Kej. Garmen Apparel", "Kej. Adminisitrasi Bisnis dan Manajemen", 
  "Kej. Teknik Las", "Kej. Teknologi Informasi dan Komunikasi", "Kej. Tata Kecantikan", "Kej. Bangunan", 
  "Kej. Pariwisata", "Bagian Umum", "Bagian Umum SDMA", "Bagian Umum Keuangan", "Bagian Umum Pengadaaan", "Bagian Umum Gudang",
  "Bidang Pemberdayaan", "Bidang Penyelenggara", "Bidang Intala dan Uji Coba Program", 
  "LSP", "SATPEL", "Security", "Cleaning Services", "Teknisi", "Driver"
];

function formatTanggal(dateString: string | null) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

// FUNGSI KALKULASI MASA PENSIUN
function hitungMasaPensiun(tanggalLahir: string | null, jabatan: string, status: string) {
  if (!tanggalLahir) return { batasUmur: 0, sisaTeks: 'Data TTL Kosong', isPensiun: false, warna: 'bg-gray-100 text-gray-600' };

  let batasUmur = 58; 
  
  if (status !== 'PPPK') {
    if (jabatan.includes('Utama')) {
      batasUmur = 65; 
    } else if (jabatan.includes('Madya') || jabatan === 'Kepala BBPVP Makassar') {
      batasUmur = 60; 
    }
  }

  const tglLahirDate = new Date(tanggalLahir);
  const tglPensiun = new Date(tglLahirDate.getFullYear() + batasUmur, tglLahirDate.getMonth(), tglLahirDate.getDate());
  const now = new Date();

  let diffMonths = (tglPensiun.getFullYear() - now.getFullYear()) * 12 + (tglPensiun.getMonth() - now.getMonth());
  if (now.getDate() > tglPensiun.getDate()) {
    diffMonths--;
  }

  if (diffMonths <= 0) {
    return { batasUmur, sisaTeks: 'Sudah Pensiun', isPensiun: true, warna: 'bg-red-100 text-red-700 border-red-200' };
  }

  const sisaTahun = Math.floor(diffMonths / 12);
  const sisaBulan = diffMonths % 12;

  let sisaTeks = '';
  if (sisaTahun > 0) sisaTeks += `${sisaTahun} Thn `;
  if (sisaBulan > 0) sisaTeks += `${sisaBulan} Bln`;
  if (sisaTeks === '') sisaTeks = '< 1 Bln';

  const warna = sisaTahun < 1 ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  return { batasUmur, sisaTeks: sisaTeks.trim(), isPensiun: false, warna };
}

export default function TabelPegawaiClient({ data }: { data: Pegawai[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pegawaiToDelete, setPegawaiToDelete] = useState<Pegawai | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredData = data.filter(p => 
    p.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.nip.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.jabatan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedData: Record<string, Pegawai[]> = {};
  filteredData.forEach(p => {
    let bidang = p.bidang;
    if(bidang.includes('--')) bidang = bidang.replace('-- ', ''); 
    if (!groupedData[bidang]) groupedData[bidang] = [];
    groupedData[bidang].push(p);
  });

  const sortedBidangKeys = Object.keys(groupedData).sort((a, b) => {
    const indexA = URUTAN_BIDANG.indexOf(a);
    const indexB = URUTAN_BIDANG.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  const handleDeleteConfirm = async () => {
    if (!pegawaiToDelete) return;
    setIsDeleting(true);
    await hapusPegawai(pegawaiToDelete.id);
    setIsDeleting(false);
    setIsDeleteModalOpen(false);
    setPegawaiToDelete(null);
  };

  return (
    <>
      {/* MODAL KONFIRMASI HAPUS */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Hapus Data Pegawai?</h3>
            <p className="text-center text-gray-500 mb-6 text-sm">
              Anda yakin ingin menghapus <strong>{pegawaiToDelete?.nama}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting} className="w-1/2 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50">Batal</button>
              <button onClick={handleDeleteConfirm} disabled={isDeleting} className="w-1/2 px-4 py-2 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors flex justify-center items-center disabled:opacity-50">
                {isDeleting ? "Memproses..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABEL UTAMA */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        
        <div className="p-5 border-b border-gray-100 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <svg className="w-5 h-5 text-[#15406A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-800">Direktori Lengkap Pegawai</h2>
          </div>
          
          <div className="relative w-full md:w-[350px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input 
              type="text" 
              placeholder="Cari berdasarkan nama, NIP, atau jabatan..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg pl-9 pr-3 py-2 text-sm focus:bg-white focus:outline-none focus:border-[#15406A] focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Identitas Pegawai</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Kepangkatan & Jabatan</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Lahir & Status</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Informasi Cuti</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Sisa Masa Jabatan</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            
            <tbody className="bg-white">
              {sortedBidangKeys.length === 0 ? (
                <tr>
                  {/* Kolom diperbarui menjadi 6 karena ada tambahan kolom Cuti */}
                  <td colSpan={6} className="text-center py-10 text-sm text-gray-500">Data tidak ditemukan.</td>
                </tr>
              ) : (
                sortedBidangKeys.map((bidang) => (
                  <React.Fragment key={bidang}>
                    <tr className="bg-[#f4f7fa] border-y border-gray-200">
                      {/* Kolom diperbarui menjadi 6 */}
                      <td colSpan={6} className="px-4 py-2">
                        <div className="flex items-center space-x-2">
                          <span className="w-4 h-4 rounded bg-[#15406A] text-white flex items-center justify-center">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path></svg>
                          </span>
                          <span className="font-bold text-[#15406A] text-xs uppercase">{bidang}</span>
                          <span className="text-[10px] font-bold bg-white text-gray-500 px-2 py-0.5 rounded border border-gray-200">{groupedData[bidang].length}</span>
                        </div>
                      </td>
                    </tr>

                    {groupedData[bidang].map((p: Pegawai, index: number) => {
                      const pensiun = hitungMasaPensiun(p.tanggal_lahir, p.jabatan, p.status_kepegawaian);
                      const sisaLalu = p.sisa_cuti_tahun_lalu || 0;
                      const tahunIni = p.cuti_tahun_ini || 0;
                      const totalCuti = sisaLalu + tahunIni;

                      return (
                        <tr key={p.id} className={`group border-b border-gray-100 hover:bg-blue-50/40 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                          
                          {/* KOLOM 1: IDENTITAS */}
                          <td className="px-4 py-2.5 align-top">
                            <div className="flex flex-col leading-tight">
                              <span className="text-sm font-bold text-gray-900 group-hover:text-[#15406A]">{p.nama}</span>
                              <span className="text-[11px] font-mono text-gray-500 tracking-wide mt-0.5">{p.nip}</span>
                              <span className="text-[10px] font-semibold text-gray-400 mt-1 uppercase tracking-wider">{p.bidang}</span>
                            </div>
                          </td>

                          {/* KOLOM 2: PANGKAT & JABATAN */}
                          <td className="px-4 py-2.5 align-top">
                            <div className="flex flex-col leading-tight space-y-1.5">
                              <div>
                                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{p.jabatan}</span>
                                <p className="text-[10px] text-gray-500 mt-0.5 ml-0.5">TMT Jab: {formatTanggal(p.tmt_jabatan_terakhir)}</p>
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-gray-700 ml-0.5">{p.pangkat_golongan}</span>
                                <p className="text-[10px] text-gray-500 mt-0.5 ml-0.5">TMT Pangkat: {formatTanggal(p.tmt_pangkat_terakhir)}</p>
                              </div>
                            </div>
                          </td>

                          {/* KOLOM 3: TTL & STATUS */}
                          <td className="px-4 py-2.5 align-top">
                             <div className="flex flex-col leading-tight space-y-1.5">
                              <div>
                                <span className="text-xs font-semibold text-gray-800">{p.tempat_lahir || '-'}</span>
                                <p className="text-[11px] text-gray-500">{formatTanggal(p.tanggal_lahir)}</p>
                              </div>
                              <div>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border
                                  ${p.status_kepegawaian === 'PNS' ? 'bg-green-50 text-green-700 border-green-200' : 
                                    p.status_kepegawaian === 'PPPK' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                    'bg-amber-50 text-amber-700 border-amber-200'}`}
                                >
                                  {p.status_kepegawaian}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* KOLOM 4: INFORMASI CUTI (FITUR BARU) */}
                          <td className="px-4 py-2.5 align-top text-center">
                             <div className="flex flex-col items-center justify-center space-y-1.5 h-full">
                                <div className="text-[10px] font-medium text-gray-500 flex items-center space-x-2">
                                  <span title="Sisa Cuti Tahun Lalu">Lalu: <strong className="text-gray-800">{sisaLalu}</strong></span>
                                  <span className="text-gray-300">|</span>
                                  <span title="Cuti Tahun Ini">Kini: <strong className="text-gray-800">{tahunIni}</strong></span>
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold border shadow-sm
                                  ${totalCuti === 0 ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                                  Total: {totalCuti} Hari
                                </span>
                             </div>
                          </td>

                          {/* KOLOM 5: MASA PENSIUN */}
                          <td className="px-4 py-2.5 align-top text-center">
                            <div className="flex flex-col items-center justify-center h-full space-y-1">
                               <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                                 Batas: {pensiun.batasUmur} Thn
                               </span>
                               <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border shadow-sm whitespace-nowrap ${pensiun.warna}`}>
                                 {pensiun.sisaTeks}
                               </span>
                            </div>
                          </td>

                          {/* KOLOM 6: AKSI */}
                          <td className="px-4 py-2.5 align-middle text-right">
                             <div className="flex justify-end gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                               <Link href={`/admin/edit-pegawai/${p.id}`} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded border border-blue-100 transition-colors tooltip" title="Edit Data">
                                 <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                               </Link>
                               <button 
                                  onClick={() => { setPegawaiToDelete(p); setIsDeleteModalOpen(true); }}
                                  className="p-1.5 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded border border-red-100 transition-colors tooltip" 
                                  title="Hapus Data"
                                >
                                 <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                               </button>
                             </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}