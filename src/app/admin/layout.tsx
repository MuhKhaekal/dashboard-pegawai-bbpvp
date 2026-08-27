import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  async function handleLogout() {
    'use server'
    const cookieStore = await cookies();
    cookieStore.delete('admin_session');
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar dengan efek gradient */}
      <aside className="w-72 bg-gradient-to-b from-[#15406A] to-[#0A2239] text-white flex flex-col shadow-2xl relative z-10">
        <div className="p-8 border-b border-white/10 flex items-center space-x-4">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg shadow-blue-900/50">
            {/* Ikon Logo Dummy - Bisa diganti gambar asli nantinya */}
            <span className="text-[#15406A] font-black text-xl">B</span>
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-widest text-white">BBPVP</h2>
            <p className="text-xs text-blue-200 font-medium tracking-wider mt-0.5">MAKASSAR</p>
          </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-3">
          <Link 
            href="/admin/database-pegawai"
            className="flex items-center space-x-3 w-full p-3.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 border-l-4 border-blue-400 shadow-md group"
          >
            <svg className="w-5 h-5 text-blue-300 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            <span className="font-semibold tracking-wide">Data Pegawai</span>
          </Link>
        </nav>

        <div className="p-6 border-t border-white/10">
          <form action={handleLogout}>
            <button type="submit" className="flex items-center space-x-3 w-full p-3 text-red-300 hover:text-white transition-all duration-300 rounded-xl hover:bg-red-500/20 group">
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              <span className="font-medium">Logout Admin</span>
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}