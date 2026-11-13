import { PrismaClient } from "@prisma/client";

/**
 * Batas waktu transaksi dilonggarkan karena di lingkungan serverless koneksi
 * pertama ke database bisa lambat (beberapa detik). Tanpa ini, permintaan
 * pertama setelah fungsi "dingin" gagal dengan "Transaction already closed".
 */
export const prisma = new PrismaClient({
  transactionOptions: {
    maxWait: 15_000,
    timeout: 20_000,
  },
});
