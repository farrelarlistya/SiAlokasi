import type { AidIconName } from "@sialokasi/shared";
import {
  Baby,
  BedDouble,
  BriefcaseMedical,
  Droplets,
  HeartPulse,
  Home,
  Milk,
  Package,
  Pill,
  Radio,
  Shirt,
  Tent,
  TentTree,
  Thermometer,
  Toilet,
  Truck,
  Utensils,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../lib/cn";

const ICONS: Record<AidIconName, LucideIcon> = {
  tent: Tent,
  "tent-tree": TentTree,
  droplets: Droplets,
  utensils: Utensils,
  "briefcase-medical": BriefcaseMedical,
  "bed-double": BedDouble,
  toilet: Toilet,
  milk: Milk,
  "heart-pulse": HeartPulse,
  zap: Zap,
  package: Package,
  pill: Pill,
  shirt: Shirt,
  baby: Baby,
  home: Home,
  truck: Truck,
  radio: Radio,
  thermometer: Thermometer,
};

type AidIconProps = {
  name: string;
  className?: string;
  /** Bungkus ikon dengan kotak berlatar agar mudah dikenali di daftar. */
  framed?: boolean;
};

export function AidIcon({ name, className, framed = false }: AidIconProps) {
  const Icon = ICONS[name as AidIconName] ?? Package;

  if (!framed) {
    return <Icon aria-hidden="true" className={cn("h-5 w-5", className)} />;
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-md border border-border bg-elevated text-info",
        className,
      )}
    >
      <Icon className="h-6 w-6" />
    </span>
  );
}
