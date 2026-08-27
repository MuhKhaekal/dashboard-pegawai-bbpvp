import FormPegawai from './FormPegawai';

export default function TambahPegawaiPage() {
  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="inline-block px-3 py-1 bg-amber-100 text-amber-700 text-xs font-black tracking-widest rounded-full mb-3 uppercase shadow-sm">
          Registrasi
        </div>
        <h1 className="text-4xl font-black text-[#15406A] tracking-tight">Tambah Pegawai Baru</h1>
      </div>
      <FormPegawai />
    </div>
  );
}