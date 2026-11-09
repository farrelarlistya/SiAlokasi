import { Navigate, Route, Routes } from "react-router-dom";
import { RequireRole } from "./auth/RequireRole";
import { AdminAidItemsPage } from "./pages/admin/AdminAidItemsPage";
import { AdminAuditPage } from "./pages/admin/AdminAuditPage";
import { AdminRegionsPage } from "./pages/admin/AdminRegionsPage";
import { AdminSummaryPage } from "./pages/admin/AdminSummaryPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { DevPage } from "./pages/admin/DevPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { CreateIncidentPage } from "./pages/petugas/CreateIncidentPage";
import { IncidentFactorsPage } from "./pages/petugas/IncidentFactorsPage";
import { PetugasDashboardPage } from "./pages/petugas/PetugasDashboardPage";
import { SubmitIncidentPage } from "./pages/petugas/SubmitIncidentPage";
import { PermitPage } from "./pages/pimpinan/PermitPage";
import { PimpinanDashboardPage } from "./pages/pimpinan/PimpinanDashboardPage";
import { PimpinanReviewPage } from "./pages/pimpinan/PimpinanReviewPage";
import { RecapPage } from "./pages/pimpinan/RecapPage";
import { TrackingPage } from "./pages/public/TrackingPage";
import { StockPage } from "./pages/shared/StockPage";
import { UiKitPage } from "./pages/UiKitPage";

export function App() {
  return (
    <>
      <a
        href="#isi-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-white"
      >
        Lewati ke isi utama
      </a>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/masuk" element={<LoginPage />} />
        <Route path="/daftar" element={<RegisterPage />} />
        <Route path="/lacak" element={<TrackingPage />} />
        <Route path="/ui" element={<UiKitPage />} />

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
    </>
  );
}
