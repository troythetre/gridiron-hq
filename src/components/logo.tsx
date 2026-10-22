import Image from "next/image";
import { cn } from "@/lib/utils";

// Real pixel dimensions of /public/logo-icon.png (301x443 - a tall mark,
// not square). Next/Image derives its aspect ratio from width/height, so
// passing a square width={height} here lied about the ratio: the browser
// then rendered it at the *real* 0.68 ratio via `width: "auto"`, which
// never matched what Next thought it was and triggered its
// "width or height modified but not the other" console warning - this was
// the same class of bug behind the other image-fit issues on the site.
const LOGO_ICON_ASPECT = 301 / 443;

/** Compact horizontal lockup for nav bars / sidebars: icon mark + wordmark. */
export function Logo({ className, height = 28 }: { className?: string; height?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/logo-icon.png"
        alt=""
        width={Math.round(height * LOGO_ICON_ASPECT)}
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
