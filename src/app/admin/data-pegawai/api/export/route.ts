import { neon } from "@neondatabase/serverless";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    /*
     * Ambil SELURUH data dari database.
     *
     * Tidak menggunakan filter/search dari halaman.
     * Jadi file Excel selalu berisi seluruh data pegawai.
     */
    const rows = await sql`
      SELECT *
      FROM data_pegawai
      ORDER BY created_at DESC
    `;

    /*
     * Konversi hasil database menjadi object biasa.
     *
     * JSON.parse(JSON.stringify(...)) diperlukan supaya
     * tipe data khusus dari hasil query tidak mengganggu
     * proses pembuatan worksheet.
     */
    const data = rows.map((row) => {
      return Object.fromEntries(
        Object.entries(row).map(([key, value]) => {
          if (value instanceof Date) {
            return [key, value.toISOString()];
          }

          if (value === null || value === undefined) {
            return [key, ""];
          }

          return [key, value];
        }),
      );
    });

    /*
     * Buat worksheet dari seluruh kolom database.
     */
    const worksheet = XLSX.utils.json_to_sheet(data);

    /*
     * Atur lebar kolom secara otomatis berdasarkan
     * nama kolom dan isi data.
     */
    const columnKeys = data.length > 0 ? Object.keys(data[0]) : [];

    worksheet["!cols"] = columnKeys.map((key) => {
      const maxDataLength = data.reduce((max, row) => {
        const value = String(row[key] ?? "");

        return Math.max(max, value.length);
      }, key.length);

      return {
        wch: Math.min(Math.max(maxDataLength + 2, 12), 40),
      };
    });

    /*
     * Buat workbook.
     */
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pegawai");

    /*
     * Generate buffer Excel.
     */
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    /*
     * Nama file.
     */
    const tanggal = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Makassar",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(new Date())
      .replace(/\//g, "-");

    const filename = `Data-Pegawai-BBPVP-Makassar-${tanggal}.xlsx`;

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Gagal export data pegawai:", error);

    return Response.json(
      {
        message: "Gagal membuat file Excel.",
      },
      {
        status: 500,
      },
    );
  }
}
