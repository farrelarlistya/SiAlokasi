/** Kesalahan yang aman ditampilkan ke pengguna dengan kode status tertentu. */
export class RequestError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "RequestError";
    this.statusCode = statusCode;
  }
}

export function firstIssueMessage(result: {
  success: false;
  error: { issues: { message: string }[] };
}): string {
  return result.error.issues[0]?.message ?? "Isian belum lengkap. Periksa kembali.";
}
