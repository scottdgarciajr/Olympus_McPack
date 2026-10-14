# Olympus SMP

A Minecraft **Bedrock Edition** add-on for the eight Olympian gods and the forbidden ninth god, Kratos. This download contains a behavior pack (the game rules) and a resource pack (the art). Install **both**. Current version: **2.7.3**. It requires Minecraft Bedrock 1.21.90 or newer. It is not a Java Edition mod.

## Start here: add the pack to your world

1. [Open `Olympus_SMP_FINAL.mcaddon` in this repository](dist/Olympus_SMP_FINAL.mcaddon), then choose **Download raw file** to save it. Save a backup of the world you plan to use. The setup command places a large structure and can overwrite the area you choose with a placement seal.
2. Open the `.mcaddon` file with **Minecraft Bedrock** (on Windows, double-click it). Wait for Minecraft to report that the import succeeded. If your device asks which app should open the file, choose Minecraft.
3. For a **new world**, choose **Play → Create New → Create New World**. For an **existing world**, choose **Play**, then the pencil/edit button next to that world. In the world settings, open **Add-Ons → Behavior Packs → My Packs**, find **Olympus SMP Behavior**, and choose **Activate**. Check **Resource Packs → My Packs** and activate **Olympus SMP Resources** if it was not activated automatically. On a server or Realm, see the sections below.
4. Turn on **Cheats** in the world settings so setup commands work. Cheats can disable achievements for that world. Enter the world as its owner or an operator.
5. Open chat and run **`/function olympus/setup`**. This one command places the Hall, all god altars, the Crown throne, the forge, and Kratos's chamber beneath the Hall. The Hall is 33 × 15 × 33 blocks, with the lower chamber extending seven blocks underground; keep the area clear. The script searches for a safe site near world spawn. If it cannot find one, it gives you a **Hall Placement Seal**. Stand where you want the Hall centered and use the seal.
6. Run **`/function olympus/status`**. It should say `v2.7.3 script active`. If it reports an older version, leave the world, open its pack settings, deactivate the older Olympus packs, activate the newly imported packs, and rejoin.

### First steps in the Hall

- Each of the eight enchanting tables is an Olympian altar. Kratos's forbidden altar is the netherite block in the darker chamber downstairs: descend the scaffolding near the rear center of the Hall. Use an altar to read that god's powers and offering. Choose **Reserve**; the reservation lasts **10 minutes**. Bring the offering back and use the same altar again to claim. Gods are exclusive until an operator opens one to additional players.
- The relic you receive activates that god's special power. **Use** means press your normal item Use button. **Sneak-use** means crouch while using it. The god's passive abilities work without holding the relic. Run **`/function olympus/controls`** whenever you need a reminder.
- The **Crown of Olympus** is claimed at the gold and sea-lantern center. Claim a god first, then bring all eight offerings listed below and use the center sea lantern. Wear your Crown in the helmet slot and use its Seal of Divine Authority. Only a current Crown owner wearing their own Crown at the throne can choose to forge another fully powered Crown for a claimed player. **The existing owner keeps their Crown**; eight fresh offerings, one Dragon Egg, and one recorded Ender Dragon victory are consumed. Defeat or respawn and defeat the dragon again for each additional Crown. Every Crown has its own owner and cooldowns. Crown ownership transfers on a PvP kill.
- Roman numerals in the guide are Minecraft effect levels: **I** is level 1, **II** is level 2, and so on. A **cooldown** is the wait before an ability can be used again.

### Test Hephaestus quickly in Creative mode

To test **any god or the Crown**, search the Creative Items tab for **Olympus Creative Test Kit**, or run `/function olympus/creative_kit`. Use the kit to switch your god role or receive all eight Crown offerings, one Dragon Egg, and one test victory credit. Bring the items to the Hall throne to test a claim or duplication. The kit works only while you are in Creative. This is intended for a backed-up test world because god claims and Crown records persist.

Open the Creative inventory and search **`Hephaestus Creative Test Kit`** in the Items tab. Put it in your hotbar and use it in the air. The kit works only while you are in Creative. If Hephaestus is unclaimed and you have no god yet, it claims him for you. It gives you his Forge Relic, the real Divine Fortune pickaxe, a portable Divine Forge, and all four finished custom forge items with their working powers. The kit does not change an existing god assignment or take Hephaestus from another player. If he is unavailable, the sample gear is still given, but forging and Divine Fortune require the Hephaestus role. You can also get the kit with `/give @s olympus:hephaestus_test_kit` in a cheats-enabled test world.

For a normal Survival world, claim Hephaestus at his altar and craft the portable forge using one crafting table surrounded by eight iron ingots. The costly combination recipes and each item’s controls are listed below and in the Forge Guide opened by his relic.

## Updating an existing Olympus world

Back up the world, close it, import the new `.mcaddon`, then edit that world's Behavior Packs and Resource Packs. Deactivate older Olympus versions and activate version 2.7.3 of both packs. Rejoin and check `/function olympus/status`. Existing god assignments, Crown ownership, cooldowns, Glory, and previously forged items are stored in the world. If the Hall was placed by an earlier pack, stand in the loaded Hall and run `/function olympus/setup` again to add the lower chamber. It leaves the existing upper Hall in place and opens a scaffolding entrance in its floor.

## World setup and Crown details

The Hall and its lower chamber block player mining and building and filter explosion block damage. A Crown transfers to the player who kills its owner, even if the owner took it off. A crowned non-Zeus god suppresses their own god penalties and gets half cooldowns on existing active abilities. Zeus gets time/weather control and Dominion, with no god-specific cooldown or weakness benefits. Each Crown has its own five-minute Divine Authority cooldown for day/night or weather, and its own five-minute Dominion cooldown. Crown weather lasts two minutes, then restores the previous weather type. Crown holders are revealed approximately every five minutes; fifteen minutes of online, equipped possession outside the Hall's safe zone earns one Glory. The Crown menu includes the leaderboard.

The Crown menu also offers **Dimensional Dominion**: 30 seconds of temporary Underworld or Overworld terrain within a 12-block radius. It searches a seven-block vertical band around the player and changes at most 120 eligible blocks, prioritizing water or lava over soil. Underworld Dominion grants Hades his realm buffs inside its zone. The pack records original block states before changing them and restores them on expiry, transfer, unequip, disconnect, or restart. Stand within three blocks vertically of water or lava to convert it. Natural fluid flow or mixing can alter neighboring blocks; the restoration record only tracks blocks the power directly changed. If a chunk is unloaded, restoration waits until it loads.

### Eight offerings for each Crown

| God domain | Required item | How to find it |
| --- | --- | --- |
| Hermes: travel | Ender Pearl | Hermes generates a Divine Ender Pearl with his relic every five minutes. |
| Zeus: lightning hunt | Creeper Head | Zeus can call lightning to charge a creeper; arrange for the charged creeper to kill another creeper. |
| Poseidon: underwater combat | Prismarine Crystals | Fight guardians underwater, where Poseidon's powers are strongest. |
| Hades: Nether | Blaze Rod | Blazes in a Nether fortress |
| Ares: PvP | War Trophy | Kill another player; the killer receives the custom trophy |
| Apollo: daylight raids | Ominous Bottle | Defeat an outpost raid captain; Apollo's sunlit flight, bow, and Oracle help hunt from range. |
| Hephaestus: mining | Netherite Ingot | Mine ancient debris faster with Haste IV, then combine scraps with gold. |
| Dionysus: harvest | Poisonous Potato | Grow and harvest potatoes repeatedly; his replenished Bone Meal speeds the search for this rare crop drop. |

The first Crown consumes one of every offering. Each extra Crown requires its current owner to wear it at the throne and select the recipient; that Crown stays with the owner. The forge consumes those eight items **and one Dragon Egg**. The pack records one victory each time the Ender Dragon is killed in the End and awards an egg to the killer or another player there. One victory funds one duplicate Crown; extra vanilla eggs alone cannot fund another. Respawn the dragon with End Crystals and defeat it again for each further Crown. Victories earned before installing version 2.7.1 are not recorded, so an existing world needs a new dragon kill for its next duplicate. The recipient must be online, have a god, and not already own a Crown. Kratos is the forbidden ninth god; the trial still represents the original eight domains.

Operator tools: `/function olympus/crown_setup`, `/function olympus/crown_status`, `/function olympus/crown_reset`, `/function olympus/crown_recover`, `/function olympus/crown_glory`, and `/function olympus/crown_help`. Reset preserves Glory. `/function olympus/setup` prepares the Hall, all nine altars, the Crown throne, and forge. The older mountain uses a separate command because it replaces a large area at the operator's chosen location.

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
| Kratos, downstairs | 1 Iron Sword |

Claimed relics stay in their owners' inventory on death. Poseidon's Tidecaller, Apollo's Solar Bow, and Hephaestus's Divine Fortune pickaxe also stay on death and automatically repair while in their owner's inventory. Existing copies receive this protection when their owner has the new pack active.

The older Mount Olympus mountain remains available with `/function olympus/summon_mountain`. Its summit altar shows god information, while claiming now takes place at the Hall of Eight Gods. The mountain generator replaces blocks; back up the world before using it.

`/function olympus/give_all` is an operator relic kit. Unclaimed players cannot use it to skip the altar offering. **To let a new friend choose a claimed god while the current owner keeps it**, an operator runs `/scriptevent olympus:open_god zeus` (replace `zeus` with any god). This leaves the current player and their powers intact and opens that altar to additional claims. **To vacate a god entirely** when its player has left, run `/scriptevent olympus:release_god zeus`; previous owners lose that god, including when they return later. These commands require operator permission. An online player can also release their own role with `/function olympus/reset`.

## Gods

Choose by playstyle: **Hermes** travels fastest; **Zeus** controls storms and the air; **Poseidon** rules water and rain; **Hades** thrives at night and in other dimensions; **Ares** wins direct fights; **Apollo** uses sunlight, archery, and short-lived target tracking; **Hephaestus** makes powerful tradeable gear; **Dionysus** gains random combat buffs at the cost of confusion and risky teleports; **Kratos** steals brief powers and burdens from other gods. Read the altar before claiming, since each god also has a weakness.

| God | Passive buffs | Passive debuff | Ability or equipment |
| --- | --- | --- | --- |
| Hermes | Speed VI normally; Speed XIV plus scripted sprint momentum; fall protection; optional Jump Boost II | Weakness III | Use relic for a Divine Ender Pearl every **5 min**. Sneak-use opens the Slow Falling and Divine Leap toggles. |
| Zeus | Unrestricted flight in rain or thunder | Mining Fatigue II always | Aim at a block or enemy and use relic for lightning. Thunder lightning has a **5 sec** interval; clear weather retains its **3 min** cooldown. Sneak-use for **30 sec** of flight, unrestricted in rain or thunder. |
| Poseidon | Strength II while submerged, Strength I in exposed rain, plus Conduit Power and Dolphin's Grace III in water or open rain; scripted movement and rain fall protection | Slowness III and Weakness III in Nether or desert | Sneak-use toggles Tidal Sprint; Tidecaller retains Riptide III and its boosted launch. |
| Hades | Fire Resistance and Night Vision always; Strength I/Haste I at Overworld night; Strength IV/Haste IV in Nether or End | Slowness III and Weakness III only in direct Overworld daylight | Covered caves and buildings protect him from daylight debuffs. Use the relic while standing in fire or lava to launch a visible, ghast-style Hellfire fireball (15 sec cooldown). |
| Ares | Strength II and Resistance II | Slowness III | Strength V and Resistance III rage for **30 sec** on a **5 min** cooldown. |
| Apollo | Solar Bow with Power V, Infinity I, Unbreaking III, plus **6 scripted arrow damage in direct sunlight** or 2 out of sunlight | Weakness III and Mining Fatigue II without direct sunlight | Relic menu: daylight flight for **30 sec** (3 min cooldown), arm one Solar Flare arrow (45 sec cooldown after impact), or use Oracle’s Sight (40-block radius, 8 sec reveal, 2 min cooldown). |
| Hephaestus | Haste IV, Efficiency V and Divine Fortune IV pickaxe | Permanent Weakness III | The pickaxe has a **35% chance** for one bonus ore drop. Only Hephaestus can create four visually distinct tools and gear pieces at the Hall or a portable Divine Forge; anyone can use the results. |
| Dionysus | Each melee hit on a new target adds a random self buff. Strength, Speed, and Haste can reach IV for 180 sec; Resistance caps at III for 180 sec and Regeneration at II for 60 sec. Successfully used Bone Meal replenishes one-for-one. | Madness rises to 10 stacks: longer, stronger Nausea, random teleportation, and an increasing chance of Blindness | The same hit gives that target a debuff for 180 sec and teleports Dionysus 8–16 blocks when a raycast finds a clear, safe landing; otherwise he gets a brief explanation. **Different targets trigger instantly; the same target has a 3 sec cooldown.** Debuffs can coexist and strengthen up to level IV. Repeated hits can refresh Regeneration, but its level stays capped; external stronger effects remain intact. |
| Kratos | No automatic combat buff | Stolen burdens may apply Weakness, Slowness, Mining Fatigue, or Nausea | Melee hits on gods steal one random representative gift or burden for **8 sec**. Each god kill adds exactly one random lasting gift or burden, with no gameplay cap; he holds them together until death, including weaknesses. Repeated copies of one effect do not add their levels together. Stolen Zeus lightning can be fired with Kratos's relic, using Zeus's 5 sec thunder/3 min clear cooldown. Otherwise the relic shows status. |

**Hermes:** Speed VI is always active. Hold sprint to enter Speed XIV with additional directional momentum targeting 1.3 blocks per tick, designed to outrun a very fast horse. Left/right input now maps to the correct strafing directions; release sprint or sneak for a slower pace. A bright gold trail appears while sprinting. Slow Falling starts on. Sneak-use can switch the constant glide off; a dangerous fall automatically reactivates protection during descent.

**Divine Leap:** Sneak-use Hermes's relic and choose the Divine Leap toggle. It starts OFF, persists across death and restart, and applies Jump Boost II while enabled. Turning it off lets the short managed effect expire within roughly one second; external Jump Boost is not removed. The exact obstacle height depends on Bedrock movement and must be checked in game.

**Poseidon:** Sneak-use the relic to toggle Tidal Sprint on or off. When on, movement in water or exposed land during rain targets 1.08 blocks per tick with correct left/right steering and a blue trail. It works in shallow water as well as while swimming. Conduit Power and Dolphin's Grace III apply in water or exposed rain even with Tidal Sprint off. During rain or thunder, falling applies brief Resistance V so landings do not deal fall damage without slowing the fall. The native Riptide III trident still requires water or rain; a successful launch receives an extra forward push. Nether and desert penalties counter the mobility advantage.

**Zeus:** Lightning and flight each have a three-minute cooldown in clear weather. Thunder lightning has a separate persistent five-second interval; switching weather or transferring the Crown does not clear it. Rain retains the existing lightning behavior. Flight has no cooldown in rain or thunder, even under cover, and lasts 30 seconds per use. Zeus receives no role-specific Strength.

**Apollo:** Use the relic to choose Sunflight, arm/disarm Solar Flare, or activate Oracle’s Sight. An armed Solar Flare marks only the next arrow fired from Apollo’s divine bow. The flying arrow now leaves a bright gold beam trail. On block or entity impact it creates a large sun shaft and two glowing rings, blinds eligible targets within 3 blocks for 3 seconds, and deals up to 4 extra health points to nearby targets. The direct-hit target receives Apollo's normal scripted bow bonus instead of another Flare damage bonus. Oracle scans once within 40 blocks in the current dimension, then gives Apollo an eight-second viewer-only colored halo around each detected player/creature and a nearby directional particle ray, plus the existing HUD bearing. The particles make the reveal visual, though solid walls can occlude distant halos; the nearby ray and HUD still point toward hidden targets. Both cooldowns use the Crown's existing half-cooldown rule.

**Hades:** Use the relic while physically inside regular fire, soul fire, or lava to launch a visible fireball along the crosshair. It uses a native ghast-style projectile impact and power-one explosion: it can ignite and break terrain when mob griefing permits. Direct impact is tuned to 4 damage before the explosion, keeping it below the vanilla ghast's direct hit. It has a 15-second cooldown, or 7.5 seconds when crowned. Nether residence, netherrack, lava merely nearby, and Underworld Dominion alone do not meet the requirement. The protected Hall cannot be blasted apart.

**Hephaestus:** Use your Forge Relic to open the in-game Forge Guide. The Hall's smithing table beside your altar is ready after `/function olympus/setup`. For a portable Divine Forge, put **one crafting table in the center** of a 3×3 crafting grid and **eight iron ingots around it**. Only Hephaestus can place it on an empty block. It becomes a smithing table; tap it to open the combination menu. Breaking a portable forge drops its item for reuse. Hold a **fresh, unenchanted, undamaged** diamond base item in your selected hotbar slot, and carry the second ingredient, materials, and XP levels. Select the recipe, review its cost, then confirm. The forge consumes the two source items and creates a separate custom item. Source enchantments and durability do not transfer. Anyone can trade, drop, loot, and use the results, even when Hephaestus is offline. Existing gear forged in older versions keeps its original scripted effect.

| New custom item | Held base + second ingredient | Additional cost | Power and controls |
|---|---|---|---|
| Forgecleaver Sword-Pickaxe | Diamond pickaxe + diamond sword | 30 levels, 12 diamonds, 16 emeralds, 24 lapis, 1 netherite ingot | A real combined mining and melee tool. Adds 6 attack damage (7 total with the player's base hit). **Use** to reveal nearby ore with blue rays (6-block radius, 30-second cooldown). |
| Cinderbolt Pickaxe | Diamond pickaxe + blaze rod | 35 levels, 16 diamonds, 20 emeralds, 24 lapis, 1 netherite ingot | Mines stone and ore. **Use** to fire a visible ghast-style fireball with a power-one explosion that can ignite and break blocks (15-second cooldown). Its direct hit is tuned to 3 damage before explosion. |
| Undertow Boots | Diamond boots + Heart of the Sea | 28 levels, 12 diamonds, 16 emeralds, 24 lapis, 1 netherite ingot | Custom-looking boots grant Dolphin’s Grace I in water. **Sneak in water** to surge forward; release and sneak again after 25 seconds. |
| Magnetwood Axe | Diamond axe + lodestone | 32 levels, 14 diamonds, 20 emeralds, 24 lapis, 1 netherite ingot | Cuts wood. **Use** to pull up to 12 dropped item stacks within 8 blocks to you (20-second cooldown). |

All four items have separate inventory artwork drawn from the supplied *Combine Anything V2.1* add-on by **StarkerYT**. Undertow Boots also use its worn boot model. Their effects are implemented by Olympus scripts to keep them within this pack's Bedrock 1.21.90 requirements. The destructive TNT and extreme-damage items from the source add-on are not bundled.

Edit `CONFIG.combinations` and `CONFIG.forgePowers` in `behavior_pack/scripts/config.js` to adjust costs and scripted powers. Direct fireball impact damage and blast strength are defined in `behavior_pack/entities/hellfire_bolt.json` and `behavior_pack/entities/forge_firebolt.json`. The item tooltip describes the power and control when forged; the Forge Guide shows it before purchase. The Creative Hephaestus Test Kit gives the same four finished items for testing.

**Flight:** Zeus and Apollo rise while holding **jump**, descend while holding **sneak**, hover when both are released, and steer with normal movement. Apollo needs direct sunlight to activate and sustain flight.

Each god has a custom relic icon, colored particle emblem, sound, and ambient aura. Every temple altar displays the god's powers, weakness, offering, and claim status.

## Limits and approximations

- Stable Bedrock Script API 2.0.0 does not expose Creative flight to Survival players. Flight uses per-tick vertical control while players remain in Survival.
- Stable Script API 2.0.0 has no cancellable fall-damage event. Hermes uses Slow Falling, which changes descent speed; Poseidon instead receives brief Resistance V while falling in rain or thunder. That may also briefly block other damage during the fall. Test extreme falls and server lag before relying on it.
- Bedrock caps real enchantments at vanilla levels. Divine Fortune IV is Fortune III plus a scripted ore bonus. Apollo's enhanced bow damage is a scripted bonus on hit.
- New forge results are custom Bedrock items with unique artwork and scripted powers; they do not raise vanilla enchantment limits. The old vanilla-equipment combinations remain supported for worlds that already own them. A missing or incompatible behavior pack removes scripted powers.
- Hellfire and Cinderbolt use custom entities with vanilla ghast-fireball impact and explosion components. They break blocks and ignite them when the world's mob griefing rule permits. The Hall filters their explosion block damage. Oracle uses viewer-only target halos and a particle bearing ray; Bedrock Script API 2.0 does not offer a viewer-only through-wall outline, so solid walls may hide target halos. Solar Flare particles and sounds are cosmetic and do not create a world explosion.
- Rain powers use the stable weather-change event. If installed during existing rain, a weather transition may be needed before the pack recognizes it. Covered areas and dry biomes do not count as open rain.

## Operator commands

| Command | Result |
| --- | --- |
| `/function olympus/help` | Quick instructions |
| `/function olympus/setup` | Place the Hall of Eight Gods near world spawn after a safe-site scan |
| `/function olympus/status` | Script diagnostic and claimed roles |
| `/function olympus/summon_mountain` | Gives the sigil |
| `/function olympus/give_all` | Gives all nine relics as an operator kit; it does not claim gods |
| `/function olympus/creative_kit` | Gives the Creative god and Crown test menu item |
| `/function olympus/controls` | Repeats your controls |
| `/function olympus/reset` | Releases your role |
| `/function olympus/upgrade_mountain` | Raises an old short Olympus |
| `/execute as <player> run scriptevent olympus:assign hermes` | Directly assigns an online player; replace the god name |
| `/scriptevent olympus:open_god zeus` | Operator opens Zeus to new claims while existing owners keep Zeus; replace the name as needed |
| `/scriptevent olympus:release_god zeus` | Operator vacates Zeus and revokes the previous owners' roles |

For player-specific functions from a command block, use `execute as <player> at @s run function ...`. Quote game names with spaces. Upgrading a short mountain replaces blocks in the wider area; back up and clear that area first.

## Dedicated server

Stop the Bedrock Dedicated Server and back up the world. Extract the `.mcaddon` ZIP. Copy `behavior_pack` to `behavior_packs/OlympusSMP_BP` and `resource_pack` to `resource_packs/OlympusSMP_RP`. Preserve other entries and add these entries to the arrays in the world's pack files:

`world_behavior_packs.json`: `{"pack_id":"a06ad1f9-8b44-4af1-995a-95dc9c684c25","version":[2,6,0]}`

`world_resource_packs.json`: `{"pack_id":"def06a91-6e05-457a-a359-714565d4c32c","version":[2,6,0]}`

Restart, join as operator, follow **Start here: add the pack to your world** above, and have clients accept the resource pack. For a Realm, activate the pack on a local world, verify it, then upload that world with Replace World.

## Rebuild and verification

Edit `behavior_pack/scripts/config.js` for balance. Run `npm run build` to regenerate the original Bedrock structure and installable archive. Preserve pack UUIDs and increment the version in `generate_assets.py` for later updates. The reference [Roman / Greek Style Shrine Temple](https://www.planetminecraft.com/project/roman-greek-style-shrine-temple/) informed the broad Greek temple style. Its download page did not state permission to redistribute a modified schematic, so the bundled Hall is original. Offline checks parse the structure and package but cannot establish that Minecraft loaded the script; use `TESTING.md` in a test world.
