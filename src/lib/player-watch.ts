// Parlay Builder "observed" watchlist: players you're keeping an eye on
// without committing to a pick yet. Same localStorage pattern as
// player-favorites.ts, kept separate from favorites/targeted on purpose.
"use client";

import { useSyncExternalStore } from "react";
import { syncPlayerListEntry } from "@/app/actions/player-lists";

const STORAGE_KEY = "gridiron-hq:observed-player-ids";
const CHANGE_EVENT = "gridiron-hq:observed-players-changed";

function getSnapshot() {
  return typeof window === "undefined" ? "" : window.localStorage.getItem(STORAGE_KEY) ?? "";
}

function getServerSnapshot() {
  return "";
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

function parseFavoriteIds(snapshot: string) {
  return new Set(
    snapshot
      .split(",")
      .map(Number)
      .filter((id) => Number.isSafeInteger(id) && id > 0),
  );
}

export function usePlayerWatch() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return parseFavoriteIds(snapshot);
}

export function togglePlayerWatch(playerId: number) {
  const favorites = parseFavoriteIds(getSnapshot());
  const nowPresent = !favorites.has(playerId);
  if (favorites.has(playerId)) favorites.delete(playerId);
  else favorites.add(playerId);

  window.localStorage.setItem(STORAGE_KEY, [...favorites].sort((a, b) => a - b).join(","));
  window.dispatchEvent(new Event(CHANGE_EVENT));

  // Best-effort server mirror so the betting profile page (if the bettor
  // makes it public) can show this list to other people. The localStorage
  // write above is already done and already reflected in the UI; this is
  // fire-and-forget and never blocks or rolls back the local toggle.
  void syncPlayerListEntry("observed", playerId, nowPresent).catch(() => {});
}
