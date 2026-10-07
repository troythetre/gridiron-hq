import Image from "next/image";
import { cn } from "@/lib/utils";

/** Compact horizontal lockup for nav bars / sidebars: icon mark + wordmark. */
export function Logo({ className, height = 28 }: { className?: string; height?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/logo-icon.png"
        alt=""
        width={height}
        height={height}
        style={{ height, width: "auto" }}
        className="object-contain brightness-0 saturate-100 invert-[54%] sepia-[79%] saturate-[1395%] hue-rotate-[232deg] brightness-[102%] contrast-[101%]"
        priority
      />
      <span
        className="font-display font-semibold uppercase tracking-wide text-violet-300"
        style={{ fontSize: height * 0.62 }}
      >
        Gridiron
      </span>
    </span>
  );
}

/** Full vertical brand lockup (icon + "Gridiron Football") for hero / marketing placements. */
export function LogoLockup({ className, height = 140 }: { className?: string; height?: number }) {
  return (
    <Image
      src="/logo.webp"
      alt="Gridiron Football"
      width={height * 1.91}
      height={height}
      style={{ height, width: "auto" }}
      className={cn("object-contain", className)}
      priority
    />
  );
}
