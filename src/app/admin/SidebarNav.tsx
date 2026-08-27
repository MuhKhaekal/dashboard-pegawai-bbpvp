'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SidebarNav() {
  const pathname = usePathname();

  // Logika mendeteksi rute aktif
  // Data Pegawai akan tetap menyala meskipun admin sedang berada di halaman Edit Pegawai
  const isDataPegawaiActive = pathname.startsWith('/admin/data-pegawai') || pathname.startsWith('/admin/edit-pegawai');
  const isTambahPegawaiActive = pathname.startsWith('/admin/tambah-pegawai');

  return (
    <nav className="flex-1 p-5 space-y-3 overflow-y-auto">
      
      {/* MENU 1: TABEL DATA */}
      <Link 
        href="/admin/data-pegawai" 
        className={`flex items-center space-x-3 w-full p-4 rounded-xl transition-all duration-300 border-l-4 shadow-sm group ${
          isDataPegawaiActive 
            ? 'bg-white/20 border-amber-400 text-white' // Style jika Aktif
            : 'bg-white/5 border-transparent hover:border-amber-400 hover:bg-white/20 text-gray-300' // Style jika Tidak Aktif
        }`}
      >
        <svg className={`w-5 h-5 transition-colors ${isDataPegawaiActive ? 'text-amber-400' : 'text-blue-300 group-hover:text-amber-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
        <span className="font-bold tracking-wide">Data Pegawai</span>
      </Link>
      
      {/* MENU 2: TAMBAH DATA */}
      <Link 
        href="/admin/tambah-pegawai" 
        className={`flex items-center space-x-3 w-full p-4 rounded-xl transition-all duration-300 border-l-4 shadow-sm group ${
          isTambahPegawaiActive 
            ? 'bg-white/20 border-amber-400 text-white' // Style jika Aktif
            : 'bg-white/5 border-transparent hover:border-amber-400 hover:bg-white/20 text-gray-300' // Style jika Tidak Aktif
        }`}
      >
        <svg className={`w-5 h-5 transition-colors ${isTambahPegawaiActive ? 'text-amber-400' : 'text-blue-300 group-hover:text-amber-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
        <span className="font-bold tracking-wide">Tambah Pegawai</span>
      </Link>
      
    </nav>
  );
}