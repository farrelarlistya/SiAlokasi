import { DEMO_PASSWORD, loginSchema, ROLE_LABEL, type Role } from "@sialokasi/shared";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
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

type FieldErrors = Partial<Record<"email" | "password", string>>;

export function LoginPage() {
  const { user, applyLogin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next");

  const health = useQuery({ queryKey: ["health"], queryFn: api.health, retry: 0 });
  const demoMode = health.data?.demoMode === true;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === "email" || key === "password") && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const response = await api.login(parsed.data.email, parsed.data.password);
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
      title="Masuk ke SiAlokasi"
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

      <form onSubmit={(event) => void submit(event)} className="grid gap-5" noValidate>
        <Field id="login-email" label="Alamat email" error={errors.email} required>
          <TextInput
            type="email"
            value={email}
            autoComplete="email"
            placeholder="nama@instansi.go.id"
            onChange={(event) => {
              setEmail(event.target.value);
              if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
            }}
          />
        </Field>

        <Field id="login-password" label="Kata sandi" error={errors.password} required>
          <TextInput
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => {
              setPassword(event.target.value);
              if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
            }}
          />
        </Field>

        <Button type="submit" size="lg" disabled={submitting} className="w-full">
          {submitting ? "Sedang memeriksa…" : "Masuk"}
        </Button>
      </form>

      {demoMode ? (
        <div className="mt-8 border-t border-border pt-5">
          <p className="text-base text-text-muted">Akun demo</p>
          <ul className="mt-2">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(DEMO_PASSWORD);
                    setErrors({});
                  }}
                  className="flex min-h-14 w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-elevated"
                >
                  <span className="min-w-0">
                    <span className="block text-base font-medium text-text">
                      {ROLE_LABEL[account.role]} — {account.name}
                    </span>
                    <span className="block break-all font-mono text-base text-text-muted">
                      {account.email}
                    </span>
                  </span>
                  <span className="shrink-0 text-base font-medium text-text underline underline-offset-4">
                    Isi
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 break-all text-base text-text-muted">
            Kata sandi: <span className="font-mono text-text">{DEMO_PASSWORD}</span>
          </p>
        </div>
      ) : null}
    </AuthLayout>
  );
}
