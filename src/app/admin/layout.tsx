import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SidebarNav from "./SidebarNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  async function handleLogout() {
    "use server";
    const cookieStore = await cookies();
    cookieStore.delete("admin_session");
    redirect("/login");
  }

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#F4F7F9] font-sans relative ">
      {/* 1. CHECKBOX HACK UNTUK TOGGLE MOBILE */}
      <input type="checkbox" id="mobile-menu" className="peer hidden" />

      {/* 2. OVERLAY GELAP (Muncul saat sidebar terbuka di HP) */}
      <label htmlFor="mobile-menu" className="fixed inset-0 bg-black/60 z-40 hidden peer-checked:block lg:hidden backdrop-blur-sm transition-opacity"></label>

      {/* 3. SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-50 w-72 h-full flex-shrink-0 bg-gradient-to-b from-[#15406A] to-[#0A1F35] text-white flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.15)] transform -translate-x-full peer-checked:translate-x-0 lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out">
        <div className="absolute top-0 left-0 w-full h-40 bg-white opacity-5 rounded-br-full pointer-events-none"></div>

        {/* Header Sidebar */}
        <div className="p-6 lg:p-8 border-b border-white/10 flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-3 lg:space-x-4">
            {/* LOGO SIDEBAR (Diberi background putih agar logo biru terlihat jelas) */}
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-xl flex items-center justify-center shadow-lg p-1.5 shrink-0">
              {/* Pastikan file logo Anda bernama logo-bbpvp.png dan berada di folder 'public' */}
              <img
                src="/logo-bbpvp.png"
                alt="Logo BBPVP Makassar"
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <h2 className="text-lg lg:text-xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">BBPVP</h2>
              <p className="text-[10px] lg:text-xs text-amber-400 font-bold tracking-widest mt-0.5">MAKASSAR</p>
            </div>
          </div>

          {/* Tombol Silang (Close) Khusus Mobile */}
          <label htmlFor="mobile-menu" className="lg:hidden p-2 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-colors">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </label>
        </div>

        <SidebarNav />

        <div className="p-5 border-t border-white/10 bg-black/10">
          <form action={handleLogout}>
            <button type="submit" className="flex items-center justify-center space-x-2 w-full p-3.5 text-red-300 hover:text-white hover:bg-red-500 rounded-xl transition-all duration-300 group font-semibold">
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
              <span>Logout Keluar</span>
            </button>
          </form>
        </div>
      </aside>

      {/* 4. MAIN CONTENT AREA (Area Utama) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        {/* MOBILE HEADER (Hanya muncul di layar kecil) */}
        <header className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-5 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex justify-items-center space-x-3">
            {/* LOGO MOBILE (Karena background headernya putih, logo biru Anda akan terlihat sempurna di sini tanpa perlu diubah) */}
            <img src="/logo-bbpvp.png" alt="Logo BBPVP Makassar" className="w-8 h-8 object-contain shrink-0" />

            <h1 className="font-bold text-gray-800 text-sm">BBPVP Makassar</h1>
          </div>

          {/* Tombol Hamburger untuk membuka Sidebar */}
          <label htmlFor="mobile-menu" className="p-2 -mr-2 bg-gray-50 text-[#15406A] rounded-lg cursor-pointer hover:bg-gray-200 transition-colors border border-gray-100 shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </label>
        </header>

        <main className="flex-1 overflow-y-auto scroll-smooth">{children}</main>
      </div>
    </div>
  );
}
