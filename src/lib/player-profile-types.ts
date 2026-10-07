export interface PlayerWeekStat {
  week: number;
  fantasyPoints: number | null;
  passingYards: number | null;
  completions: number | null;
  attempts: number | null;
  passingTds: number | null;
  interceptions: number | null;
  carries: number | null;
  rushingYards: number | null;
  rushingTds: number | null;
  targets: number | null;
  receptions: number | null;
  receivingYards: number | null;
  receivingTds: number | null;
  receivingAirYards: number | null;
  yardsAfterCatch: number | null;
  targetShare: number | null;
  airYardsShare: number | null;
  wopr: number | null;
  racr: number | null;
  snapShare?: number | null;
  injuryStatus?: string | null;
  practiceStatus?: string | null;
  passingCpoe?: number | null;
  sacksSuffered?: number | null;
}

export interface PlayerInjuryHistoryWeek {
  season: number;
  week: number;
  reportStatus: string | null;
  practiceStatus: string | null;
  reportPrimaryInjury: string | null;
  practicePrimaryInjury: string | null;
}

export interface PlayerProfileData {
  name: string;
  team: string;
  position: string;
  season: number;
  gsisId: string | null;
  jerseyNumber: number | null;
  headshotUrl: string | null;
  birthDate: string | null;
  height: number | null;
  weight: number | null;
  college: string | null;
  yearsExperience: number | null;
  rookieSeason: number | null;
  draftYear: number | null;
  draftRound: number | null;
  draftPick: number | null;
  draftTeam: string | null;
  status: string | null;
  weeks: PlayerWeekStat[];
  history?: {
    season: number;
    weeks: (Pick<PlayerWeekStat, "week" | "fantasyPoints" | "rushingYards" | "receivingYards" | "targetShare" | "airYardsShare">
      & Partial<Pick<PlayerWeekStat, "targets" | "carries" | "receptions" | "snapShare" | "injuryStatus" | "practiceStatus">>)[];
  }[];
  injuryHistory?: PlayerInjuryHistoryWeek[];
}
