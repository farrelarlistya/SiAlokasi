import { registerPetugasSchema } from "@sialokasi/shared";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Send, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { Field, SelectInput, TextInput } from "../../components/Field";
import { Skeleton } from "../../components/Skeleton";
import { api } from "../../lib/api";
import { homePathForRole } from "../../lib/roles";
import { AuthLayout } from "./AuthLayout";

type FieldErrors = Partial<Record<"name" | "email" | "regionId", string>>;

export function RegisterPage() {
  const { user } = useAuth();
  const options = useQuery({ queryKey: ["master", "options"], queryFn: api.masterOptions });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [regionId, setRegionId] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);

    const parsed = registerPetugasSchema.safeParse({ name, email, regionId });
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === "name" || key === "email" || key === "regionId") && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const response = await api.register(parsed.data);
      setSuccess(response.message);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Pendaftaran belum bisa dikirim. Periksa koneksi, lalu coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (user) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  if (success) {
    return (
      <AuthLayout
        title="Pendaftaran terkirim"
        tone="plain"
        footer={
          <p className="text-base text-text-muted">
            Sudah aktif?{" "}
            <Link
              to="/masuk"
              className="inline-flex min-h-11 items-center font-medium text-info underline-offset-4 hover:underline"
            >
              Masuk di sini
            </Link>
          </p>
        }
      >
        <div className="flex items-start gap-3 rounded-md border border-success/30 bg-success/10 p-4">
          <CheckCircle2 aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-success" />
          <div>
            <p className="text-base font-medium text-text">Menunggu aktivasi admin</p>
            <p className="mt-1 text-base text-text-muted">{success}</p>
          </div>
        </div>

        <div className="mt-5 rounded-md border border-border bg-elevated p-4">
          <p className="text-base text-text-muted">Yang perlu Anda lakukan:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-base text-text">
            <li>Hubungi admin wilayah agar akun ini diaktifkan.</li>
            <li>Setelah aktif, masuk memakai email dan kode yang dikirim.</li>
          </ol>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Daftar sebagai petugas"
      footer={
        <p className="text-base text-text-muted">
          Sudah punya akun?{" "}
          <Link
            to="/masuk"
            className="inline-flex min-h-11 items-center font-medium text-info underline-offset-4 hover:underline"
          >
            Masuk di sini
          </Link>
        </p>
      }
    >
      {formError ? (
        <Alert tone="danger" title="Pendaftaran belum bisa dikirim." className="mb-5">
          {formError}
        </Alert>
      ) : null}

      <form onSubmit={(event) => void submit(event)} className="grid gap-5" noValidate>
        <Field id="register-name" label="Nama lengkap" error={errors.name} required>
          <TextInput
            value={name}
            autoComplete="name"
            placeholder="Contoh: Rina Kusuma"
            onChange={(event) => {
              setName(event.target.value);
              if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
            }}
          />
        </Field>

        <Field
          id="register-email"
          label="Alamat email"
          error={errors.email}
          required
        >
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

        <Field
          id="register-region"
          label="Kecamatan tempat bertugas"
          error={errors.regionId}
          required
        >
          {options.isPending ? (
            <Skeleton className="h-12 w-full" />
          ) : options.isError ? (
            <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-base text-text">
              Daftar kecamatan belum bisa dimuat.{" "}
              <button
                type="button"
                className="font-medium text-info underline underline-offset-4"
                onClick={() => void options.refetch()}
              >
                Coba lagi
              </button>
            </div>
          ) : (
            <SelectInput
              value={regionId}
              onChange={(event) => {
                setRegionId(event.target.value);
                if (errors.regionId) {
                  setErrors((current) => ({ ...current, regionId: undefined }));
                }
              }}
            >
              <option value="">Pilih kecamatan</option>
              {(options.data?.regions ?? []).map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>

        <Button
          type="submit"
          size="lg"
          leadingIcon={<UserPlus />}
          disabled={submitting || options.isPending}
          className="w-full"
        >
          {submitting ? "Sedang mengirim…" : "Kirim pendaftaran"}
          {submitting ? null : <Send aria-hidden="true" className="h-5 w-5" />}
        </Button>
      </form>
    </AuthLayout>
  );
}
