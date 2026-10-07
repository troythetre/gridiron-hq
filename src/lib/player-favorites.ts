"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "gridiron-hq:favorite-player-ids";
const CHANGE_EVENT = "gridiron-hq:favorite-players-changed";

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

export function usePlayerFavorites() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return parseFavoriteIds(snapshot);
}

export function togglePlayerFavorite(playerId: number) {
  const favorites = parseFavoriteIds(getSnapshot());
  if (favorites.has(playerId)) favorites.delete(playerId);
  else favorites.add(playerId);

  window.localStorage.setItem(STORAGE_KEY, [...favorites].sort((a, b) => a - b).join(","));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
