-- Login memakai email + kata sandi (menggantikan kode OTP demo).
-- Kata sandi disimpan sebagai hash scrypt bersalt, bukan teks biasa.
ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT;

DROP TABLE "otp_codes";
