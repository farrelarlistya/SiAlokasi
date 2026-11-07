import { cn } from "../lib/cn";

type MapIllustrationProps = {
  className?: string;
};

/**
 * Ilustrasi peta Kota Surabaya untuk beranda tahap pondasi.
 * Peta interaktif (Leaflet) dipasang pada tahap alur laporan.
 */
export function MapIllustration({ className }: MapIllustrationProps) {
  return (
    <svg
      viewBox="0 0 800 520"
      role="img"
      aria-label="Ilustrasi peta Kota Surabaya dengan penanda lokasi kejadian dan lingkaran wilayah terdampak"
      className={cn("h-full w-full", className)}
    >
      <rect width="800" height="520" className="fill-map-land" />

      {/* Laut di sisi utara */}
      <path
        d="M0 0H800V148C712 176 648 132 566 152C482 172 428 128 338 150C248 172 158 122 66 152L0 168Z"
        className="fill-map-water"
      />

      {/* Kali di sisi timur */}
      <path
        d="M648 148C630 214 668 258 650 318C632 378 676 418 666 520"
        fill="none"
        className="stroke-map-water"
        strokeWidth="26"
        strokeLinecap="round"
      />

      {/* Blok permukiman */}
      <g className="fill-map-built">
        <rect x="64" y="216" width="118" height="58" rx="6" />
        <rect x="196" y="204" width="86" height="84" rx="6" />
        <rect x="300" y="196" width="120" height="52" rx="6" />
        <rect x="70" y="298" width="92" height="72" rx="6" />
        <rect x="182" y="310" width="132" height="60" rx="6" />
        <rect x="336" y="272" width="92" height="96" rx="6" />
        <rect x="452" y="196" width="140" height="62" rx="6" />
        <rect x="614" y="236" width="110" height="76" rx="6" />
        <rect x="72" y="418" width="140" height="62" rx="6" />
        <rect x="236" y="404" width="120" height="76" rx="6" />
        <rect x="386" y="408" width="150" height="64" rx="6" />
        <rect x="566" y="358" width="96" height="70" rx="6" />
        <rect x="690" y="358" width="72" height="112" rx="6" />
      </g>

      {/* Taman kota */}
      <rect x="470" y="290" width="94" height="78" rx="12" className="fill-map-park" />
      <ellipse cx="160" cy="392" rx="52" ry="34" className="fill-map-park" />
      <ellipse cx="704" cy="196" rx="46" ry="30" className="fill-map-park" />

      {/* Jalan utama: tepi lalu permukaan */}
      <g fill="none" strokeLinecap="round">
        <path
          d="M0 262C150 250 262 306 402 296C542 286 656 240 800 254"
          className="stroke-map-road-edge"
          strokeWidth="16"
        />
        <path
          d="M0 262C150 250 262 306 402 296C542 286 656 240 800 254"
          className="stroke-map-road"
          strokeWidth="10"
        />
        <path
          d="M142 520C168 430 218 366 300 306C378 250 424 196 444 152"
          className="stroke-map-road-edge"
          strokeWidth="14"
        />
        <path
          d="M142 520C168 430 218 366 300 306C378 250 424 196 444 152"
          className="stroke-map-road"
          strokeWidth="8"
        />
        <path
          d="M0 414C162 392 300 432 462 402C610 374 706 398 800 380"
          className="stroke-map-road-edge"
          strokeWidth="14"
        />
        <path
          d="M0 414C162 392 300 432 462 402C610 374 706 398 800 380"
          className="stroke-map-road"
          strokeWidth="8"
        />
        <path
          d="M582 152C596 248 606 328 590 520"
          className="stroke-map-road-edge"
          strokeWidth="13"
        />
        <path
          d="M582 152C596 248 606 328 590 520"
          className="stroke-map-road"
          strokeWidth="7"
        />
      </g>

      {/* Batas kecamatan */}
      <g
        fill="none"
        className="stroke-map-boundary"
        strokeWidth="2"
        strokeDasharray="7 9"
        opacity="0.9"
      >
        <path d="M0 344C176 322 288 360 410 344C548 326 660 344 800 322" />
        <path d="M300 168C316 246 306 328 322 414C334 480 328 500 332 520" />
        <path d="M512 168C498 246 512 342 498 426C490 474 496 500 492 520" />
      </g>

      {/* Lingkaran wilayah terdampak */}
      <circle cx="520" cy="298" r="112" className="fill-accent/15 stroke-accent" strokeWidth="3" />
      <circle cx="520" cy="298" r="54" className="fill-accent/10 stroke-accent/50" strokeWidth="1.5" />

      {/* Penanda kejadian */}
      <circle cx="520" cy="298" r="18" className="fill-danger/25" />
      <circle cx="520" cy="298" r="9" className="fill-danger stroke-white" strokeWidth="3" />

      {/* Penanda posko */}
      <g className="fill-success stroke-white" strokeWidth="2">
        <circle cx="286" cy="382" r="7" />
        <circle cx="646" cy="430" r="7" />
      </g>
    </svg>
  );
}
