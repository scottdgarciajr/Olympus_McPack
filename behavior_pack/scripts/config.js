export const CONFIG = {
  maxPlayers: 8,
  allowDuplicateGods: false,
  claimMessage: 'You have become {god} — {title}. Your powers persist after death and rejoining.',
  hermesSpeedAmplifier: 5,
  hermesTurboAmplifier: 13,
  hermesSprintSpeed: 1.3,
  poseidonSwimSpeed: 1.08,
  cooldownSeconds: { hermesPearl: 300, zeusLightning: 180, zeusFlight: 180, aresRage: 300, apolloSunstep: 180 },
  zeusThunderLightningSeconds: 5,
  combinations: {
    sword_pickaxe: { xp: 30, diamond: 12, emerald: 16, lapis_lazuli: 24, netherite_ingot: 1 },
    ember_axe: { xp: 35, diamond: 16, emerald: 20, lapis_lazuli: 24, netherite_ingot: 1 },
    tide_boots: { xp: 28, diamond: 12, emerald: 16, lapis_lazuli: 24, netherite_ingot: 1 },
    lantern_helm: { xp: 24, diamond: 10, emerald: 12, lapis_lazuli: 20, netherite_ingot: 0 }
  },
  dominion: { radius: 12, durationSeconds: 30, cooldownSeconds: 300, maxBlocks: 120 },
  dionysusSameTargetCooldownSeconds: 3,
  zeusFlightSeconds: 30,
  aresRageSeconds: 30,
  apolloSunstepSeconds: 30,
  dionysusDebuffs: ['weakness', 'slowness', 'mining_fatigue', 'poison'],
  dionysusBuffs: ['strength', 'speed', 'resistance', 'regeneration', 'haste'],
  dionysusTeleportMin: 8,
  dionysusTeleportMax: 16,
  friendlyFire: true,
  debug: false
};
