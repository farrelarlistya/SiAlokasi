import { INCIDENT_STATUSES } from "@sialokasi/shared";
import {
  CheckCircle2,
  ClipboardList,
  House,
  Inbox,
  Map,
  MapPin,
  Plus,
  Send,
  Trash2,
  UserRound,
} from "lucide-react";
import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { BottomNav } from "../components/BottomNav";
import { Button, buttonStyles } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { Field, SelectInput, Textarea, TextInput } from "../components/Field";
import { Modal } from "../components/Modal";
import { PromptDialog } from "../components/PromptDialog";
import { Skeleton } from "../components/Skeleton";
import { StatusChip } from "../components/StatusChip";
import { useToast } from "../components/Toast";
import { cn } from "../lib/cn";

const COLORS = [
  { token: "--color-canvas", swatch: "bg-canvas", usage: "Latar aplikasi" },
  { token: "--color-surface", swatch: "bg-surface", usage: "Panel & kartu" },
  { token: "--color-elevated", swatch: "bg-elevated", usage: "Kartu dalam panel" },
  { token: "--color-hover", swatch: "bg-hover", usage: "Hover baris & tombol" },
  { token: "--color-border", swatch: "bg-border", usage: "Garis pemisah" },
  { token: "--color-text", swatch: "bg-text", usage: "Teks utama" },
  { token: "--color-text-muted", swatch: "bg-text-muted", usage: "Teks pendukung" },
  { token: "--color-accent", swatch: "bg-accent", usage: "Garis radius & fokus" },
  { token: "--color-primary", swatch: "bg-primary", usage: "Tombol utama" },
  { token: "--color-danger", swatch: "bg-danger", usage: "Tolak & batal" },
  { token: "--color-warning", swatch: "bg-warning", usage: "Menunggu persetujuan" },
  { token: "--color-success", swatch: "bg-success", usage: "Disetujui & selesai" },
  { token: "--color-violet", swatch: "bg-violet", usage: "Sudah diperiksa" },
] as const;

const NAV_ITEMS = [
  { label: "Beranda", to: "/", icon: House },
  { label: "Laporan", to: "/ui", icon: ClipboardList },
  { label: "Peta", to: "/ui", icon: Map },
  { label: "Akun", to: "/ui", icon: UserRound },
];

const CHECKLIST = [
  "Semua teks berukuran minimal 16 px.",
  "Target sentuh minimal 44 �- 44 px.",
  "Fokus keyboard terlihat dengan cincin biru.",
  "Escape menutup dialog dan fokus kembali ke pemicu.",
  "Status disampaikan lewat warna dan teks.",
  "Pemberitahuan dibacakan lewat aria-live.",
];

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="rounded-lg border border-border bg-surface p-5 sm:p-6">
      <h2 id={id} className="text-[22px] font-semibold leading-[30px] text-text">
        {title}
      </h2>
      <p className="mt-1 text-base text-text-muted">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function UiKitPage() {
  const toast = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptBusy, setPromptBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string | undefined>();
  const [region, setRegion] = useState("");
  const [note, setNote] = useState("");

  const closeModal = useCallback(() => setModalOpen(false), []);
  const closeConfirm = useCallback(() => setConfirmOpen(false), []);
  const closePrompt = useCallback(() => setPromptOpen(false), []);

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (title.trim().length < 5) {
      setTitleError("Judul laporan minimal 5 karakter supaya mudah dikenali di peta.");
      return;
    }
    setTitleError(undefined);
    toast.push({
      tone: "success",
      title: "Contoh isian tersimpan.",
      description: "Pesan kesalahan hilang setelah kolom diperbaiki.",
    });
  };

  const runConfirm = () => {
    setConfirmBusy(true);
    setTimeout(() => {
      setConfirmBusy(false);
      setConfirmOpen(false);
      toast.push({
        tone: "danger",
        title: "Contoh laporan dibatalkan.",
        description: "Aksi berbahaya selalu meminta konfirmasi tertulis.",
      });
    }, 600);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        actions={
          <Link to="/" className={buttonStyles("secondary", "md")}>
            Kembali ke beranda
          </Link>
        }
      />

      <main id="isi-utama" className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-4 py-8 sm:px-6">
        <header className="rounded-lg border border-border bg-surface p-6 sm:p-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-info/30 bg-info/10 px-3 py-1 text-base text-info">
            Tahap M1, Pondasi tampilan
          </p>
          <h1 className="mt-4 text-[28px] font-bold leading-[36px] sm:text-[40px] sm:leading-[48px]">
            Enam komponen dasar, satu bahasa tampilan.
          </h1>
          <p className="mt-3 max-w-3xl text-base text-text-muted">
            Semua halaman fitur dibangun dari komponen di bawah ini. Coba setiap tombol untuk
            memastikan dialog, pemberitahuan, dan validasi bekerja tanpa jendela bawaan peramban.
          </p>
        </header>

        <Section
          id="warna"
          title="Token warna"
          description="Warna hanya boleh dipakai lewat token ini. Tidak ada kode warna lepas di halaman."
        >
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COLORS.map((color) => (
              <li key={color.token} className="rounded-md border border-border bg-elevated p-3">
                <div className={cn("h-14 w-full rounded-sm border border-border", color.swatch)} />
                <p className="mt-3 break-all font-mono text-base text-text">{color.token}</p>
                <p className="mt-1 text-base text-text-muted">{color.usage}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          id="tipografi"
          title="Tipografi"
          description="Plus Jakarta Sans untuk isi, Geist Mono untuk nomor izin dan kode lacak. Tidak ada teks di bawah 16 px."
        >
          <div className="space-y-4">
            <p className="text-figure text-text">40 / 44 - Angka utama</p>
            <p className="text-page text-text">32 / 40 - Judul halaman</p>
            <p className="text-focus text-text">24 / 32 - Judul fokus</p>
            <p className="text-section text-text/90">20 / 28 - Judul section</p>
            <p className="text-base text-text">16 / 26 - Isi dan label formulir</p>
            <p className="font-mono text-base font-medium text-info">IZN-20261107-001, SIA-7K2Q9</p>
          </div>
        </Section>

        <Section
          id="tombol"
          title="Tombol"
          description="Setiap panel punya satu aksi utama berwarna oranye. Aksi berbahaya memakai merah dan selalu dikonfirmasi."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button leadingIcon={<Plus />}>Aksi utama</Button>
            <Button variant="secondary">Aksi sekunder</Button>
            <Button variant="ghost">Tanpa latar</Button>
            <Button variant="danger" leadingIcon={<Trash2 />}>
              Hapus
            </Button>
            <Button variant="outlineDanger">Tolak</Button>
            <Button disabled>Nonaktif</Button>
          </div>
          <p className="mt-4 text-base text-text-muted">
            Tinggi minimum 44 px, teks 16 px, dan cincin fokus biru saat diakses dengan keyboard.
          </p>
        </Section>

        <Section
          id="formulir"
          title="Kolom isian & validasi"
          description="Label selalu terlihat. Pesan kesalahan muncul tepat di bawah kolom yang salah, bukan di atas halaman."
        >
          <form className="grid max-w-2xl gap-5" onSubmit={submitForm} noValidate>
            <Field
              id="contoh-judul"
              label="Judul laporan"
              hint="Contoh: Banjir di Rungkut Industri."
              error={titleError}
              required
            >
              <TextInput
                value={title}
                placeholder="Tulis judul singkat yang mudah dikenali"
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (titleError) setTitleError(undefined);
                }}
              />
            </Field>

            <Field id="contoh-kecamatan" label="Kecamatan" required>
              <SelectInput value={region} onChange={(event) => setRegion(event.target.value)}>
                <option value="">Pilih kecamatan</option>
                <option value="gubeng">Gubeng</option>
                <option value="rungkut">Rungkut</option>
                <option value="benowo">Benowo</option>
              </SelectInput>
            </Field>

            <Field
              id="contoh-catatan"
              label="Catatan lapangan"
              hint="Boleh dikosongkan."
            >
              <Textarea
                value={note}
                placeholder="Contoh: Akses jalan masuk hanya bisa dilalui kendaraan roda dua."
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" leadingIcon={<Send />}>
                Simpan contoh
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setTitle("");
                  setRegion("");
                  setNote("");
                  setTitleError(undefined);
                }}
              >
                Kosongkan
              </Button>
            </div>
          </form>
        </Section>

        <Section
          id="dialog"
          title="Kotak dialog"
          description="Fokus terperangkap di dalam dialog, Escape menutup, dan fokus kembali ke tombol pemicu."
        >
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Buka dialog informasi
            </Button>
            <Button variant="outlineDanger" onClick={() => setConfirmOpen(true)}>
              Buka konfirmasi berbahaya
            </Button>
            <Button variant="secondary" onClick={() => setPromptOpen(true)}>
              Minta alasan perubahan
            </Button>
          </div>
        </Section>

        <Section
          id="pemberitahuan"
          title="Pemberitahuan singkat"
          description="Muncul di kanan atas, menutup sendiri setelah 5 detik, maksimal tiga tumpuk, dan dibacakan pembaca layar."
        >
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() =>
                toast.push({ tone: "success", title: "Laporan tersimpan." })
              }
            >
              Sukses
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast.push({
                  tone: "info",
                  title: "Estimasi sudah diperbarui.",
                  description: "Sepuluh jenis bantuan berhasil dihitung.",
                })
              }
            >
              Informasi
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast.push({
                  tone: "warning",
                  title: "Menunggu persetujuan pimpinan.",
                  description: "Laporan belum bisa disunting sampai ada keputusan.",
                })
              }
            >
              Peringatan
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast.push({
                  tone: "danger",
                  title: "Laporan belum bisa dikirim.",
                  description: "Periksa koneksi, lalu tekan Kirim lagi.",
                })
              }
            >
              Gagal
            </Button>
          </div>
        </Section>

        <Section
          id="kerangka"
          title="Kerangka muat"
          description="Bentuk kerangka mengikuti konten asli, bukan tulisan “Loading…”. Animasi berhenti bila pengguna memilih gerak minimal."
        >
          <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
            <span className="sr-only">Sedang memuat contoh kartu</span>
            <div className="rounded-md border border-border bg-elevated p-4">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="mt-4 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-4/5" />
              <div className="mt-5 flex items-center gap-3">
                <Skeleton variant="circle" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="rounded-md border border-border bg-elevated p-4">
              <Skeleton variant="card" className="h-24" />
              <Skeleton className="mt-4 h-4 w-1/2" />
            </div>
          </div>
        </Section>

        <Section
          id="kosong"
          title="Tampilan kosong"
          description="Keadaan kosong selalu menjelaskan situasi dan memberi satu jalan keluar."
        >
          <EmptyState
            icon={<Inbox />}
            title="Belum ada laporan di wilayah ini."
            description="Laporan yang dikirim petugas akan muncul di sini. Untuk mencoba, muat contoh data pada panel demo."
            action={
              <Button
                variant="secondary"
                leadingIcon={<Plus />}
                onClick={() =>
                  toast.push({ tone: "info", title: "Contoh data belum diaktifkan pada M1." })
                }
              >
                Muat contoh laporan
              </Button>
            }
          />
        </Section>

        <Section
          id="status"
          title="Chip status"
          description="Setiap status memakai warna dan teks sekaligus, sehingga tetap terbaca oleh pengguna dengan buta warna."
        >
          <ul className="flex flex-wrap gap-3">
            {INCIDENT_STATUSES.map((status) => (
              <li key={status}>
                <StatusChip status={status} />
              </li>
            ))}
          </ul>
        </Section>

        <Section
          id="navigasi"
          title="Kepala halaman & navigasi bawah"
          description="Navigasi hanya menampilkan menu yang boleh diakses peran tersebut. Maksimal empat tujuan di layar kecil."
        >
          <div className="overflow-hidden rounded-md border border-border">
            <AppHeader
              variant="inline"
              user={{ name: "Rina Kusuma", role: "PETUGAS" }}
              actions={<span className="hidden text-base text-text-muted sm:inline">Contoh tampilan</span>}
            />
            <div className="bg-canvas p-6">
              <p className="flex items-center gap-2 text-base text-text-muted">
                <MapPin aria-hidden="true" className="h-5 w-5 text-danger" />
                Area contoh kepala halaman dengan nama dan peran pengguna.
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-border">
            <BottomNav variant="inline" items={NAV_ITEMS} />
          </div>
        </Section>

        <Section
          id="aksesibilitas"
          title="Daftar periksa aksesibilitas"
          description="Diperiksa pada setiap halaman baru, bukan hanya di akhir proyek."
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex items-start gap-2 text-base text-text">
                <CheckCircle2 aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </Section>
      </main>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Contoh dialog informasi"
        description="Dialog ini menahan fokus sampai pengguna menutupnya."
        footer={
          <Button onClick={closeModal}>Mengerti</Button>
        }
      >
        <p className="text-base text-text">
          Tekan Tab untuk berpindah antar tombol, lalu Escape untuk menutup. Fokus akan kembali ke
          tombol yang membuka dialog ini.
        </p>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={closeConfirm}
        onConfirm={runConfirm}
        busy={confirmBusy}
        title="Batalkan laporan ini?"
        description="Laporan yang dibatalkan tidak bisa diaktifkan kembali."
        confirmLabel="Ya, batalkan laporan"
        cancelLabel="Kembali"
      />

      <PromptDialog
        open={promptOpen}
        onClose={closePrompt}
        busy={promptBusy}
        title="Alasan perubahan jumlah"
        description="Alasan wajib diisi agar keputusan bisa dipertanggungjawabkan."
        label="Tulis alasan"
        placeholder="Contoh: Stok air di posko terdekat masih mencukupi."
        confirmLabel="Simpan alasan"
        onSubmit={async (value) => {
          setPromptBusy(true);
          await new Promise((resolve) => setTimeout(resolve, 400));
          setPromptBusy(false);
          setPromptOpen(false);
          toast.push({
            tone: "success",
            title: "Alasan tersimpan.",
            description: `Tercatat: “${value}”`,
          });
        }}
      />
    </div>
  );
}
