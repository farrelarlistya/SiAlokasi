import { loginSchema } from "@sialokasi/shared";
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

type FieldErrors = Partial<Record<"email" | "password", string>>;

export function LoginPage() {
  const { user, applyLogin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next");

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
    </AuthLayout>
  );
}
