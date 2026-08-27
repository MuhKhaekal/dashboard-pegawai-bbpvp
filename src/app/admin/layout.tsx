// layout.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SidebarNav from './SidebarNav'; // 1. Import komponen navigasi baru

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  async function handleLogout() {
    'use server'
    const cookieStore = await cookies();
    cookieStore.delete('admin_session');
    redirect('/login');
  }

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#F4F7F9] font-sans">
      <aside className="w-72 h-full flex-shrink-0 bg-gradient-to-b from-[#15406A] to-[#0A1F35] text-white flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.15)] relative z-20">
        <div className="absolute top-0 left-0 w-full h-40 bg-white opacity-5 rounded-br-full pointer-events-none"></div>

        <div className="p-8 border-b border-white/10 flex items-center space-x-4 relative z-10">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
            <span className="text-white font-black text-2xl drop-shadow-md">B</span>
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">BBPVP</h2>
            <p className="text-xs text-amber-400 font-bold tracking-widest mt-0.5">MAKASSAR</p>
          </div>
        </div>
        
        {/* 2. Panggil komponen SidebarNav di sini (menggantikan <nav> lama) */}
        <SidebarNav />

        <div className="p-5 border-t border-white/10 bg-black/10">
          <form action={handleLogout}>
            <button type="submit" className="flex items-center justify-center space-x-2 w-full p-3.5 text-red-300 hover:text-white hover:bg-red-500 rounded-xl transition-all duration-300 group font-semibold">
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              <span>Logout Keluar</span>
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 h-full overflow-y-auto scroll-smooth">
        {children}
      </main>
    </div>
  );
}