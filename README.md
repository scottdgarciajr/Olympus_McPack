# Olympus SMP

A Minecraft Bedrock Survival add-on for eight friends. Import **`dist/Olympus_SMP_FINAL.mcaddon`** (version 2.4.1), activate **Olympus SMP Behavior** and its linked resource pack, and enable cheats for setup commands. Requires Bedrock 1.21.90+ and stable `@minecraft/server` and `@minecraft/server-ui` 2.0.0.

## Quick setup

1. Back up your world and activate both packs. Have an operator stand near world spawn and run `/function olympus/setup` once. The script searches natural, unobstructed sites within roughly 144 blocks of spawn and places the bundled **33 × 15 × 33** Hall of Eight Gods. It refuses sites with an artificial surface, terrain height variation over three blocks, or occupied space above the surface. If no site qualifies, setup gives the operator a Hall Placement Seal. Stand where you want the Hall centered and use the seal. It overwrites the full 33 × 15 × 33 volume, including existing builds; only the world height limit and loaded chunks can prevent placement.
2. Each player interacts with an enchanting-table altar to read that god's abilities, weakness, and offering, then reserves it for **10 minutes**. Gather the exact offering and return to the same altar to claim. A reservation belongs to one player; after it expires someone else can reserve the god. Each god can be claimed by one player only.
3. Keep the granted relic for its special. Passives remain active while holding other equipment, after death, and after rejoining. Use `/function olympus/controls` to repeat your controls.
4. The same setup command prepares the Crown trial at the Hall's existing gold and sea lantern center. After claiming a god, bring **1 gold ingot, 1 iron ingot, 1 emerald, and 1 lapis lazuli** and interact with the center sea lantern. The first claim consumes the offerings. Wear the Crown and use its Seal of Divine Authority to open the menu. If Dimensional Dominion says the Crown is not worn, open `/function olympus/crown_status` to see the recorded owner and equipped state; a reconnect now reconciles a changed player ID by owner name and god. `/function olympus/crown_status` opens the same menu.

The Hall blocks player mining and building and filters explosion damage inside its 33 × 15 × 33 footprint. The Crown transfers to the player who kills its owner, even if the owner took it off. A crowned non-Zeus god suppresses their own god penalties and gets half cooldowns on existing active abilities. Zeus gets time/weather control and the universal Dominion ability, with no god-specific cooldown or weakness benefits. Divine Authority changes day/night or weather with a shared five-minute cooldown. Crown weather lasts two minutes, then restores the previous weather type. The wearer is revealed approximately every five minutes; fifteen minutes of online, equipped possession outside the Hall's 20-block safe zone earns one Glory. The Crown menu includes the leaderboard.

The Crown menu also offers **Dimensional Dominion**: 30 seconds of temporary Underworld or Overworld terrain within a 12-block radius, on its own five-minute cooldown. It changes at most 120 natural surface blocks. Underworld Dominion grants Hades his realm buffs inside its zone. The pack records original block states before changing them and restores them on expiry, transfer, unequip, disconnect, or restart. Water/lava changes require a fully enclosed natural stone basin. If a chunk is unloaded, restoration waits until it loads.

Operator tools: `/function olympus/crown_setup`, `/function olympus/crown_status`, `/function olympus/crown_reset`, `/function olympus/crown_recover`, `/function olympus/crown_glory`, and `/function olympus/crown_help`. Reset preserves Glory. The existing `/function olympus/setup` is the one-command world setup for the Hall, all eight altars, and the Crown throne. The optional older mountain uses a separate command because it replaces a large area at the operator's chosen location.

**Bedrock limits:** A custom helmet in a container cannot always be intercepted before storage. Only the recorded owner can use its power; recovery removes loaded loose copies and restores missing equipment. PvP kills transfer only when the death event identifies a player or projectile owner. Unattributed deaths keep the current owner. Weather restoration preserves the prior type, not its exact remaining duration. God penalty cleanup uses tracked applications and may be unable to distinguish an identical external effect applied at the same instant.

| God | Offering |
| --- | --- |
| Hermes | 8 feathers |
| Zeus | 1 copper ingot |
| Poseidon | 3 raw cod |
| Hades | 4 bones |
| Ares | 1 stone sword |
| Apollo | 1 bow |
| Hephaestus | 1 furnace |
| Dionysus | 3 sweet berries |

Claimed relics stay in their owners' inventory on death. Poseidon's Tidecaller, Apollo's Solar Bow, and Hephaestus's Divine Fortune pickaxe also stay on death and automatically repair while in their owner's inventory. Existing copies receive this protection when their owner has the new pack active.

The older Mount Olympus mountain remains available with `/function olympus/summon_mountain`. Its summit altar shows god information, while claiming now takes place at the Hall of Eight Gods. The mountain generator replaces blocks; back up the world before using it.

`/function olympus/give_all` is an operator relic kit. Unclaimed players cannot use it to skip the altar offering. Each god belongs to one player. An operator can release a role with `execute as <player> run function olympus/reset`.

## Gods

| God | Passive buffs | Passive debuff | Ability or equipment |
| --- | --- | --- | --- |
| Hermes | Speed VI normally; Speed XIV plus scripted sprint momentum; fall protection; optional Jump Boost II | Weakness III | Use relic for a Divine Ender Pearl every **5 min**. Sneak-use opens the Slow Falling and Divine Leap toggles. |
| Zeus | Unrestricted flight in rain or thunder | Mining Fatigue II always | Aim at a block or enemy and use relic for lightning. Thunder lightning has a **5 sec** interval; clear weather retains its **3 min** cooldown. Sneak-use for **30 sec** of flight, unrestricted in rain or thunder. |
| Poseidon | Strength II while submerged, Strength I in exposed rain, plus Conduit Power and Dolphin's Grace III in water or open rain; scripted movement and rain fall protection | Slowness III and Weakness III in Nether or desert | Sneak-use toggles Tidal Sprint; Tidecaller retains Riptide III and its boosted launch. |
| Hades | Fire Resistance and Night Vision always; Strength I/Haste I at Overworld night; Strength IV/Haste IV in Nether or End | Slowness III and Weakness III only in direct Overworld daylight | Covered caves and buildings protect him from daylight debuffs. Use the relic while standing in fire or lava to launch a visible Hellfire fireball (15 sec cooldown; 6 damage). |
| Ares | Strength II and Resistance II | Slowness III | Strength V and Resistance III rage for **30 sec** on a **5 min** cooldown. |
| Apollo | Solar Bow with Power V, Infinity I, Unbreaking III, plus **6 scripted arrow damage in direct sunlight** or 2 out of sunlight | Weakness III and Mining Fatigue II without direct sunlight | Relic menu: daylight flight for **30 sec** (3 min cooldown), arm one Solar Flare arrow (45 sec cooldown after impact), or use Oracle’s Sight (40-block radius, 8 sec reveal, 2 min cooldown). |
| Hephaestus | Haste IV, Efficiency V and Divine Fortune IV pickaxe | Permanent Weakness III | The pickaxe has a **35% chance** for one bonus ore drop. Only Hephaestus can combine equipment at the Hall or a portable Divine Forge. |
| Dionysus | Each melee hit on a new target adds a random self buff. Strength, Speed, and Haste can reach IV for 180 sec; Resistance caps at III for 180 sec and Regeneration at II for 60 sec. Successfully used Bone Meal replenishes one-for-one. | Madness rises to 10 stacks: longer, stronger Nausea, random teleportation, and an increasing chance of Blindness | The same hit gives that target a debuff for 180 sec and teleports Dionysus 8–16 blocks when a safe spot exists. **Different targets trigger instantly; the same target has a 3 sec cooldown.** Debuffs can coexist and strengthen up to level IV. Repeated hits can refresh Regeneration, but its level stays capped; external stronger effects remain intact. |

**Hermes:** Speed VI is always active. Hold sprint to enter Speed XIV with additional directional momentum targeting 1.3 blocks per tick, designed to outrun a very fast horse. Left/right input now maps to the correct strafing directions; release sprint or sneak for a slower pace. A bright gold trail appears while sprinting. Slow Falling starts on. Sneak-use can switch the constant glide off; a dangerous fall automatically reactivates protection during descent.

**Divine Leap:** Sneak-use Hermes's relic and choose the Divine Leap toggle. It starts OFF, persists across death and restart, and applies Jump Boost II while enabled. Turning it off lets the short managed effect expire within roughly one second; external Jump Boost is not removed. The exact obstacle height depends on Bedrock movement and must be checked in game.

**Poseidon:** Sneak-use the relic to toggle Tidal Sprint on or off. When on, movement in water or exposed land during rain targets 1.08 blocks per tick with correct left/right steering and a blue trail. It works in shallow water as well as while swimming. Conduit Power and Dolphin's Grace III apply in water or exposed rain even with Tidal Sprint off. During rain or thunder, falling applies brief Resistance V so landings do not deal fall damage without slowing the fall. The native Riptide III trident still requires water or rain; a successful launch receives an extra forward push. Nether and desert penalties counter the mobility advantage.

**Zeus:** Lightning and flight each have a three-minute cooldown in clear weather. Thunder lightning has a separate persistent five-second interval; switching weather or transferring the Crown does not clear it. Rain retains the existing lightning behavior. Flight has no cooldown in rain or thunder, even under cover, and lasts 30 seconds per use. Zeus receives no role-specific Strength.

**Apollo:** Use the relic to choose Sunflight, arm/disarm Solar Flare, or activate Oracle’s Sight. An armed Solar Flare marks only the next arrow fired from Apollo’s divine bow. The flying arrow now leaves a bright gold beam trail. On block or entity impact it creates a large sun shaft and two glowing rings, blinds eligible targets within 3 blocks for 3 seconds, and deals up to 4 extra health points to nearby targets. The direct-hit target receives Apollo's normal scripted bow bonus instead of another Flare damage bonus. Oracle scans once within 40 blocks in the current dimension, then gives Apollo an eight-second viewer-only colored halo around each detected player/creature and a nearby directional particle ray, plus the existing HUD bearing. The particles make the reveal visual, though solid walls can occlude distant halos; the nearby ray and HUD still point toward hidden targets. Both cooldowns use the Crown's existing half-cooldown rule.

**Hades:** Use the relic while physically inside regular fire, soul fire, or lava to launch a visible fireball along the crosshair. The fireball uses the vanilla fireball artwork on a separate non-igniting projectile and deals one scripted 6-health-point impact. It has a 15-second cooldown, or 7.5 seconds when crowned. Nether residence, netherrack, lava merely nearby, and Underworld Dominion alone do not meet the requirement. The projectile cannot ignite or break terrain.

**Hephaestus:** Use your Forge Relic to open the in-game Forge Guide. The Hall's vanilla smithing table beside your altar is ready after `/function olympus/setup`. For a portable Divine Forge, put **one crafting table in the center** of a 3×3 crafting grid and **eight iron ingots around it**. Only Hephaestus can place this item on an empty block. It becomes a vanilla smithing table; tap it anywhere to open the combination menu. Breaking a portable forge drops its item for reuse. Select any recipe to see the price. To combine, hold its diamond base item in your selected hotbar slot and carry the second ingredient, all listed materials, and the required XP levels; then confirm. A finished item retains the base enchantments and durability, can be traded or looted, and can only be combined once.

| Result | Held base + second ingredient | Additional cost | Effect |
|---|---|---|---|
| Sword-Pickaxe | Diamond pickaxe + diamond sword | 30 levels, 12 diamonds, 16 emeralds, 24 lapis, 1 netherite ingot | Mines as a pickaxe; +1 melee damage |
| Ember Axe | Diamond axe + blaze rod | 35 levels, 16 diamonds, 20 emeralds, 24 lapis, 1 netherite ingot | Ignites hit target for 3 seconds |
| Tide Boots | Diamond boots + Heart of the Sea | 28 levels, 12 diamonds, 16 emeralds, 24 lapis, 1 netherite ingot | Dolphin's Grace I in water |
| Lantern Helm | Diamond helmet + lantern | 24 levels, 10 diamonds, 12 emeralds, 20 lapis | Night Vision while worn |

Edit `CONFIG.combinations` in `behavior_pack/scripts/config.js` to adjust costs. The supplied *Combine Anything V2* pack inspired this mechanic; its 1.26.40/Script API 2.7.0 dependency prevents directly bundling it into this 1.21.90 pack. Its world-destroying TNT and high-damage weapons are not included.

**Flight:** Zeus and Apollo rise while holding **jump**, descend while holding **sneak**, hover when both are released, and steer with normal movement. Apollo needs direct sunlight to activate and sustain flight.

Each god has a custom relic icon, colored particle emblem, sound, and ambient aura. Every temple altar displays the god's powers, weakness, offering, and claim status.

## Limits and approximations

- Stable Bedrock Script API 2.0.0 does not expose Creative flight to Survival players. Flight uses per-tick vertical control while players remain in Survival.
- Stable Script API 2.0.0 has no cancellable fall-damage event. Hermes uses Slow Falling, which changes descent speed; Poseidon instead receives brief Resistance V while falling in rain or thunder. That may also briefly block other damage during the fall. Test extreme falls and server lag before relying on it.
- Bedrock caps real enchantments at vanilla levels. Divine Fortune IV is Fortune III plus a scripted ore bonus. Apollo's enhanced bow damage is a scripted bonus on hit.
- Combined items use standard Minecraft equipment with persistent per-item Script API metadata and lore. Their added effects are scripted; the four recipes do not raise vanilla enchantment limits. A missing or incompatible behavior pack removes those added effects. A scripted +1 hit follows the vanilla melee hit and may have slightly different armor interactions.
- Hellfire uses a non-destructive custom projectile with vanilla fireball artwork. Oracle uses viewer-only target halos and a particle bearing ray; Bedrock Script API 2.0 does not offer a viewer-only through-wall outline, so solid walls may hide target halos. Solar Flare particles and sounds are cosmetic and do not create a world explosion.
- Rain powers use the stable weather-change event. If installed during existing rain, a weather transition may be needed before the pack recognizes it. Covered areas and dry biomes do not count as open rain.

## Operator commands

| Command | Result |
| --- | --- |
| `/function olympus/help` | Quick instructions |
| `/function olympus/setup` | Place the Hall of Eight Gods near world spawn after a safe-site scan |
| `/function olympus/status` | Script diagnostic and claimed roles |
| `/function olympus/summon_mountain` | Gives the sigil |
| `/function olympus/give_all` | Gives all eight relics as an operator kit; it does not claim gods |
| `/function olympus/controls` | Repeats your controls |
| `/function olympus/reset` | Releases your role |
| `/function olympus/upgrade_mountain` | Raises an old short Olympus |
| `/execute as <player> run scriptevent olympus:assign hermes` | Directly assigns an online player; replace the god name |

For player-specific functions from a command block, use `execute as <player> at @s run function ...`. Quote game names with spaces. Upgrading a short mountain replaces blocks in the wider area; back up and clear that area first.

## Dedicated server

Stop the Bedrock Dedicated Server and back up the world. Extract the `.mcaddon` ZIP. Copy `behavior_pack` to `behavior_packs/OlympusSMP_BP` and `resource_pack` to `resource_packs/OlympusSMP_RP`. Preserve other entries and add these entries to the arrays in the world's pack files:

`world_behavior_packs.json`: `{"pack_id":"a06ad1f9-8b44-4af1-995a-95dc9c684c25","version":[2,3,0]}`

`world_resource_packs.json`: `{"pack_id":"def06a91-6e05-457a-a359-714565d4c32c","version":[2,3,0]}`

Restart, join as operator, follow Quick setup, and have clients accept the resource pack. For a Realm, activate the pack on a local world, verify it, then upload that world with Replace World.

## Rebuild and verification

Edit `behavior_pack/scripts/config.js` for balance. Run `npm run build` to regenerate the original Bedrock structure and installable archive. Preserve pack UUIDs and increment the version in `generate_assets.py` for later updates. The reference [Roman / Greek Style Shrine Temple](https://www.planetminecraft.com/project/roman-greek-style-shrine-temple/) informed the broad Greek temple style. Its download page did not state permission to redistribute a modified schematic, so the bundled Hall is original. Offline checks parse the structure and package but cannot establish that Minecraft loaded the script; use `TESTING.md` in a test world.
