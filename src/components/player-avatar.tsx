import { useId } from "react";
import Image from "next/image";
import { PLAYER_PHOTOS, teamColors } from "@/lib/player-visuals";

export function PlayerAvatar({
  name,
  team,
  number,
  position,
  size = 140,
  className = "",
}: {
  name: string;
  team: string;
  number?: number | null;
  position: string;
  size?: number;
  className?: string;
}) {
  const instanceId = useId().replace(/:/g, "");
  const [primary, secondary] = teamColors();
  const jersey = number && number > 0 ? number : position === "QB" ? 1 : 0;
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
  const nameSeed = [...name].reduce((seed, character) => seed + character.charCodeAt(0), 0);
  const photo = PLAYER_PHOTOS[name];
  const skinTone = ["#f1c6a5", "#d7a17e", "#ba8060", "#8e5d49", "#704633"][nameSeed % 5];
  const fieldId = `field-${instanceId}`;
  const jerseyId = `jersey-${instanceId}`;

  if (photo) {
    return (
      <span
        className={`relative inline-block shrink-0 overflow-visible rounded-full border-2 border-white/70 bg-black p-0.5 shadow-[0_0_24px_rgba(255,255,255,.18)] ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="relative block h-full w-full overflow-hidden rounded-full bg-black">
          <Image src={photo} alt={`${name} player photo`} fill sizes={`${size}px`} className="object-cover object-top" />
          <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/20" />
        </span>
        <span
          className="absolute -bottom-1 -right-1 grid place-items-center rounded-full border-2 border-background bg-black font-black text-white shadow-lg"
          style={{ width: Math.max(20, Math.round(size * 0.34)), height: Math.max(20, Math.round(size * 0.34)), fontSize: Math.max(8, Math.round(size * 0.12)) }}
          aria-hidden="true"
        >
          {jersey || position.slice(0, 2)}
        </span>
      </span>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 220"
      role="img"
      aria-label={`${name} virtual player avatar`}
      className={className}
    >
      <defs>
        <linearGradient id={fieldId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={primary} />
          <stop offset="100%" stopColor="#071019" />
        </linearGradient>
        <linearGradient id={jerseyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={primary} />
          <stop offset="100%" stopColor="#111923" />
        </linearGradient>
      </defs>
      <circle cx="110" cy="110" r="108" fill={`url(#${fieldId})`} />
      <circle cx="110" cy="110" r="91" fill="none" stroke={secondary} strokeOpacity=".45" strokeWidth="2" />
      <path d="M16 175h188M28 194h164" stroke="white" strokeOpacity=".09" strokeWidth="1" />
      <path d="M82 104h56l10 19 35 17 16 55H21l16-55 35-17z" fill={`url(#${jerseyId})`} stroke={secondary} strokeWidth="3" />
      <path d="M79 112 47 127l-18 36 20 8 23-26m69-33 32 15 18 36-20 8-22-26" fill={primary} stroke={secondary} strokeWidth="3" />
      <path d="m90 106 20 15 20-15" fill={skinTone} stroke="#754735" strokeWidth="3" />
      <path d="M74 72c0-24 16-41 37-41s37 17 37 41v22c0 24-16 40-37 40S74 118 74 94z" fill={skinTone} />
      <path d="M69 76c0-31 17-53 43-53 25 0 42 20 42 50-13-7-21-19-26-31-12 15-31 24-58 27z" fill="#10151c" />
      <path d="M64 74c4-31 21-52 49-52 30 0 46 21 48 48l-11 10-8-20-15-9-20 12-28 6-6 18z" fill={primary} stroke={secondary} strokeWidth="4" />
      <path d="M136 58h28m-27 8h29m-26 8h24" stroke={secondary} strokeWidth="3" strokeLinecap="round" />
      <path d="M144 82h28m-23 7 20 4" stroke="#d9e6ee" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="82" r="2.5" fill="#17212b" />
      <circle cx="127" cy="82" r="2.5" fill="#17212b" />
      <path d="M101 98q13 7 25 0" fill="none" stroke="#8f5548" strokeWidth="2" strokeLinecap="round" />
      <text x="110" y="151" textAnchor="middle" fill={secondary} fontFamily="Arial,sans-serif" fontSize="9" fontWeight="900" letterSpacing="2">{position}</text>
      <text x="110" y="176" textAnchor="middle" fill="white" fontFamily="Arial,sans-serif" fontSize="29" fontWeight="900" letterSpacing="-1">{jersey || initials}</text>
      <rect x="68" y="194" width="84" height="18" rx="9" fill={secondary} />
      <text x="110" y="207" textAnchor="middle" fill="#071019" fontFamily="Arial,sans-serif" fontSize="10" fontWeight="900" letterSpacing="2">{team}</text>
    </svg>
  );
}
