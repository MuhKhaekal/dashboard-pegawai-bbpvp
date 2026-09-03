export type LeaveRecord = {
  id: number;
  pegawai_id: number;
  jenis_cuti: string;
  bulan_angka: number | null;
  tahun: number;
  durasi: number;
  keterangan: string | null;
  created_at: string | null;
};

export type Pegawai = {
  id: number;
  nama: string;
  nip: string;
  bidang: string;
  pangkat_golongan: string;
  tmt_pangkat_terakhir: string | null;
  jabatan: string;
  tmt_jabatan_terakhir: string | null;
  status_kepegawaian: string;
  created_at: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  sisa_cuti_tahun_lalu: number;
  cuti_tahun_ini: number;
  riwayat_cuti: LeaveRecord[];
};
