# Olympus SMP

A Minecraft Bedrock Survival add-on for eight friends. Import **`dist/Olympus_SMP_FINAL.mcaddon`** (version 2.1.2), activate **Olympus SMP Behavior** and its linked resource pack, and enable cheats for setup commands. Requires Bedrock 1.21.90+ and stable `@minecraft/server` and `@minecraft/server-ui` 2.0.0.

## Quick setup

1. Back up your world and activate both packs. Have an operator stand near world spawn and run `/function olympus/setup` once. The script searches natural, unobstructed sites within roughly 144 blocks of spawn and places the bundled **33 × 15 × 33** Hall of Eight Gods. It refuses sites with an artificial surface, terrain height variation over three blocks, or occupied space above the surface. If no site qualifies, setup gives the operator a Hall Placement Seal. Stand where you want the Hall centered and use the seal. It overwrites the full 33 × 15 × 33 volume, including existing builds; only the world height limit and loaded chunks can prevent placement.
2. Each player interacts with an enchanting-table altar to read that god's abilities, weakness, and offering, then reserves it for **10 minutes**. Gather the exact offering and return to the same altar to claim. A reservation belongs to one player; after it expires someone else can reserve the god. Each god can be claimed by one player only.
3. Keep the granted relic for its special. Passives remain active while holding other equipment, after death, and after rejoining. Use `/function olympus/controls` to repeat your controls.
4. The same setup command prepares the Crown trial at the Hall's existing gold and sea lantern center. After claiming a god, bring **1 gold ingot, 1 iron ingot, 1 emerald, and 1 lapis lazuli** and interact with the center sea lantern. The first claim consumes the offerings. Wear the Crown and use its Seal of Divine Authority to open the menu. `/function olympus/crown_status` opens the same menu.

The Crown transfers to the player who kills its owner, even if the owner took it off. A crowned non-Zeus god suppresses their own god penalties and gets half cooldowns on existing active abilities. Zeus gets only time and weather control. Divine Authority changes day/night or weather with a shared five-minute cooldown. Crown weather lasts two minutes, then restores the previous weather type. The wearer is revealed approximately every five minutes; fifteen minutes of online, equipped possession outside the Hall's 20-block safe zone earns one Glory. The Crown menu includes the leaderboard.

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
| Hermes | Speed VI normally; Speed XIV plus scripted sprint momentum; fall protection | Weakness III | Use relic for a Divine Ender Pearl every **5 min**. Sneak-use toggles Slow Falling glide. |
| Zeus | Strength IV in open rain or thunder | Mining Fatigue II always | Aim at a block or enemy and use relic for lightning; sneak-use for **30 sec** of flight. Both have **no cooldown during rain/thunder**; each has its own **3 min** cooldown in clear weather. |
| Poseidon | Conduit Power and Dolphin's Grace III in water or open rain; optional scripted fast movement in both; fall-damage protection during rain without Slow Falling | Slowness III and Weakness III in Nether or desert | Sneak-use the relic to toggle Tidal Sprint; Tidecaller trident has Riptide III, Unbreaking III, and a stronger Riptide launch. |
| Hades | Fire Resistance and Night Vision always; Strength IV and Haste IV in Nether or End | Slowness III and Weakness III during Overworld daytime | His realm changes combat and mining power. |
| Ares | Strength II and Resistance II | Slowness III | Strength V and Resistance III rage for **30 sec** on a **5 min** cooldown. |
| Apollo | Solar Bow with Power V, Infinity I, Unbreaking III, plus **6 scripted arrow damage in direct sunlight** or 2 out of sunlight | Weakness III and Mining Fatigue II without direct sunlight | Daylight flight for **30 sec**, **3 min** cooldown. One arrow is given and must remain in inventory. |
| Hephaestus | Haste IV, Efficiency V and Divine Fortune IV pickaxe | Permanent Weakness III | The pickaxe has a **35% chance** for one bonus ore drop. |
| Dionysus | Each melee hit on a new target adds a random level II self buff for 180 sec; further hits can raise existing buffs up to level IV. A Bone Meal stack refills automatically. | Madness rises to 10 stacks: longer, stronger Nausea, random teleportation, and an increasing chance of Blindness | The same hit gives that target a debuff for 180 sec and teleports Dionysus 8–16 blocks when a safe spot exists. **Different targets trigger instantly; the same target has a 3 sec cooldown.** Debuffs can coexist and strengthen up to level IV. |

**Hermes:** Speed VI is always active. Hold sprint to enter Speed XIV with additional directional momentum targeting 1.3 blocks per tick, designed to outrun a very fast horse. Left/right input now maps to the correct strafing directions; release sprint or sneak for a slower pace. A bright gold trail appears while sprinting. Slow Falling starts on. Sneak-use can switch the constant glide off; a dangerous fall automatically reactivates protection during descent.

**Poseidon:** Sneak-use the relic to toggle Tidal Sprint on or off. When on, movement in water or exposed land during rain targets 1.08 blocks per tick with correct left/right steering and a blue trail. It works in shallow water as well as while swimming. Conduit Power and Dolphin's Grace III apply in water or exposed rain even with Tidal Sprint off. During rain or thunder, falling applies brief Resistance V so landings do not deal fall damage without slowing the fall. The native Riptide III trident still requires water or rain; a successful launch receives an extra forward push. Nether and desert penalties counter the mobility advantage.

**Zeus:** Lightning and flight each have a three-minute cooldown in clear weather. During rain or thunder, both can be reused without a cooldown, even when Zeus is under cover. Flight still lasts 30 seconds per use. Strength IV requires open rain.

**Flight:** Zeus and Apollo rise while holding **jump**, descend while holding **sneak**, hover when both are released, and steer with normal movement. Apollo needs direct sunlight to activate and sustain flight.

Each god has a custom relic icon, colored particle emblem, sound, and ambient aura. Every temple altar displays the god's powers, weakness, offering, and claim status.

## Limits and approximations

- Stable Bedrock Script API 2.0.0 does not expose Creative flight to Survival players. Flight uses per-tick vertical control while players remain in Survival.
- Stable Script API 2.0.0 has no cancellable fall-damage event. Hermes uses Slow Falling, which changes descent speed; Poseidon instead receives brief Resistance V while falling in rain or thunder. That may also briefly block other damage during the fall. Test extreme falls and server lag before relying on it.
- Bedrock caps real enchantments at vanilla levels. Divine Fortune IV is Fortune III plus a scripted ore bonus. Apollo's enhanced bow damage is a scripted bonus on hit.
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

`world_behavior_packs.json`: `{"pack_id":"a06ad1f9-8b44-4af1-995a-95dc9c684c25","version":[2,1,2]}`

`world_resource_packs.json`: `{"pack_id":"def06a91-6e05-457a-a359-714565d4c32c","version":[2,1,2]}`

Restart, join as operator, follow Quick setup, and have clients accept the resource pack. For a Realm, activate the pack on a local world, verify it, then upload that world with Replace World.

## Rebuild and verification

Edit `behavior_pack/scripts/config.js` for balance. Run `npm run build` to regenerate the original Bedrock structure and installable archive. Preserve pack UUIDs and increment the version in `generate_assets.py` for later updates. The reference [Roman / Greek Style Shrine Temple](https://www.planetminecraft.com/project/roman-greek-style-shrine-temple/) informed the broad Greek temple style. Its download page did not state permission to redistribute a modified schematic, so the bundled Hall is original. Offline checks parse the structure and package but cannot establish that Minecraft loaded the script; use `TESTING.md` in a test world.
