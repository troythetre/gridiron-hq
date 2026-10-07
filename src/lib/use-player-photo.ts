"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getPlayerPhotoOptions } from "@/lib/player-visuals";

const selectedPhotos = new Map<string, string>();
const listeners = new Map<string, Set<() => void>>();

function getSnapshot(key: string, initialPhoto: string | null) {
  return selectedPhotos.get(key) ?? initialPhoto;
}

function subscribe(key: string, options: string[], onChange: () => void) {
  const subscribers = listeners.get(key) ?? new Set<() => void>();
  subscribers.add(onChange);
  listeners.set(key, subscribers);

  if (options.length > 1 && !selectedPhotos.has(key)) {
    queueMicrotask(() => {
      if (selectedPhotos.has(key)) return;
      selectedPhotos.set(key, options[Math.floor(Math.random() * options.length)]);
      listeners.get(key)?.forEach((listener) => listener());
    });
  }

  return () => {
    subscribers.delete(onChange);
    if (subscribers.size === 0) {
      listeners.delete(key);
      selectedPhotos.delete(key);
    }
  };
}

export function usePlayerPhoto(name: string, fallback?: string | null) {
  const options = useMemo(() => getPlayerPhotoOptions(name, fallback), [name, fallback]);
  const initialPhoto = options[0] ?? null;
  const key = `${name}:${options.join("|")}`;

  return useSyncExternalStore(
    (onChange) => subscribe(key, options, onChange),
    () => getSnapshot(key, initialPhoto),
    () => initialPhoto,
  );
}
