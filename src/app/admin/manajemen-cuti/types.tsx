export type LeaveRecord = {
  id: number;
  pegawai_id: number;
  jenis_cuti: string;
  bulan_angka: number | null;
  tahun: number;
  durasi: number;
  keterangan: string | null;
};

export type Pegawai = {
  id: number;
  nama: string;
  nip: string;
  jabatan: string;
  bidang: string;
  status_kepegawaian: string;
  sisa_cuti_tahun_lalu: number;
  cuti_tahun_ini: number;
  riwayat_cuti: LeaveRecord[];
};