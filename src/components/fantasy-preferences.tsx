"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ScoringFormat = "standard" | "half_ppr" | "ppr";
export type LeagueMode = "redraft" | "dynasty";

type FantasyPreferences = {
  scoring: ScoringFormat;
  mode: LeagueMode;
  setScoring: (value: ScoringFormat) => void;
  setMode: (value: LeagueMode) => void;
};

const STORAGE_KEY = "gridiron-hq-preferences-v1";
const Defaults: FantasyPreferences = {
  scoring: "half_ppr",
  mode: "redraft",
  setScoring: () => {},
  setMode: () => {},
};
const PreferencesContext = createContext<FantasyPreferences>(Defaults);

export function FantasyPreferencesProvider({ children }: { children: ReactNode }) {
  const [scoring, setScoring] = useState<ScoringFormat>(Defaults.scoring);
  const [mode, setMode] = useState<LeagueMode>(Defaults.mode);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<{ scoring: ScoringFormat; mode: LeagueMode }> | null;
      if (saved?.scoring && ["standard", "half_ppr", "ppr"].includes(saved.scoring)) setScoring(saved.scoring);
      if (saved?.mode && ["redraft", "dynasty"].includes(saved.mode)) setMode(saved.mode);
    } catch {
      // Keep defaults if browser storage is unavailable or malformed.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ scoring, mode }));
    } catch {
      // Preferences still work for this session if browser storage is unavailable.
    }
  }, [scoring, mode]);

  return <PreferencesContext.Provider value={{ scoring, mode, setScoring, setMode }}>{children}</PreferencesContext.Provider>;
}

export function useFantasyPreferences() {
  return useContext(PreferencesContext);
}

export function FantasyPreferenceControls() {
  const { scoring, mode, setScoring, setMode } = useFantasyPreferences();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted">League settings</span>
      <Select value={scoring} onValueChange={(value) => setScoring(value as ScoringFormat)}>
        <SelectTrigger aria-label="Scoring format" className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="standard">Standard</SelectItem>
          <SelectItem value="half_ppr">Half-PPR</SelectItem>
          <SelectItem value="ppr">PPR</SelectItem>
        </SelectContent>
      </Select>
      <Select value={mode} onValueChange={(value) => setMode(value as LeagueMode)}>
        <SelectTrigger aria-label="League type" className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="redraft">Redraft</SelectItem>
          <SelectItem value="dynasty">Dynasty</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function pointsForFormat(halfPprPoints: number, receptions: number, scoring: ScoringFormat) {
  const adjustment = receptions * 0.5;
  if (scoring === "ppr") return halfPprPoints + adjustment;
  if (scoring === "standard") return halfPprPoints - adjustment;
  return halfPprPoints;
}
