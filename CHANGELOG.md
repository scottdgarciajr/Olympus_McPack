# Changelog

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
