"use client";

/*
 * Shared parlay bet-slip state - the single source of truth for the
 * legs/stake a user is building, used by both the manual leg editor
 * (ParlayBetSlip, under the Sportsbook Analysis tab) and the new
 * click-to-add flow from sportsbook-analysis.tsx's line cards.
 *
 * This used to live inline inside parlay-lab.tsx's SavedState/
 * localStorage blob alongside draftPicks/collegeTeams/prospects. It's
 * pulled out into its own useSyncExternalStore-backed module (same
 * pattern as player-favorites.ts / player-targets.ts / player-watch.ts)
 * so sportsbook-analysis.tsx can read and mutate the slip without
 * reaching into parlay-lab.tsx's component state. It intentionally uses
 * a NEW storage key (rather than reusing "gridiron-hq-parlay-lab-v1") so
 * a user's old saved legs are picked up fresh under the new shape
 * instead of silently colliding with the old blob's "legs"/"stake" keys,
 * which parlay-lab.tsx still owns for draftPicks/collegeTeams/prospects.
 */

import { useSyncExternalStore } from "react";

export type BookLine = { book: string; odds: string };
export type ParlayLeg = {
  id: string;
  event: string;
  selection: string;
  odds: string;
  book?: string;
  bookLines?: BookLine[];
};
type SlipState = { legs: ParlayLeg[]; stake: string };

const STORAGE_KEY = "gridiron-hq:parlay-slip-v1";
const CHANGE_EVENT = "gridiron-hq:parlay-slip-changed";
const DEFAULT_STATE: SlipState = { legs: [], stake: "10" };

let fallbackSnapshot: string | null = null;

function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return fallbackSnapshot;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

function parseState(snapshot: string | null): SlipState {
  if (!snapshot) return DEFAULT_STATE;
  try {
    const saved = JSON.parse(snapshot) as Partial<SlipState>;
    return {
      legs: Array.isArray(saved.legs) ? saved.legs : [],
      stake: typeof saved.stake === "string" ? saved.stake : DEFAULT_STATE.stake,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeState(state: SlipState) {
  const value = JSON.stringify(state);
  fallbackSnapshot = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // The slip still persists for this tab's lifetime even when storage is unavailable.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function rowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Reads the current parlay slip (legs + stake), re-rendering the caller
 * whenever it changes in this tab or another one. */
export function useParlaySlip(): SlipState {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return parseState(snapshot);
}

export function setParlayLegs(legs: ParlayLeg[]) {
  writeState({ ...parseState(getSnapshot()), legs });
}

export function setParlayStake(stake: string) {
  writeState({ ...parseState(getSnapshot()), stake });
}

export function clearParlayLegs() {
  writeState({ ...parseState(getSnapshot()), legs: [] });
}

export function removeParlayLeg(id: string) {
  const state = parseState(getSnapshot());
  writeState({ ...state, legs: state.legs.filter((leg) => leg.id !== id) });
}

export function updateParlayLeg(id: string, patch: Partial<Omit<ParlayLeg, "id">>) {
  const state = parseState(getSnapshot());
  writeState({
    ...state,
    legs: state.legs.map((leg) => (leg.id === id ? { ...leg, ...patch } : leg)),
  });
}

/** Adds a leg built from a clicked sportsbook line. Capped at 12 legs to
 * match the existing manual-editor limit. Returns the new leg's id, or
 * null if the slip was already full. */
export function addParlayLeg(leg: Omit<ParlayLeg, "id">): string | null {
  const state = parseState(getSnapshot());
  if (state.legs.length >= 12) return null;

  const id = rowId();
  writeState({ ...state, legs: [...state.legs, { ...leg, id }] });
  return id;
}

/** Whether a given event/selection/book combination is already in the
 * slip - used to show an "added" state on a line card instead of letting
 * a user silently add the same leg twice. */
export function isLegInSlip(legs: ParlayLeg[], event: string, selection: string, book?: string): boolean {
  return legs.some(
    (leg) => leg.event === event && leg.selection === selection && (book == null || leg.book === book)
  );
}
