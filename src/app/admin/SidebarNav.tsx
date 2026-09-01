'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SidebarNav() {
  const pathname = usePathname();

  // Logika mendeteksi rute aktif
  const isDashboardActive = pathname === '/admin';
  const isDataPegawaiActive = pathname.startsWith('/admin/data-pegawai') || pathname.startsWith('/admin/edit-pegawai');
  const isTambahPegawaiActive = pathname.startsWith('/admin/tambah-pegawai');
  const isManajemenCutiActive = pathname.startsWith('/admin/manajemen-cuti'); // Tambahan rute baru

  // Fungsi untuk menutup sidebar secara otomatis di Mobile
  const handleMenuClick = () => {
    const checkbox = document.getElementById('mobile-menu') as HTMLInputElement | null;
    if (checkbox && checkbox.checked) {
      checkbox.checked = false;
    }
  };

  return (
    <nav className="flex-1 p-4 lg:p-5 space-y-2 lg:space-y-3 overflow-y-auto scrollbar-thin z-[99999]">
      
      {/* MENU 0: DASHBOARD */}
      <Link 
        href="/admin" 
        onClick={handleMenuClick}
        className={`flex items-center space-x-3 w-full p-3.5 lg:p-4 rounded-xl transition-all duration-300 border-l-4 shadow-sm group ${
          isDashboardActive 
            ? 'bg-white/20 border-amber-400 text-white' 
            : 'bg-white/5 border-transparent hover:border-amber-400 hover:bg-white/20 text-gray-300'
        }`}
      >
        <svg className={`w-5 h-5 transition-colors ${isDashboardActive ? 'text-amber-400' : 'text-blue-300 group-hover:text-amber-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
        <span className="font-bold tracking-wide text-sm lg:text-base">Dashboard</span>
      </Link>

      {/* MENU 1: TABEL DATA */}
      <Link 
        href="/admin/data-pegawai" 
        onClick={handleMenuClick}
        className={`flex items-center space-x-3 w-full p-3.5 lg:p-4 rounded-xl transition-all duration-300 border-l-4 shadow-sm group ${
          isDataPegawaiActive 
            ? 'bg-white/20 border-amber-400 text-white' 
            : 'bg-white/5 border-transparent hover:border-amber-400 hover:bg-white/20 text-gray-300'
        }`}
      >
        <svg className={`w-5 h-5 transition-colors ${isDataPegawaiActive ? 'text-amber-400' : 'text-blue-300 group-hover:text-amber-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
        <span className="font-bold tracking-wide text-sm lg:text-base">Data Pegawai</span>
      </Link>
      

      {/* MENU 3: MANAJEMEN CUTI */}
      <Link 
        href="/admin/manajemen-cuti" 
        onClick={handleMenuClick}
        className={`flex items-center space-x-3 w-full p-3.5 lg:p-4 rounded-xl transition-all duration-300 border-l-4 shadow-sm group ${
          isManajemenCutiActive 
            ? 'bg-white/20 border-amber-400 text-white' 
            : 'bg-white/5 border-transparent hover:border-amber-400 hover:bg-white/20 text-gray-300'
        }`}
      >
        <svg className={`w-5 h-5 transition-colors ${isManajemenCutiActive ? 'text-amber-400' : 'text-blue-300 group-hover:text-amber-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
        <span className="font-bold tracking-wide text-sm lg:text-base">Manajemen Cuti</span>
      </Link>
      
    </nav>
  );
}