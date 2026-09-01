import Link from "next/link";

import { redirect } from "next/navigation";

export default function Home() {
  // Langsung arahkan pengguna ke route /login saat halaman ini dipanggil
  redirect("/login");
}
