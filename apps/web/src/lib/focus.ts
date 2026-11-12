/** Utilitas perpindahan fokus yang menghormati preferensi gerak minimal. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Menggeser layar ke judul blok fokus lalu memindahkan fokus keyboard ke sana.
 * Judul wajib memakai `tabIndex={-1}` (sudah disiapkan oleh `Section`).
 */
export function focusSection(headingId: string): void {
  if (typeof document === "undefined") return;
  const target = document.getElementById(headingId);
  if (!target) return;

  target.scrollIntoView({
    block: "nearest",
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
  target.focus({ preventScroll: true });
}
