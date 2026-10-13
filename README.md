# Olympus SMP

A Minecraft Bedrock Survival add-on for eight friends. Import **`dist/Olympus_SMP_FINAL.mcaddon`** (version 1.9.0), activate **Olympus SMP Behavior** and its linked resource pack, and enable cheats for setup commands. Requires Bedrock 1.21.90+ and stable `@minecraft/server` and `@minecraft/server-ui` 2.0.0.

## Quick setup

1. Back up your world and activate both packs. Run `/function olympus/give_all` to receive all eight relics, or summon Mount Olympus for its altar and stocked chest.
2. Hand a relic to each friend. **Use the relic anywhere to claim that god.** If in-air use does nothing on your device, aim at any ordinary block and use it. There is no summit requirement for a relic.
3. Keep your relic for its special. Passives remain active while holding other equipment, after death, and after rejoining. Use `/function olympus/controls` to repeat your controls.

Claimed relics stay in their owners' inventory on death. Poseidon's Tidecaller, Apollo's Solar Bow, and Hephaestus's Divine Fortune pickaxe also stay on death and automatically repair while in their owner's inventory. Existing copies receive this protection when their owner has the new pack active.

To summon Olympus, leave a clear **65 × 65 × 34** Overworld space about **33 blocks east** of where you stand. Run `/function olympus/summon_mountain`, use the sigil, and keep the area loaded until the golden summit appears. The mountain replaces blocks in this space. Its enchanting-table altar lets players inspect gods before choosing; the central chest refills missing relics.

`/function olympus/give_all` gives one of every relic to the executing player for handout. Clear eight slots first; `/give` overflow may drop at your feet. From a command block, use `execute as <player> at @s run function olympus/give_all`. Each god normally belongs to one player. An operator can release a role with `execute as <player> run function olympus/reset`.

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

Each god has a custom relic icon, colored particle emblem, sound, and ambient aura. The altar shows a god's powers before the role is locked.

## Limits and approximations

- Stable Bedrock Script API 2.0.0 does not expose Creative flight to Survival players. Flight uses per-tick vertical control while players remain in Survival.
- Stable Script API 2.0.0 has no cancellable fall-damage event. Hermes uses Slow Falling, which changes descent speed; Poseidon instead receives brief Resistance V while falling in rain or thunder. That may also briefly block other damage during the fall. Test extreme falls and server lag before relying on it.
- Bedrock caps real enchantments at vanilla levels. Divine Fortune IV is Fortune III plus a scripted ore bonus. Apollo's enhanced bow damage is a scripted bonus on hit.
- Rain powers use the stable weather-change event. If installed during existing rain, a weather transition may be needed before the pack recognizes it. Covered areas and dry biomes do not count as open rain.

## Operator commands

| Command | Result |
| --- | --- |
| `/function olympus/help` | Quick instructions |
| `/function olympus/status` | Script diagnostic and claimed roles |
| `/function olympus/summon_mountain` | Gives the sigil |
| `/function olympus/give_all` | Gives all eight relics |
| `/function olympus/controls` | Repeats your controls |
| `/function olympus/reset` | Releases your role |
| `/function olympus/upgrade_mountain` | Raises an old short Olympus |
| `/execute as <player> run scriptevent olympus:assign hermes` | Directly assigns an online player; replace the god name |

For player-specific functions from a command block, use `execute as <player> at @s run function ...`. Quote game names with spaces. Upgrading a short mountain replaces blocks in the wider area; back up and clear that area first.

## Dedicated server

Stop the Bedrock Dedicated Server and back up the world. Extract the `.mcaddon` ZIP. Copy `behavior_pack` to `behavior_packs/OlympusSMP_BP` and `resource_pack` to `resource_packs/OlympusSMP_RP`. Preserve other entries and add these entries to the arrays in the world's pack files:

`world_behavior_packs.json`: `{"pack_id":"a06ad1f9-8b44-4af1-995a-95dc9c684c25","version":[1,9,0]}`

`world_resource_packs.json`: `{"pack_id":"def06a91-6e05-457a-a359-714565d4c32c","version":[1,9,0]}`

Restart, join as operator, follow Quick setup, and have clients accept the resource pack. For a Realm, activate the pack on a local world, verify it, then upload that world with Replace World.

## Rebuild and verification

Edit `behavior_pack/scripts/config.js` for balance. Run `python generate_assets.py` and `python build.py` to regenerate the installable archive. Preserve pack UUIDs and increment the version in `generate_assets.py` for later updates. Offline checks cannot establish that Minecraft loaded the script; use `TESTING.md` in a test world.
