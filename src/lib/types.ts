export type Position = "QB" | "RB" | "WR" | "TE" | "K" | "DST";
export type InjuryStatusDb = "OUT" | "DOUBTFUL" | "QUESTIONABLE" | "MONITOR";
export type RosterSlotName =
  | "QB" | "RB1" | "RB2" | "WR1" | "WR2" | "TE" | "FLEX1" | "FLEX2" | "DST" | "K" | "BE";

export interface PlayerRow {
  id: number;
  name: string;
  pos: Position;
  team: string;
  wk1_pts: number | null;
  wk2_pts: number | null;
  total_pts: number;
  games: number;
  avg_pts: number;
  pos_rank: number | null;
  overall_rank: number | null;
}

export interface InjuryRow {
  id: number;
  name: string;
  pos: string | null;
  team: string | null;
  injury: string;
  status: InjuryStatusDb;
  note: string | null;
  source: string | null;
}

export interface WaiverPickRow {
  id: number;
  name: string;
  pos: string | null;
  team: string | null;
  pct_rostered_est: number | null;
  note: string | null;
  source: string | null;
}

export interface NewsItemRow {
  id: number;
  headline: string;
  body: string | null;
  item_date: string | null;
  source: string | null;
}

export interface LeagueRow {
  id: string;
  name: string;
  scoring_type: string;
  num_teams: number;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface LeagueMemberRow {
  id: string;
  league_id: string;
  profile_id: string;
  team_name: string;
  created_at: string;
}

export interface RosterSlotRow {
  id: string;
  league_member_id: string;
  player_id: number;
  slot: RosterSlotName;
  is_starter: boolean;
}

export const ROSTER_SLOTS: RosterSlotName[] = [
  "QB", "RB1", "RB2", "WR1", "WR2", "TE", "FLEX1", "FLEX2", "DST", "K", "BE",
];

export const SLOT_ELIGIBLE_POS: Record<RosterSlotName, Position[]> = {
  QB: ["QB"],
  RB1: ["RB"], RB2: ["RB"],
  WR1: ["WR"], WR2: ["WR"],
  TE: ["TE"],
  FLEX1: ["RB", "WR", "TE"], FLEX2: ["RB", "WR", "TE"],
  DST: ["DST"],
  K: ["K"],
  BE: ["QB", "RB", "WR", "TE", "K", "DST"],
};
