import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT } from "jose";

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "kunci_cadangan");

// 1. Tipe data searchParams diubah menjadi Promise
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // 2. Baca nilai paramnya menggunakan await
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

      redirect("/admin/database-pegawai");
    } else {
      redirect("/login?error=1");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#15406A]">Login Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Sistem Pegawai BBPVP Makassar</p>
        </div>
        {params.error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4 border border-red-200">Username atau password salah!</div>}

        <form action={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input type="text" name="username" required className="w-full border-gray-300 rounded-md shadow-sm border p-2.5 focus:ring-[#15406A] focus:border-[#15406A]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" name="password" required className="w-full border-gray-300 rounded-md shadow-sm border p-2.5 focus:ring-[#15406A] focus:border-[#15406A]" />
          </div>
          <button type="submit" className="w-full bg-[#15406A] hover:bg-blue-900 text-white p-2.5 rounded-md font-medium shadow transition-colors mt-2">
            Masuk
          </button>
        </form>
      </div>
    </div>
  );
}
