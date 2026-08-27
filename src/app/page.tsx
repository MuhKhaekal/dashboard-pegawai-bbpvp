import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
      {/* Nantinya grafik/dashboard publik bisa ditaruh di sini */}
      <h1 className="text-4xl font-bold text-[#15406A] mb-4">
        Sistem Informasi Pegawai BBPVP
      </h1>
      <p className="text-gray-600 mb-8 text-center max-w-lg">
        Ini adalah halaman dashboard publik. Silakan login untuk mengelola database pegawai.
      </p>
      
      <Link 
        href="/admin/data-pegawai"
        className="bg-[#15406A] text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-900 transition shadow-lg"
      >
        Login ke Halaman Admin
      </Link>
    </div>
  );
}