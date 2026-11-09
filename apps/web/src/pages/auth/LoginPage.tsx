import { emailSchema, otpCodeSchema, ROLE_LABEL, type Role } from "@sialokasi/shared";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, KeyRound, Mail, RefreshCw } from "lucide-react";
import { useCallback, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { Field, TextInput } from "../../components/Field";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import { nextPathForRole } from "../../lib/roles";
import { AuthLayout } from "./AuthLayout";

const DEMO_ACCOUNTS: { role: Role; email: string; name: string }[] = [
  { role: "PETUGAS", email: "petugas@sialokasi.demo", name: "Rina Kusuma" },
  { role: "PIMPINAN", email: "pimpinan@sialokasi.demo", name: "Budi Santoso" },
  { role: "ADMIN", email: "admin@sialokasi.demo", name: "Sari Wulandari" },
];
export function LoginPage() {
  const { user, applyLogin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next");

  const health = useQuery({ queryKey: ["health"], queryFn: api.health, retry: 0 });

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [codeError, setCodeError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const demoMode = health.data?.demoMode === true;

  const requestCode = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      setFormError(undefined);
      setNotice(undefined);

      const parsed = emailSchema.safeParse(email);
      if (!parsed.success) {
        setEmailError(parsed.error.issues[0]?.message ?? "Periksa alamat email.");
        return;
      }
      setEmailError(undefined);
      setSending(true);

      try {
        const response = await api.requestCode(parsed.data);
        setStep("code");
        setNotice(response.message);
        if (response.demoCode) {
          setCode(response.demoCode);
        }
        toast.push({
          tone: "info",
          title: "Kode masuk siap.",
          description: response.demoMode
            ? "Mode demo aktif, kode 123456 sudah diisikan."
            : "Periksa kotak masuk email Anda.",
        });
      } catch (error) {
        setFormError(
          error instanceof Error
            ? error.message
            : "Kode masuk belum bisa dikirim. Periksa koneksi, lalu coba lagi.",
        );
      } finally {
        setSending(false);
      }
    },
    [email, toast],
  );

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);

    const parsed = otpCodeSchema.safeParse(code);
    if (!parsed.success) {
      setCodeError(parsed.error.issues[0]?.message ?? "Periksa kode masuk.");
      return;
    }
    setCodeError(undefined);
    setSubmitting(true);

    try {
      const response = await api.login(email.trim().toLowerCase(), parsed.data);
      applyLogin(response);
      toast.push({ tone: "success", title: response.message });
      navigate(nextPathForRole(response.user.role, next), { replace: true });
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Belum bisa masuk. Periksa koneksi, lalu coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (user) {
    return <Navigate to={nextPathForRole(user.role, next)} replace />;
  }

  return (
    <AuthLayout
      title={step === "email" ? "Masuk ke ruang kendali" : "Masukkan kode masuk"}
      description={
        step === "email"
          ? "Tidak perlu kata sandi. Kami mengirim kode enam angka ke email Anda."
          : `Kode dikirim ke ${email}. Kode berlaku 10 menit.`
      }
      footer={
        <p className="text-base text-text-muted">
          Belum punya akun petugas?{" "}
          <Link
            to="/daftar"
            className="inline-flex min-h-11 items-center font-medium text-info underline-offset-4 hover:underline"
          >
            Daftar di sini
          </Link>
        </p>
      }
    >
      {formError ? (
        <Alert tone="danger" title="Belum bisa masuk." className="mb-5">
          {formError}
        </Alert>
      ) : null}

      {notice ? (
        <Alert tone="info" title="Kode masuk" className="mb-5">
          {notice}
        </Alert>
      ) : null}

      {step === "email" ? (
        <form onSubmit={(event) => void requestCode(event)} className="grid gap-5" noValidate>
          <Field
            id="login-email"
            label="Alamat email"
            hint="Pakai email dinas yang sudah terdaftar."
            error={emailError}
            required
          >
            <TextInput
              type="email"
              value={email}
              autoComplete="email"
              placeholder="nama@instansi.go.id"
              onChange={(event) => {
                setEmail(event.target.value);
                if (emailError) setEmailError(undefined);
              }}
            />
          </Field>

          <Button
            type="submit"
            size="lg"
            leadingIcon={<Mail />}
            disabled={sending}
            className="w-full"
          >
            {sending ? "Sedang mengirim kode…" : "Kirim kode masuk"}
          </Button>
        </form>
      ) : (
        <form onSubmit={(event) => void submitLogin(event)} className="grid gap-5" noValidate>
          <Field
            id="login-code"
            label="Kode masuk"
            hint={demoMode ? "Mode demo: kode selalu 123456." : "Enam angka dari email Anda."}
            error={codeError}
            required
          >
            <TextInput
              value={code}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              className="font-mono text-[22px] tracking-[0.4em]"
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                if (codeError) setCodeError(undefined);
              }}
            />
          </Field>

          <Button
            type="submit"
            size="lg"
            leadingIcon={<KeyRound />}
            disabled={submitting}
            className="w-full"
          >
            {submitting ? "Sedang memeriksa…" : "Masuk"}
            {submitting ? null : <ArrowRight aria-hidden="true" className="h-5 w-5" />}
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="ghost"
              leadingIcon={<RefreshCw />}
              disabled={sending}
              onClick={() => void requestCode()}
            >
              {sending ? "Sedang mengirim…" : "Kirim ulang kode"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setStep("email");
                setCode("");
                setCodeError(undefined);
                setFormError(undefined);
                setNotice(undefined);
              }}
            >
              Ganti email
            </Button>
          </div>
        </form>
      )}

      {demoMode && step === "email" ? (
        <div className="mt-6 rounded-md border border-warning/30 bg-warning/10 p-4">
          <p className="text-base font-medium text-warning">Mode demo aktif</p>
          <p className="mt-1 text-base text-text-muted">
            Pilih salah satu akun di bawah, lalu kode 123456 akan diisikan otomatis.
          </p>
          <ul className="mt-3 space-y-2">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setEmailError(undefined);
                  }}
                  className="flex min-h-11 w-full flex-col items-start gap-1 rounded-md border border-border bg-surface px-3 py-2 text-left text-base transition-colors hover:bg-hover"
                >
                  <span className="flex w-full flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-text">{account.name}</span>
                    <span className="rounded-full border border-border bg-elevated px-3 py-1 text-text-muted">
                      {ROLE_LABEL[account.role]}
                    </span>
                  </span>
                  <span className="break-all text-text-muted">{account.email}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </AuthLayout>
  );
}
