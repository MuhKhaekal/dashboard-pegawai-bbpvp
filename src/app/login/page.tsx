import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT } from "jose";
import Link from "next/link";

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "kunci_cadangan");

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  async function handleLogin(formData: FormData) {
    "use server";
    const username = formData.get("username");
    const password = formData.get("password");

    if (username === "admin" && password === "adminbbpvp123") {
      const token = await new SignJWT({ role: "admin" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("8h").sign(SECRET_KEY);

      const cookieStore = await cookies();
      cookieStore.set("admin_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      redirect("/admin");
    } else {
      redirect("/login?error=1");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#15406A] via-[#0a233f] to-[#041222] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* --- DEKORASI BACKGROUND (Efek Cahaya/Blob) --- */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>

      {/* --- CSS ANIMASI --- */}
      <style>{`
        @keyframes fadeScaleUp {
          0% { opacity: 0; transform: scale(0.95) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-login-card {
          animation: fadeScaleUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* --- KARTU LOGIN --- */}
      <div className="bg-white p-10 md:p-12 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-md relative z-10 animate-login-card border border-white/20">
        {/* --- BAGIAN LOGO --- */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-24 h-24 mb-4 relative flex items-center justify-center bg-gradient-to-tr from-gray-50 to-gray-100 rounded-3xl shadow-inner border border-gray-200 overflow-hidden group">
            {/* 
              TIPS MENAMBAHKAN LOGO ASLI:
              1. Simpan file logo Anda di dalam folder `public` (misal: public/logo-bbpvp.png)
              2. Hapus komentar dan elemen <svg> di bawah ini, lalu aktifkan tag <img> ini:

            */}

            {/* Placeholder Ikon Logo (Hapus ini jika sudah pakai <img> asli) */}
            <img src="/logo-bbpvp.png" alt="Logo BBPVP Makassar" className="w-full h-full object-contain p-2" />
          </div>

          <h1 className="text-2xl font-black text-[#15406A] tracking-tight">PORTAL ADMIN</h1>
          <p className="text-sm font-bold text-amber-500 tracking-widest uppercase mt-1">BBPVP Makassar</p>
        </div>

        {/* --- PESAN ERROR --- */}
        {params.error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-200 font-medium text-center flex items-center justify-center space-x-2 animate-pulse">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Username atau password salah!</span>
          </div>
        )}

        {/* --- FORM LOGIN --- */}
        <form action={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
              <input
                type="text"
                name="username"
                required
                placeholder="Masukkan username"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl pl-11 pr-4 py-3.5 focus:bg-white focus:outline-none focus:border-[#15406A] focus:ring-4 focus:ring-[#15406A]/10 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </div>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl pl-11 pr-4 py-3.5 focus:bg-white focus:outline-none focus:border-[#15406A] focus:ring-4 focus:ring-[#15406A]/10 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-[#15406A] to-[#20578f] hover:from-[#0f2c4a] hover:to-[#15406A] text-white p-4 rounded-xl font-bold text-lg shadow-[0_8px_20px_rgba(21,64,106,0.3)] hover:shadow-[0_15px_25px_rgba(21,64,106,0.4)] hover:-translate-y-1 transition-all duration-300 mt-4 flex justify-center items-center space-x-2 group"
          >
            <span>Masuk ke Sistem</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
          </button>
        </form>
        <Link href="/" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full justify-center text-blue-500 border-white/10 backdrop-blur mt-4">
          <span className="text-[10px] font-black uppercase tracking-[.2em]">Kembali ke Dashboard</span>
        </Link>
      </div>

      {/* Footer Text */}
      <div className="absolute bottom-6 text-center w-full z-10">
        <p className="text-sm font-medium text-blue-200/60">&copy; {new Date().getFullYear()} BBPVP Makassar. All rights reserved.</p>
      </div>
    </div>
  );
}
