export const PLAYER_PHOTOS: Record<string, string> = {
  "A.J. Brown": "/player-avatars/aj_brown.webp",
  "Amon-Ra St. Brown": "/player-avatars/amonra_stbrown.jpeg",
  "Bhayshul Tuten": "/player-avatars/bhayshul_tuten.webp",
  "Bijan Robinson": "/player-avatars/bijan_robinson.jpeg",
  "CeeDee Lamb": "/player-avatars/ceedee_lamb.jpeg",
  "Chase Brown": "/player-avatars/chase_brown.jpeg",
  "DeVonta Smith": "/player-avatars/devonta_smith.avif",
  "Derrick Henry": "/player-avatars/images.jpeg",
  "Dak Prescott": "/player-avatars/dak_prescott.webp",
  "David Montgomery": "/player-avatars/david_montgomery.jpeg",
  "George Pickens": "/player-avatars/george_pickens.webp",
  "Jahmyr Gibbs": "/player-avatars/jahmyr_gibbs.jpg",
  "Josh Jacobs": "/player-avatars/josh_jacobs.webp",
  "Justin Herbert": "/player-avatars/justin_herbert.jpg",
  "Kirk Cousins": "/player-avatars/kirk_cousins.webp",
  "Lamar Jackson": "/player-avatars/lamar_jackson.avif",
  "Parker Washington": "/player-avatars/parker_washington.jpeg",
  "Puka Nacua": "/player-avatars/puka_nacua.png",
  "Quinshon Judkins": "/player-avatars/quinshon_judkins.jpeg",
  "Rhamondre Stevenson": "/player-avatars/rhamondre_stevenson.jpeg",
  "Tony Pollard": "/player-avatars/tony_pollard.jpeg",
  "TreVeyon Henderson": "/player-avatars/treveyon_henderson.webp",
  "Zay Flowers": "/player-avatars/zay_flower.jpeg",
};

export const TEAM_COLORS: Record<string, [string, string]> = {
  ARI: ["#97233f", "#ffb612"], ATL: ["#a71930", "#000000"], BAL: ["#241773", "#9e7c0c"],
  BUF: ["#00338d", "#c60c30"], CAR: ["#0085ca", "#101820"], CHI: ["#0b162a", "#c83803"],
  CIN: ["#fb4f14", "#111111"], CLE: ["#311d00", "#ff3c00"], DAL: ["#003594", "#869397"],
  DEN: ["#fb4f14", "#002244"], DET: ["#0076b6", "#b0b7bc"], GB: ["#203731", "#ffb612"],
  HOU: ["#03202f", "#a71930"], IND: ["#002c5f", "#a2aaad"], JAX: ["#006778", "#d7a22a"],
  KC: ["#e31837", "#ffb81c"], LAC: ["#0080c6", "#ffc20e"], LAR: ["#003594", "#ffa300"],
  LV: ["#000000", "#a5acaf"], MIA: ["#008e97", "#fc4c02"], MIN: ["#4f2683", "#ffc62f"],
  NE: ["#002244", "#c60c30"], NO: ["#d3bc8d", "#101820"], NYG: ["#0b2265", "#a71930"],
  NYJ: ["#125740", "#ffffff"], PHI: ["#004c54", "#a5acaf"], PIT: ["#ffb612", "#101820"],
  SEA: ["#002244", "#69be28"], SF: ["#aa0000", "#b3995d"], TB: ["#d50a0a", "#34302b"],
  TEN: ["#0c2340", "#4b92db"], WAS: ["#5a1414", "#ffb612"],
};

export function teamColors(team: string): [string, string] {
  return TEAM_COLORS[team] ?? ["#202b39", "#ffd400"];
}
