import { Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
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
        <Route path="/ui" element={<UiKitPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
