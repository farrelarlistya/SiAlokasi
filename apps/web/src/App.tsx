import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireRole } from "./auth/RequireRole";
import { AppHeader } from "./components/AppHeader";
import { Skeleton } from "./components/Skeleton";
import { AdminAidItemsPage } from "./pages/admin/AdminAidItemsPage";
import { AdminAuditPage } from "./pages/admin/AdminAuditPage";
import { AdminSummaryPage } from "./pages/admin/AdminSummaryPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { DevPage } from "./pages/admin/DevPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PermitPage } from "./pages/pimpinan/PermitPage";
import { RecapPage } from "./pages/pimpinan/RecapPage";
import { StockPage } from "./pages/shared/StockPage";
import { UiKitPage } from "./pages/UiKitPage";

// Halaman berisi peta dimuat terpisah agar bundel awal tetap ringan.
const HomePage = lazy(() =>
  import("./pages/HomePage").then((module) => ({ default: module.HomePage })),
);
const TrackingPage = lazy(() =>
  import("./pages/public/TrackingPage").then((module) => ({ default: module.TrackingPage })),
);
const CreateIncidentPage = lazy(() =>
  import("./pages/petugas/CreateIncidentPage").then((module) => ({
    default: module.CreateIncidentPage,
  })),
);
const IncidentFactorsPage = lazy(() =>
  import("./pages/petugas/IncidentFactorsPage").then((module) => ({
    default: module.IncidentFactorsPage,
  })),
);
const SubmitIncidentPage = lazy(() =>
  import("./pages/petugas/SubmitIncidentPage").then((module) => ({
    default: module.SubmitIncidentPage,
  })),
);
const PetugasDashboardPage = lazy(() =>
  import("./pages/petugas/PetugasDashboardPage").then((module) => ({
    default: module.PetugasDashboardPage,
  })),
);
const PimpinanDashboardPage = lazy(() =>
  import("./pages/pimpinan/PimpinanDashboardPage").then((module) => ({
    default: module.PimpinanDashboardPage,
  })),
);
const PimpinanReviewPage = lazy(() =>
  import("./pages/pimpinan/PimpinanReviewPage").then((module) => ({
    default: module.PimpinanReviewPage,
  })),
);
const AdminRegionsPage = lazy(() =>
  import("./pages/admin/AdminRegionsPage").then((module) => ({
    default: module.AdminRegionsPage,
  })),
);
const NotificationsPage = lazy(() =>
  import("./pages/shared/NotificationsPage").then((module) => ({
    default: module.NotificationsPage,
  })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10 sm:px-6">
        <span className="sr-only">Sedang memuat halaman</span>
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton variant="card" className="mt-4 h-40" />
      </main>
    </div>
  );
}

export function App() {
  return (
    <>
      <a
        href="#isi-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-white"
      >
        Lewati ke isi utama
      </a>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/masuk" element={<LoginPage />} />
          <Route path="/daftar" element={<RegisterPage />} />
          <Route path="/lacak" element={<TrackingPage />} />
          <Route path="/ui" element={<UiKitPage />} />

          <Route
            path="/notifikasi"
            element={
              <RequireRole roles={["PETUGAS", "PIMPINAN", "ADMIN"]}>
                <NotificationsPage />
              </RequireRole>
            }
          />

          <Route
            path="/petugas"
            element={
              <RequireRole roles={["PETUGAS"]}>
                <PetugasDashboardPage />
              </RequireRole>
            }
          />
          <Route
            path="/petugas/laporan/baru"
            element={
              <RequireRole roles={["PETUGAS"]}>
                <CreateIncidentPage />
              </RequireRole>
            }
          />
          <Route
            path="/petugas/laporan/:id"
            element={
              <RequireRole roles={["PETUGAS"]}>
                <IncidentFactorsPage />
              </RequireRole>
            }
          />
          <Route
            path="/petugas/laporan/:id/ajukan"
            element={
              <RequireRole roles={["PETUGAS"]}>
                <SubmitIncidentPage />
              </RequireRole>
            }
          />

          <Route
            path="/pimpinan"
            element={
              <RequireRole roles={["PIMPINAN"]}>
                <PimpinanDashboardPage />
              </RequireRole>
            }
          />
          <Route
            path="/pimpinan/laporan/:id"
            element={
              <RequireRole roles={["PIMPINAN"]}>
                <PimpinanReviewPage />
              </RequireRole>
            }
          />
          <Route
            path="/pimpinan/izin/:id"
            element={
              <RequireRole roles={["PIMPINAN"]}>
                <PermitPage />
              </RequireRole>
            }
          />
          <Route
            path="/pimpinan/rekap"
            element={
              <RequireRole roles={["PIMPINAN"]}>
                <RecapPage />
              </RequireRole>
            }
          />

          <Route
            path="/admin"
            element={
              <RequireRole roles={["ADMIN"]}>
                <AdminSummaryPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/akun"
            element={
              <RequireRole roles={["ADMIN"]}>
                <AdminUsersPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/bantuan"
            element={
              <RequireRole roles={["ADMIN"]}>
                <AdminAidItemsPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/wilayah"
            element={
              <RequireRole roles={["ADMIN"]}>
                <AdminRegionsPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <RequireRole roles={["ADMIN"]}>
                <AdminAuditPage />
              </RequireRole>
            }
          />
          <Route
            path="/dev"
            element={
              <RequireRole roles={["ADMIN"]}>
                <DevPage />
              </RequireRole>
            }
          />
          <Route path="/admin/stok" element={<Navigate to="/stok" replace />} />

          <Route
            path="/stok"
            element={
              <RequireRole roles={["ADMIN", "PIMPINAN"]}>
                <StockPage />
              </RequireRole>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
