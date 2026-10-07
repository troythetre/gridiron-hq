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
  profileHref?: string;
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
  article_url?: string | null;
  source_url?: string | null;
  image_url?: string | null;
  topics?: string[] | null;
}

export interface MarketHistoryPoint {
  week: number;
  price: number;
}

export interface PlayerMarketRow {
  id: string;
  name: string;
  pos: string;
  team: string;
  price: number;
  changePct: number;
  history: MarketHistoryPoint[];
  catalyst: string | null;
  catalystUrl: string | null;
  games: number;
  averagePoints: number;
  volatility: "LOW" | "MEDIUM" | "HIGH";
  isRanked: boolean;
}

export interface FantasyVideoRow {
  video_id: string;
  title: string;
  description: string | null;
  channel_title: string;
  published_at: string;
  thumbnail_url: string;
  watch_url: string;
  topics: string[];
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

// ============================================================================
// Sleeper sync
// ============================================================================
export interface SleeperRosterPlayer {
  sleeper_player_id: string;
  name: string;
  pos: string;
  team: string | null;
}

export interface SleeperLinkRow {
  id: string;
  profile_id: string;
  sleeper_username: string;
  sleeper_user_id: string;
  avatar: string | null;
  created_at: string;
}

export interface SleeperRosterRow {
  id: string;
  profile_id: string;
  sleeper_league_id: string;
  league_name: string;
  team_name: string | null;
  wins: number;
  losses: number;
  ties: number;
  roster_json: SleeperRosterPlayer[];
  synced_at: string;
}

// ============================================================================
// Trade system (native leagues only)
// ============================================================================
export type TradeOfferStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";

export interface TradeBlockRow {
  id: string;
  league_member_id: string;
  player_id: number;
  note: string | null;
  created_at: string;
}

export interface TradeOfferRow {
  id: string;
  league_id: string;
  proposer_member_id: string;
  recipient_member_id: string;
  status: TradeOfferStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeOfferItemRow {
  id: string;
  trade_offer_id: string;
  player_id: number;
  from_member_id: string;
}
