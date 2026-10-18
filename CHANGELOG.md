# Changelog

## 3.5.11 - Repair temple upgrade permissions

- Replace removed Player.isOp() calls with the supported playerPermissionLevel / PlayerPermissionLevel.Operator check. The old upgrade handler could throw after Minecraft printed generic function success. Apply the same correction to god release/share commands.
- Report dimension and absolute altar coordinates, READY/BLOCKED status, obstruction guidance and visible native errors. Preserve original altars, existing claims and obstructing blocks.
- All 3.5.10 clutch improvements, native Riptide behavior and probe clearance remain unchanged. Regression checks exercise API 2.x permission properties without an isOp mock. Native 3.5.11 upgrade confirmed by the user: READY messages and all three added altars visible.

## 3.5.10 - Clutch beside flowers and water

- Support modern flowers, thin plants, snow layers and natural water in landing pools and their perimeter. Restore original block states and water levels after five seconds, including overlapping pools.
- Fall back to one native water source at the actual landing cell when an obstacle prevents the large pool from fitting. The source may flow normally until cleanup. Protected/unloaded terrain still rejects placement; solid landing cells cannot falsely report success.
- Preserve all 3.5.9 features, inventory locks, native trident behavior and the verified weather probe fix. Automated checks cover restoration, overlap, fallback and protected terrain; native landing checks remain pending.

## 3.5.9 - Separate Hearth tools, earned wisdom and weather probe clearance

- Move weather detector entities off players, maintaining at least 12 blocks of clearance. Native A/B testing confirmed that changing only weather probe placement restored normal Tidecaller launch in the same world. The user also confirmed status 3.5.9 and normal launch with the complete installed update. Preserve the archived 3.4.4 trident behavior and inventory protections.
- Hestia's relic opens her toolbox. Seven separately equipped tools provide selection, painting, clipboard, terrain, erasing, quick construction and undo. Materials can be selected from anywhere in inventory; placements consume resources and small edits have shorter shared cooldowns. Healing is an explicitly labeled toolbox action.
- Artemis gains one extra jump in actual darkness, reset by landing. Athena earns bounded bonus raw XP from eligible mob kills, capped at 40 per minute, alongside her existing enchanting workshop.
- Retain the earlier gods, dynamic Zeus sky flight, Hall upgrade command, resource accounting, persistent history and native gear protections. Automated build, regression and archive parity checks pass.

## 3.5.8 - Resource builder, enchanting workshop and actual 3.4.4 Poseidon rollback

- Restore archived Poseidon movement, swim helper, complete release behavior, gear maintenance and construction/delivery, including the original delayed release boost. Remove the launch observer. Clutch now uses exposed rain OR dangerous descent with any trident held. Inventory locking remains.
- Verify live Zeus flight transitions from Y70 through Y220 beyond the initial timer; add sky-entry/exit feedback.
- Add Hestia World Builder: selections, clipboard/transforms, fills/outlines, brushes, terrain tools, palettes, cost previews and 24 persistent undo/redo steps. Resource accounting, 128-block/16m bounds, shared 20s build cooldown, protected/special-block and creature checks.
- Expand Athena to eight capped enchanting recipes and consumed-book transfer/combination, XP/lapis costs, native caps/conflicts and shared 3m cooldown. Retain other gods and exclusive forge/bow advantages. Add in-game handbook and BUILDER_AND_ENCHANTING.md.
- Offline regression checks and archive comparisons pass; actual native Riptide and competitive-balance verification remain pending.

## 3.5.7 — Passive landing clutch, distinct utilities, Zeus sky domain

- Keep the native trident stack, Riptide III, inventory lock and death protection. No native charge/use/release handler, extra launch boost or enchantment repair is added. Selected charged weapons are now excluded from all periodic stack writes, even metadata migration. Generic movement assistance yields to fast external momentum and airborne dry exits, removing a remaining braking path without consulting trident state or the clutch observer. Clutch observes launch motion and only places water during descent; portable exposed-rain clutch remains.
- Hestia retains her existing powers and gains Hearth Foundation on sneak-use: a bounded 3x3 floor consuming carried building blocks one-for-one, 15s cooldown. It skips existing terrain, protected Hall/Forge/Dominion locations and creatures, and rolls placement back on rejected writes.
- Athena retains Aegis/passives and gains Scholarly Craft on sneak-use: ordinary gear in the next hotbar slot gains one Unbreaking level (max III) near an enchanting table. Cost: 6 XP levels + 3 lapis per upgrade, 180s cooldown. Bound gear and all tridents excluded; other enchantments preserved. No free XP or material generation. Both utilities require Survival/Creative.
- Zeus gains full power only in exposed Overworld Y220+ or thunderstorms: Strength II, Resistance I, unlimited flight at 1.3 sprint target, five-second lightning interval. Ground/other-dimension power: no combat buff, 15s flight per 90s at 0.8 sprint target, lightning per 45s. Mining Fatigue II underground and in other dimensions. Sky exit starts a 15s descent window and flight cooldown; ordinary rain and covered terrain grant no full power. Ground lightning timers persist across sky casts. Apollo and other gods' configured speeds remain unchanged.
- Preserve the previous weather/Zeus infrastructure, Artemis controls/aim/tracking, forge, Crown, inventory locks and Hall upgrade command. Offline regression/build validation does not substitute for native Riptide and balance playtesting.


## 3.5.6 — Native trident use and portable rain/landing clutch

- Remove the entire custom Poseidon trident-release branch, including its old extra launch impulse. No charge/stop hooks, repair command or enchantment edits are installed. Preserve the native trident, original inventory/death protections and general swim controller.
- Let native tridents, bows and crossbows pass through block-interaction cancellation so aiming at Hall/interactive blocks does not intercept native weapon use. Block placement/break protection remains. Defer selected native charged-weapon durability maintenance until the item is put away, preventing periodic stack replacement during use.
- As approved, use approximate read-only launch recognition for the next Riptide-shaped landing, including water-origin launches in clear weather. Do not claim exact native Riptide-state detection. Independently restore exposed-rain fall clutch with no trident prerequisite. Ordinary clear falls remain unarmed; admin disable overrides both paths. Retain bounded placement, cleanup and terrain protections.
- Server-native weather events/probes initialize existing rain on startup/rejoin with no saved/local-world weather dependency. Add fresh dedicated-server/Realm runtime regression checks, including missing optional biome APIs, roofs, native dry probes and clear weather.
- Preserve Artemis night/darkness/other-dimension sprint/invisibility gating, aim assist and creature tracking. 138 offline tests pass; native engine/server gameplay acceptance remains pending.

## 3.5.5 — Complete trident rollback and independent clutch observer

- Restore the entire Poseidon release handler and movement controller to the archived v3.4.4 implementation. Retain the original native trident definition, Riptide equipment creation, inventory locking, keep-on-death and release boost. Remove all trident repair commands/helpers, automatic enchantment edits and charge lifecycle hooks. Release handling no longer arms water or writes rain state.
- Detect launch-like acceleration with a separate read-only observer in the player tick. It only reads native held-trident/enchantment/velocity state and returns an arming decision; it cannot write the item, change movement/input/effects, or change weather. Existing rain, landing, terrain protection and water cleanup rules remain. Ordinary falls do not arm water. Aligned knockback while holding a Riptide trident is a documented motion-detection limitation.
- Restrict Artemis's invisibility and 1.22 grounded sprint to Overworld night, darkness at light 0-3, or another dimension. Bright Overworld daytime disables both, while creature tracking remains independent. Preserve the chosen invisibility toggle for resumption when eligible; preserve longer external potion effects.
- Validate exact archived release/controller parity and passive observer isolation, plus rain/dimension/acceleration boundaries and Artemis environment transitions. 133 offline tests pass; native engine verification remains pending.

## 3.5.4 — Restore Tidecaller protections and earlier Riptide path

- Restore Tidecaller's native inventory lock and keep-on-death policy. Automatically relock existing carried, queued and vaulted tools. The v3.5.3 unlock exception was speculative and is superseded.
- Restore Poseidon's v3.4.4 movement controller and original release boost. Remove the added charge-history lifecycle, charge/stop handlers, velocity-baseline rejection and movement suppression. Keep clutch arming after the established release path, rain recognition and ordinary-fall gating.
- Remove automatic enchantment repair from the periodic inventory protection loop. Keep the explicit held-item repair command, which restores both Riptide III and inventory locking without replacing the tool or resetting the role.
- Preserve Artemis invisibility, 1.22 sprint, aim assist, continuous creature Oracle, other gods and the Hall upgrade command. Add a provenance-documented archived movement fixture and regression checks for inventory locking and post-release-only clutch integration. Offline tests do not establish the native launch root cause; Minecraft verification remains pending.

## 3.5.3 — Tidecaller native-use compatibility and Artemis mobility

- Exempt only Tidecaller from native inventory locking; keep its owner metadata and keep-on-death flag. This deliberate compatibility exception allows dropping/storage/trading. Older carried/vault Tidecallers follow the new flag policy.
- Repair existing carried Tidecaller Riptide III and remove conflicting Loyalty/Channeling in place, outside charging. Add `/function olympus/riptide_repair` for explicit held-item repair and a report of real enchantment/flags. No role reset, replacement tool or fabricated launch.
- Pause all scripted Poseidon movement during native charge and release grace. Clear suppression on canceled use while retaining the grace for successful releases. Native launch confirmation continues to gate rain landing water.
- Add Artemis sneak-use Hunt Controls with invisibility and creature-tracking toggles. Native invisibility leaves equipment visible and preserves longer external potion effects. Add grounded sprint target 1.22 blocks/tick; preserve Apollo, Hermes and Poseidon speeds, as explicitly selected. No flight, fall immunity, swimming boost or extra airborne thrust.
- Automated checks cover trident migration/repair, canceled-use suppression, real swim-controller suspension, invisibility ownership and sprint gates/targets. Minecraft launch and movement acceptance remains pending.

## 3.5.2 — Artemis Moon Bow aim assist

- Reuse Apollo's Prophetic Bow steering for Artemis's Moon Bow at Overworld night or light 0-3. Share the existing aim cone, turn rate, target lock, speed preservation and solid-wall checks. Bright daytime pauses steering.
- Preserve Moon Bow's existing +10 conditional damage, once per hit, without adding Solar Flare or changing Apollo's plain Prophetic arrows. Handle delayed projectile ownership and item switching using the same bounded release snapshots.
- Update controls, bow lore, versioned package and latest marker. Automated checks cover target/wall behavior, environmental gating, speed preservation, damage/duplicate handling and late ownership. Bedrock gameplay verification remains pending.

## 3.5.1 — Native Riptide, night Artemis and explicit Hall upgrade

- Require a charged native Tidecaller launch, including forward acceleration, before arming rain landing water. Ordinary falls and failed uses never arm a pool. Preserve native momentum through Tidal Sprint/dry exits, defer trident rewrites during charge/spin, and avoid mistaking a clear-weather water launch for rain. Landing water retains bounded placement, containment, cleanup and admin controls.
- Make Artemis a night/darkness counterpart to Apollo: locked Power V/Infinity I/Unbreaking III Moon Bow with +10 damage at Overworld night or light 0-3; Speed II and Night Vision in those conditions, Weakness III otherwise. Huntstride needs night/darkness. No flight, aim assist or Solar Flare.
- Continuous Artemis Oracle uses the existing private compass, trails and creature particles, with no expiration/cooldown and no chest scanner. Default on, sneak-use relic to toggle. Preserve the existing 48m creature range and 48-target cap.
- Add operator command `/function olympus/upgrade_gods` to add the three new altars to a saved Hall without rebuilding or resetting claims. Obstructions are preserved and reported. Setup still supports the same upgrade.
- Publish a clearly versioned 3.5.1 archive, identical FINAL alias and LATEST marker. Regression checks exercise real event wiring, launch/landing sequencing, ordinary/failed-use rejection, tracker persistence and exclusions, Moon Bow damage and safe upgrade routing. Minecraft gameplay acceptance remains pending.


## 3.5.0 — Athena, Artemis and Hestia

- Release packaging now produces `dist/Olympus_SMP_v3.5.0.mcaddon`, an identical `Olympus_SMP_FINAL.mcaddon` compatibility copy, and `LATEST.txt` naming the current release with its SHA-256. Validate complete archive/source parity and consistent release versions. All v3.4.5 Zeus, rain/weather-sensor, Riptide-clutch and earlier compatibility features remain included.

- Add three conservative roles using native effects: Athena's brief defensive Aegis, Artemis's bounded Huntstride, and Hestia's short self regeneration. All have passive weaknesses; no new Strength, damage multipliers, ally healing or terrain changes.
- Integrate twelve relics with claims, operator assignment, Creative kit, personal equipment locks, cosmetic signatures, controls, cooldown-ready notices, Crown cooldown/weakness rules, and Kratos gift/burden theft.
- Add compact front altars to fresh Halls. Setup fills clear footprints in existing Halls, preserves obstructions, and can be rerun. Keep the original structure identifier and eight Crown domains.
- Bump generated manifests, dependency versions and package to 3.5.0. Preserve existing pack UUIDs and earlier pending changes.
- Offline validation covers burst duration, cooldown rejection, passive interaction, external effect preservation, conditional night vision, regeneration refresh prevention, and safe repeated altar upgrades. In-game acceptance remains pending.


## 3.4.5 — Zeus survivability and server rain detection

- Zeus now has unlimited toggleable flight throughout the Overworld, with no activation cooldown. Nether/End flight remains 30 seconds with a three-minute cooldown; portals stop unlimited flight. Sprint speed and ascent match Apollo.
- Add Strength II during Overworld rain/thunder and Y220+ storm power. Apply Mining Fatigue II only beneath a natural underground ceiling; clear it immediately in the open and always at Y220+.
- Replace the 24-block lightning limit with a 384-block ray and angular aim spread. Terrain blocks entity targeting; distant strikes can miss by several blocks. Existing lightning cooldown rules remain.
- Initialize weather with an invisible native environment sensor, including server startup during rain. Per-Poseidon native wet probes remove dependency on optional biome APIs for local rain. Sensors clean up after reload/disconnect and expire if scripts stop.
- Native rainy Riptide launches refresh rain recognition and rearm landing water clutch. Existing real-water placement, admin controls, protection checks and five-second cleanup remain.
- Add regression coverage for startup weather, missing biome API, flight duration/dimensions/cooldowns, Strength/fatigue, long-range lightning obstruction/spread and Riptide clutch rearming. Dedicated-server gameplay verification remains pending.

## 3.4.4 — Native Minecraft animations and compass-only Oracle

- Remove copied vanilla player/mob behavior and client definitions, generated mesh outlines/controllers and their generators. Minecraft now supplies all vanilla entity/weapon animations, including Hermes's spear. No replacement animation set is bundled.
- Keep Oracle's private gold compass, colored ground directions/trails, target/chest particles, bounded discovery and bearing/distance feedback. Remove model-shaped ESP/property overrides; old custom chest markers despawn on upgrade.
- Preserve custom Olympus equipment appearances using native armor rendering, god abilities, Poseidon clutch, Vibrant Visuals compatibility and cooldown notices.
- Build checks reject any new vanilla entity/item or animation/controller override. 96 tests pass; Minecraft visual verification remains pending.

## 3.4.3 — Optional Vibrant Visuals and quiet ready notices

- Declare resource-pack `pbr` compatibility with existing Bedrock 1.21.120 minimum. Players choose Vibrant Visuals locally on compatible devices; normal graphics remain available and RTX is not required.
- Send private one-time ability-ready chat notices after observed cooldowns expire. Group simultaneous completions and enforce a ten-second minimum between ready messages. Cancel queued reminders when a move is reused, reset, removed, or its role changes; ignore already expired timers on login and clear disconnected sessions.
- Cover god abilities, worn Crown Authority/Dominion, original forge powers and longer utility actions. Exclude fast gadgets and per-target combat timers from chat spam. Keep environmental requirements and actual cooldown durations unchanged.
- Automated suite: 94 tests pass; client graphics/play verification remains pending.

## 3.4.2 — Rain placement repair, selectable sizes and native ground steps

- Replace custom containment dependency with native pass-through structure voids. Temporarily replace/restore natural plants instead of aborting the whole pool; recognize sand/grass/stone floors without a liquid API query. Placement failures report their reason once per fall.
- Default rain clutch remains 3x3 across and two tall. Add persistent size controls: single restores original native one-water behavior with brief natural flow; default restores containment; custom width/depth/height bounded to 5/5/3. All modes expire after five seconds, rain only, no Slow Falling/immunity.
- Hermes uses actual physical foot support and a checked block-grid step for natural full-block ledges, avoiding ground-flag flicker and ray/teleport rejection around grass. Preserve velocity, headroom checks and the one-block limit; no airborne/wall climbing.
- Automated regression coverage now includes grass/sand floors, vegetation restoration, missing liquid queries, original single-water mode, size persistence and ground-flag flicker. Minecraft play verification remains pending.

## 3.4.1 — Contained rain pool and mountain-edge stepping

- Poseidon rain clutch now places a 3x3 footprint of ordinary water, two blocks tall. Passable invisible edges prevent flow; water and edges clean up after five seconds. Rain-only, bucket-free, admin toggles and no Slow Falling remain.
- Protect terrain and abort unsafe/unloaded containment; roll back partial placement if persistence fails. Remove water before boundaries, retaining shared edges beside unexpired/unloaded sources.
- Hermes checks both shoulders as well as his center so mountain-edge contacts can step onto supported single-block ledges. Try alternate supported positions when the center route lacks clearance; tall walls, low ceilings and airborne stepping remain excluded.
- Automated checks cover pool dimensions, containment ordering, rollback, rain gates, edge contacts and headroom. Minecraft play testing remains pending.

## 3.4.0 — Utility forge expansion and simple rain clutch

- Ten new non-PvP utility recipes: Lantern Helmet, Clockwork Trackless Cart, Wayfinder, Ariadne Trail Spool, Builder Wand, Seedweaver Planter, Autumn Harvest Sickle, Reclaimer, Thermal Lens and Survey Level. Fourteen forge products total; forge guide lists full costs and controls.
- Real fueled moving light; fueled, ground-only cart with one-block stepping and fuel/health-preserving packing. Building/farming consume materials; salvage rejects bound/enchanted gear and returns at most half remaining iron value. Other tools provide bounded navigation and planning information.
- Restore Poseidon's simple rain-only, bucket-free, single native water source; remove it after five seconds. No wide cushions, new containment edges, fall immunity or Slow Falling. Clear residual Slow Falling from Poseidon.
- Persistent global/per-player administrator clutch commands. Update both pack descriptions, status and tooltips to v3.4.0.
- Automated suite: 79 tests pass; native Minecraft play testing remains pending.

## 3.3.5 — Restore ordinary clutch water and repair Hermes steps

- Replaces the failed waterlogged carrier with ordinary Minecraft water. Invisible, non-colliding, untargetable temporary edges block fluid flow; water is removed before edges after two seconds.
- Shared edges and unloaded source cleanup preserve containment across spatial shards; all placement rolls back if persistence fails. No damage immunity.
- Hermes attempts one-block steps before the sprint-only early return, including during regular fast walking and briefly interrupted sprinting. Collision rays ignore plants, and a grounded automatic hop is available if a valid direct step is rejected. Tall walls remain unclimbable.

## 3.3.4 — Two-second still-water clutch and immediate wet-power cleanup

- Clutch uses real water in a transparent non-colliding carrier, with flow disabled in all six directions. No fall-damage immunity.
- Water and carrier expire after two seconds; fluid is removed first so cleanup cannot release it to spread.
- Water/rain transitions are checked each tick. Strength, Haste and Conduit clear on dry exit, and water vision clears on leaving water. Clear weather ignores stale wet-sensor state.
- Tidal Sprint extra momentum ends on dry exit; native Riptide launches clear the Tidal marker and retain their own momentum.

## 3.3.3 — Water-only clutch for fast landings, corners and gaps

- Removed all Poseidon fall-immunity properties, damage-sensor rules and brief clutch grace; safety is physical water only.
- Four-tick swept landing prediction uses body corners and nearby ledges. Wide water cushions cover block corners and fill air gaps between blocks.
- Rechecks every tick and can place new water after a second airborne trident launch; no one-placement-per-fall latch.
- Every generated source still expires after 30 seconds. Compact spatial cleanup shards support many simultaneous cushions and clean up legacy v3.3.2 timers.

## 3.3.2 — Rain clutch and gentle swim cruise

- Rain clutch activates only in exposed Overworld rain and no longer needs/consumes a water bucket. Removes the unconditional rain fall guard.
- Clutch water sources expire after 30 seconds; world-persistent cleanup retries unloaded chunks and preserves replacement building blocks.
- Mild horizontal swimming assistance targets ordinary walking speed even without Tidal Sprint, preserving vertical controls and faster movement.
- Tidecaller remains a native trident; the reported block-breaking issue was Creative-only, where vanilla prohibits trident block destruction.

## 3.3.1 — Hermes single-block ramping

- Hermes automatically steps up single-block ledges while sprinting, retaining momentum.
- Requires grounded movement, a supported landing and clear standing space across the step. Two-block walls, ceilings, hazards, unloaded space and airborne movement stop stepping; no wall-climbing impulse.
- Pack descriptions, controls and status identify v3.3.1.

## 3.3.0 — Oracle compass, private tool vault and sprint control

- Gold ground compass with cyan player, red mob, green animal and orange chest bearings/trails; matching target accents. Particle feedback continues if native outlines fail.
- Prophetic Bow: stronger native-arrow steering, golden flight trail, target-lock feedback, delayed-owner/release detection; no damage/status bonuses.
- Personal Tool Vault: sneak + look straight down + use own relic. Stores exact tool durability, enchantments and binding; persistent token/journal recovery prevents replayed withdrawal duplicates. Stored tools cannot be recovered as new copies.
- Tidal Sprint requires sprinting; releasing sprint stops its extra thrust.
- Pack names, descriptions, status, tool lore and controls identify v3.3.0.

## 3.2.1 — Modest sea mining and fall-only protection

- Keep underwater Haste at I to preserve readable trident/melee swings. Adaptive Conduit mining compensation accounts for submersion, floating and Aqua Affinity, targeting roughly 6–24% faster mining than unbuffed land mining; rain Haste remains II.
- Replace rain/clutch Resistance V with a native damage sensor that cancels only fall damage. Combat, fire, projectile and explosion damage still apply while falling.
- Update versioned descriptions and regression coverage. In-game mining timing, damage and animation checks remain pending.

## 3.2.0 — Visible sea buffs, native curving bow, animated Oracle

- Inventory-lock personal god relics/tools/Crown gear, with death protection and persistent reserved delivery when inventory is full. Hephaestus's forged products remain tradeable/storable; personal Divine Fortune and his relic are locked. Existing carried gear migrates on rejoin.

- Removed unsupported Dolphin's Grace from Poseidon's passive path, which aborted Strength/Haste. Added Haste XX underwater and Haste II in rain, alongside Strength II. Native wet-environment sensing handles rain on reload.
- Replaced the clutch's unavailable `isSolid` check with stable collidable-floor raycasts. Clutch is always automatic with a main-inventory water bucket, confirms placement, and cushions fast landings.
- Replaced the relic-fired projectile with a separate named vanilla Prophetic Bow: normal draw/release and arrows, target-locked gentle steering every tick, no damage/status buffs.
- Replaced camera-projected Oracle mob boxes with per-viewer animated gold mesh edges derived from vanilla bones; retained golden particle accents. Added world-positioned chest markers and one-block HUD distance accuracy.
- Sunflight steers at walking speed normally and uses the old fast speed only while sprinting.
- Zeus receives cooldown-free flight activation and five-second storm lightning at Y220+ in the Overworld.
- Pack names/descriptions, role menus, welcome and status display v3.2.0. Added strict stable-API regression coverage. Minecraft acceptance remains pending.

## 3.1.1 — Poseidon water exits

- Tidal Sprint now respects jump input even without forward movement or while looking down. Holding jump eases horizontal thrust and lifts Poseidon toward the bank.
- Level swimming no longer cancels upward vanilla momentum, making water exits possible without the trident. Added a movement regression test; in-game verification remains pending.

## 3.1.0 — Water, light, and Oracle ESP

- Based directly on GitHub main 0b1436d (2.7.3); unstable local overhaul archived separately.
- Poseidon: Strength II in water/rain, underwater Haste II and clear blue-tinted vision, no swimming hunger, inventory water-bucket clutch, rain fall protection through the landing tick.
- Dionysus: Regeneration I cap; other buffs and durations unchanged.
- Apollo: faster unlimited sunflight, five-second lightflight each minute, night/darkness Weakness III, no Mining Fatigue, stronger Solar Bow, separate plain assisted projectile, viewer-only golden box ESP on creatures/players/chests.
- Bundled MIT Fluoroscopy outline texture and pinned source provenance. Requires stable API 2.3.0 and Bedrock 1.21.120+.
- Added offline regression tests; Minecraft visual/gameplay acceptance remains pending.

## 2.7.3 — Clear Crown throne checklist

- The throne now lists the eight required item names with possession checkmarks, without tying items to gods or domains. The first-claim prompt and Crown help use the same neutral wording.

## 2.7.2 — Ability-earned Crown offerings and God Slayer progression

- Replaced the crafted Crown offerings with resources each god is especially equipped to obtain: Creeper Head, Prismarine Crystals, Ominous Bottle, and Poisonous Potato. Hermes, Hades, Ares, and Hephaestus retain their ability-earned offerings.
- A Crown owner must wear their own Crown at the throne to choose a recipient for a duplicate. The original Crown and owner record remain with them; the new fully powered Crown has a separate owner. Added an offline regression test for this consent and ownership flow.
- Kratos now claims with an Iron Sword. Each god kill adds one random lasting gift or burden until he dies, without a gameplay copy cap. Duplicate effects are stored compactly and do not multiply effect levels; existing single lasting copies migrate on the next kill.
- Updated the guide and testing checklist. Bedrock gameplay still needs an in-game verification pass.

## 2.7.1 — Dragon victories for every extra Crown

- Each duplicate Crown now consumes its Dragon Egg and one recorded Ender Dragon victory, as well as the eight domain offerings. A single kill cannot fund multiple Crowns even when Bedrock generates an extra vanilla egg.
- Each Ender Dragon killed in the End adds one persistent victory and awards one Dragon Egg to a player in the End. Respawning and killing the dragon again makes further Crowns possible.
- Updated the Creative test kit to provide one test victory with its egg and offerings, plus the README and in-game checklist. Existing Crown ownership remains intact.

## 2.7.0 — Forbidden god and endgame Crowns

- Added Kratos's darker chamber beneath the existing Hall, reached by the rear scaffolding, with a Nether Star claim. Hits on gods grant one random representative gift or burden for eight seconds; a god kill stores one copy until Kratos dies.
- Reworked Crown state into separately numbered owners and cooldowns. The first Crown and every later one cost eight domain offerings, including a War Trophy earned from a player kill. A Dragon Egg is a reusable catalyst for later Crowns; there is no fixed Crown count cap. Existing single-Crown worlds migrate on load.
- Improved Dimensional Dominion's terrain search around the player and prioritized water and lava conversion. Failed activations explain why and do not consume the cooldown.
- Changed Hades's Hellfire and Hephaestus's Cinderbolt to native ghast-style fireball impacts with power-one, terrain-breaking, fire-starting explosions. Their direct damage is tuned below a vanilla ghast hit; the Hall remains explosion protected.
- Reduced Undertow Boots' worn geometry to the boot area.
- Added an Olympus Creative Test Kit for switching gods and obtaining Crown trial supplies. Operators can open a god to additional players without removing the current owner, or vacate an abandoned god slot and revoke former owners.
- Updated the README, Forge Guide text, item lore, and in-game checklist. Offline validation passed; in-game behavior still requires a Bedrock playtest.

## 2.6.0 — Distinct Divine Forge creations

- Replaced the four new forge outputs with separate custom items using item and boot artwork from the supplied *Combine Anything V2.1* add-on: Forgecleaver Sword-Pickaxe, Cinderbolt Pickaxe, Undertow Boots, and Magnetwood Axe. Existing previously forged vanilla gear keeps its old powers.
- Added an ore-finding pulse, a terrain-safe fire projectile, a short water surge, and bounded dropped-item gathering. Costs and power limits are configurable.
- Updated the Forge Guide, item lore, Creative test kit, README, and in-game checklist with recipes, controls, cooldowns, and explicit outcomes.


## 2.5.0 — Creative Hephaestus kit and beginner guide

- Added a Creative inventory test kit that grants Hephaestus's relic, Divine Fortune pickaxe, portable forge, and all four finished combination items. It works only in Creative mode; when available, it claims Hephaestus for an unassigned tester.
- Test samples use the same persistent item metadata and gameplay effects as equipment produced at the Divine Forge. Survival crafting costs and Hephaestus-only forge access remain in place.
- Reworked the README with first-time Bedrock import, world activation, one-command Hall setup, god claiming, Crown use, upgrade steps, and a guide to all eight gods.

## 2.4.2 — Dionysus teleport repair

- Replaced an unsupported `Block.isSolid` landing check with a Script API 2.0 block raycast. Dionysus now teleports 8–16 blocks after a qualifying melee proc when a clear, safe landing exists.
- Hazardous or blocked destinations remain excluded. If no safe location is found, the player receives explicit feedback while the other Madness effects still activate.
- Added landing selection regression tests and included them in the package build.

## 2.4.1 — Dionysus survival balance

- Capped Dionysus's random Regeneration at II for 60 seconds and Resistance at III. His Strength, Speed, and Haste can still reach IV; random buff selection, curses, teleportation, and Madness remain intact.
- Stronger unrelated potion or beacon buffs are no longer overwritten by a weaker Dionysus roll. The new caps and duration are configurable.

## 2.4.0 — Visible divine powers and portable forge

- Apollo's Solar Flare now draws a gold trail during flight and a bright shaft and rings on impact. Oracle's Sight adds viewer-only colored target halos and local particle bearings for eight seconds.
- Hades can launch Hellfire while occupying lava as well as fire. The projectile uses vanilla fireball artwork on a separate non-igniting entity.
- Hephaestus's relic opens a full Forge Guide with all four recipes and exact costs. The forge menu lists all recipes regardless of the held item. Eight iron ingots around a crafting table craft a portable Divine Forge; only Hephaestus can place and use it, and a mined forge returns its item.
- Protected the Hall footprint from player mining/building and explosion block damage. Crown ownership now reconciles a returning owner's changed player ID, and Crown grant no longer creates an extra item when the head slot is empty.
- Offline tests and package validation updated. In-game behavior still needs a Bedrock test world.

## 2.3.0 — Divine archer, Hellfire, Leap, and Harvest

- Apollo's relic now opens an ability menu for existing Sunflight, an armed Solar Flare arrow, and Oracle's Sight. Flare blinds within three blocks and damages nearby secondary targets without adding another full bonus to the direct hit. Oracle provides an eight-second directional HUD for nearby players, animals, and mobs.
- Hades can launch a safe, non-igniting Hellfire projectile only while occupying fire or soul fire. Damage and new cooldowns are configurable and use Crown reduction.
- Hermes gained a persistent, default-OFF Divine Leap toggle in the sneak-use mobility menu. Jump Boost II is short-lived and refreshed while enabled; turning it off does not remove external Jump Boost.
- Dionysus's ordinary Bone Meal now replenishes only after successful vanilla use. Replaced the periodic full-stack refill, which could generate transferable supplies without growing plants.
- Preserved existing bow, flight, god buffs, Crown, Dominion, and forge systems. No resource artwork was needed for the new effects.

## 2.2.0 — God balance and item combinations

- Removed Zeus's weather Strength and added a persistent five-second lightning interval during thunder, unaffected by the Crown. Flight remains unrestricted in wet weather.
- Added Poseidon's Strength II while submerged and Strength I in exposed rain. His water/rain movement and Riptide remain in place.
- Added Hades's Overworld night Strength I/Haste I and direct-sunlight-only daytime penalties. Nether/End Strength IV/Haste IV remain.
- Added Hephaestus-only Divine Combination Forge at the existing Hall smithing table. Four costly, tradeable item combinations replace the proposed over-limit enchantment system. Costs are configurable and effects persist on items.
- Added Crown Dimensional Dominion with temporary, recorded terrain transformations and a separate five-minute cooldown.
- The supplied Combine Anything V2 add-on targets newer Bedrock APIs, so its combination idea was adapted rather than importing incompatible scripts and resources. Destructive TNT, projectiles, and high-damage weapons from that pack are excluded; the strongest combination adds only one scripted damage.

## 2.1.0 — Crown of Olympus

- Added a wearable Crown, visible model, Divine Authority seal, offering trial at the existing Hall center, persistent ownership, PvP transfer, holder reveals, and Glory leaderboard.
- Added god penalty suppression and activation-time cooldown reduction for crowned non-Zeus players. Zeus keeps his existing storm rules; Poseidon's existing open-rain suite applies to natural and crowned rain.
- Added persistent weather override and shared Authority cooldown, Crown recovery and reset functions, and included the throne in the one-command Hall setup.

## 1.9.0 — Final package

- Removed Poseidon's permanent Slow Falling. While it rains or thunders, brief Resistance V protects him from fall damage without changing descent speed; the protection ends after landing or when the weather clears.
- Consolidated the distribution archive as `dist/Olympus_SMP_FINAL.mcaddon`.

## 1.8.0

- Zeus's lightning and 30-second flight have no cooldown during rain or thunder; each still has a separate three-minute cooldown in clear weather. His storm Strength IV still requires open rain.
- Poseidon's Tidal Sprint now works on exposed land during rain as well as in water. Conduit Power and Dolphin's Grace III still apply in both conditions, and Slow Falling protects him from falls everywhere.
- Claimed relics and the three named divine tools now have keep-on-death protection. Divine tools automatically repair in their owner's inventory, including older copies carried into this version.

## 1.7.0

- Corrected the sideways input mapping for Hermes sprint and Poseidon swimming, and applied the same fix to controlled flight.
- Reduced Poseidon's Tidal Sprint target from 1.25 to 1.08 blocks per tick. Sneak-use his relic to toggle it; Conduit Power and Dolphin's Grace remain passive.
- Raised Ares's 30-second War Rage to Strength V and Resistance III while keeping the five-minute cooldown, Strength II/Resistance II passives, and Slowness III weakness.
- Extended Dionysus's Madness to ten stacks with longer, stronger Nausea and an increasing Blindness chance. Bone Meal refills automatically while he has inventory space.

## 1.6.0

- Deepened the listed strengths and weaknesses while preserving all role triggers, 30-second flight windows, and cooldowns.
- Hermes now has Weakness III against Speed VI and sprint-only Speed XIV. Poseidon swims closer to Hermes's sprint speed and gains Dolphin's Grace III, with Slowness III/Weakness III in Nether and desert.
- Zeus has Strength IV in storms against permanent Mining Fatigue II. Hades has Strength IV/Haste IV in Nether and End against Slowness III/Weakness III by day.
- Ares's 30-second Rage now reaches Strength IV while passive Slowness rises to III. Apollo's sunlit bow gains +6 scripted damage with Weakness III outside sunlight. Hephaestus gains Haste IV against permanent Weakness III.
- Dionysus remains able to stack buffs through different targets immediately, capped at level IV, with escalating Nausea and disorienting teleportation.

## 1.5.0

- Removed the summit requirement for relic claims. A relic now claims its god anywhere; using it on any ordinary block is an input fallback. Olympus remains an optional altar and relic chest.
- Made Hermes substantially faster: Speed VI normally, Speed XIV while sprinting, and stronger directional momentum with a brighter trail. Sprinting stops the turbo when released.
- Raised Poseidon's scripted in-water movement target to 1.18 blocks per tick, near Hermes's 1.3-block sprint target, including shallow water.
- Changed Dionysus to a per-target three-second cooldown. Different mobs trigger back-to-back; repeated hits after all buff types are present strengthen existing effects up to level IV. Nausea and random teleport still trigger on every successful proc.
- Added the pack version to `/function olympus/status` so players can verify which script is active.

## 1.4.0

- Audited all eight roles against the requested ability list and raised both strengths and weaknesses to make each role matter more.
- Zeus gains Strength III during storms, has Mining Fatigue II, can strike a targeted enemy as well as a block, and has separate three-minute cooldowns for lightning and flight.
- Poseidon gets fast scripted swimming, Dolphin's Grace II, a boosted native Riptide launch, and stronger Nether/desert penalties.
- Hades gains Strength III/Haste III in Nether or End, with stronger daytime penalties. Ares has Strength II/Resistance II and a Strength III rage against Slowness II.
- Apollo's Solar Bow gains +5 scripted damage in sunlight and +2 out of sunlight; his unsheltered weakness and mining penalty are level II. Hephaestus gains Haste III and Weakness II while keeping Divine Fortune IV.
- Hermes's Weakness is now level II to offset super speed. Dionysus retains strong stackable buffs and escalating Nausea.

## 1.3.0

- Added the summit altar with a god-by-god powers screen and direct claiming; the stocked relic chest remains available.
- Made Hermes sprint with scripted directional momentum and a gold trail. Speed III and automatic dangerous-fall cushioning support the requested super-speed and fall-protection feel.
- Combined Zeus's lightning and 30-second flight into one three-minute Storm Ascension. Improved horizontal steering for both Zeus and Apollo flight.
- Removed Poseidon's Tidal Surge, Hades's Shadowstep, and Hephaestus's Forgeguard to match the specified god kits. Strength/Haste conditions were strengthened where appropriate.
- Strengthened Dionysus's stacking buffs and curses to level II for 180 seconds. Nausea lasts longer and his random teleport reaches farther.
- Updated the controls, documentation, and test checklist for the changed rules.

## 1.2.0

- Raised Mount Olympus to a 24-block climb and added a lit quartz-and-gold summit temple. Existing mountains can be rebuilt with `olympus/upgrade_mountain`.
- Added per-role control hints in chat, named relic buttons, and a controls function.
- Increased Hermes to Speed II; enabled Zeus and Poseidon rain passives through weather-change tracking.
- Replaced levitation flight with jump/sneak-controlled hover for Zeus and Apollo.
- Added Poseidon's Tidal Surge, Hades's Shadowstep, and Hephaestus's Forgeguard.
- Gave Apollo a Power V, Infinity I bow with a scripted solar damage bonus, and Hephaestus an Efficiency V pickaxe with Divine Fortune IV bonus drops.
- Dionysus can accumulate distinct buffs/debuffs across hits, with Nausea growing across four stacks.

## 1.1.0

- Added eight god-themed particle emblems with sound on claims and ability activations, plus a restrained ambient shimmer.
- Passive-role relics can display their emblem on demand without changing gameplay balance.
- Replaced lettered relic icons with individual god symbols.

## 1.0.2

- Hermes can sneak-use their relic to toggle Slow Falling. The setting persists through death and rejoining; Speed and Weakness remain active.

## 1.0.1

- Replaced the summit's empty ender chest with a shared chest containing all eight god relics.
- Existing mountains are repaired when a player approaches; missing relics restock without overwriting other chest contents.

## 1.0.0

- Initial eight-god Bedrock behavior/resource add-on.
- Persistent one-per-world role claims, cooldowns, reset and status functions.
- Summonable stepped Mount Olympus with summit-only claiming.
- Custom relics, abilities, enchanted equipment, and offline package validation.
