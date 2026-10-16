# Olympus SMP

**Current version: 3.4.0.** Both pack names/descriptions and `/function olympus/status` show **v3.4.0**. This release supersedes the old ability descriptions below.

**Personal equipment is inventory-locked:** God relics, Poseidon's Tidecaller, both Apollo bows, Hephaestus's personal Divine Fortune pickaxe, and Crown equipment cannot be voluntarily given, dropped, crafted away, or stored in containers. They remain movable within the player's inventory/equipment and stay on death. Existing carried gear is locked on rejoin. A full inventory reserves new personal items persistently until space opens. Hephaestus's forged products and portable forge remain tradeable/storable, as do ordinary resources and consumables. The established Crown transfer on a PvP kill is still handled by the ownership system. Gear previously stored before this update is not automatically pulled from unloaded chests.

- **Hermes ramping (v3.3.1):** Move into a single-block ledge to step up automatically, both walking and sprinting. Passable grass is ignored; a brief sprint interruption from collision does not cancel the step. A clear, supported ledge uses an automatic hop if the direct step is rejected. Works on mountain slopes without repeated manual jumps. Requires ground contact and clear standing space; it cannot keep lifting Hermes up a vertical wall. Sneaking, swimming and gliding do not trigger it; normal Hermes walking does.
- Poseidon receives **Strength II in water and exposed rain**, **Haste I in water**, and **Haste II in rain**. Adaptive Conduit mining compensation accounts for being submerged/floating and Aqua Affinity, targeting roughly 6–24% faster mining than unbuffed land mining with the same tool. Haste stays low so trident/melee swing animations remain readable. Mining Fatigue still reduces speed. All rain/clutch fall-immunity rules are removed. Protection comes only from entering the placed water; ordinary damage rules remain active.
- **Rain Clutch (v3.4.0):** In exposed Overworld rain, a fall toward a solid floor automatically places **one ordinary water spot**, once per fall, with **no bucket required**. The source disappears after **5 seconds**. This restores the earlier simple placement: no wide cushions, containment edges, fall immunity or Slow Falling. Ordinary water can briefly flow; nearby flows drain after the source is removed. Fast sideways falls and corner/gap landings can miss the spot. Protected land, clear weather and the Nether are excluded. Cleanup persists across reloads and retries unloaded chunks. Replacement building blocks are preserved.
- **Hephaestus utilities:** Ten new creations bring the forge to **14 recipes**. The easier Lantern Helmet consumes coal for real moving light; the expensive Trackless Cart consumes coal while driving. Navigation, building, farming, salvage and surveying tools have bounded effects, material costs and cooldowns. Only Hephaestus can forge; everyone can trade, store and use the products. See [utility recipes, prices and controls](UTILITY_ITEMS.md).
- **Administrator clutch controls:** `/function olympus/poseidon_clutch_off` disables it globally; `_on` enables it; `_status` reports settings; `_reset` restores defaults. Use `/scriptevent olympus:poseidon_clutch off Player Name` (or `on`, `status`, `reset`) for one player's override. Global on/off clears individual overrides; player reset restores the global default. Settings persist across restarts.
- **Mild swim cruise (v3.3.2):** Moving in water always gets gentle horizontal assistance toward ordinary land walking speed (0.21585 blocks/tick), including when Tidal Sprint is off. It never adds thrust while idle or sneaking, does not alter vertical motion, and does not slow down faster Riptide/Tidal movement.
- **Tidecaller:** Retains the native trident and Riptide III. Creative mode intentionally prevents tridents from breaking blocks; test block-breaking and normal swing behavior in Survival.
- **Apollo's Prophetic Bow:** Receive it when claiming/rejoining Apollo or select **Get / Recover Prophetic Bow** in his relic menu. Carry one ordinary arrow, aim near a visible creature/player, and draw/release the bow normally. In light, shots visibly curve toward one target with stronger per-tick steering, a golden trail and a lock confirmation; in darkness they behave as ordinary arrows. Native arrow damage only; no Power, Flame, Solar Flare or scripted damage/status bonuses. Infinity and Unbreaking provide ammunition/durability convenience. There is no menu-fired projectile or ability cooldown.
- **Sunflight:** Normal steering is Minecraft walking speed (0.21585 blocks/tick). Sprinting uses the former fast flight speed: 1.2 blocks/tick in direct sun and 0.8 in other light. Sun gives unlimited flight; other light retains its five-second/minute limit.
- **Oracle's compass:** A **gold ring** appears on the ground around Apollo. **Cyan = players, red = mobs, green = animals, orange = chests.** Colored rays point to up to three nearby targets per kind, and matching dotted trails lead toward the nearest of each kind. Matching halos/corner sparks identify the destination. Trails show direction, including through obstacles; they are not safe-route pathfinding. Moving targets update every three ticks in world space, independent of camera pitch/FOV. Creatures/players scan within 48m (48-target cap); loaded chest scanning expands over several seconds within 24m (64-chest cap). The compass works independently of optional model-edge rendering. Oracle lasts 15 seconds and ends in darkness.
- **Private Tool Vault:** **Sneak, look straight down, and use your own god relic.** Apollo also has a vault button in his menu. Store/withdraw Tidecaller, either Apollo bow, or the personal Divine Fortune pickaxe to free inventory slots. Stored items are private persistent records, retaining enchantments, lore, durability and binding. Token-based transaction recovery prevents a repeated withdrawal from creating another copy; recovery menus recognize stored tools instead of issuing replacements. Relics and Crown equipment remain carried. Forged products remain tradeable/storable.
- **Tidal Sprint:** Strength, Haste and Conduit clear immediately when Poseidon leaves water/rain; water vision clears on leaving water. Wet conditions are checked every tick, including a weather stop. Clear weather cannot use a stale wet sensor to keep rain powers. Tidal boost momentum is reduced to normal land movement on dry exit; native Riptide momentum is retained. With the relic toggle enabled, **hold sprint** for the water/rain boost; release sprint to stop additional thrust. Hold jump to rise or leave water; jump takes priority over looking down and reduces horizontal thrust near exits.
- **Zeus:** At **Y220+ in the Overworld**, flight activation ignores its normal cooldown and lightning uses the five-second thunder interval even in clear weather. The same controls apply: sneak-use for a 30-second flight, normal use for lightning.

Oracle model edges and entity properties derive from the MIT-licensed Mojang **bedrock-samples v1.21.120.4**; source/licensing is bundled. This requires overriding vanilla entity definitions to add a default-hidden client property. Other packs that replace those entities can conflict depending on pack order. No beta API is required. **Minecraft rendering/gameplay acceptance remains pending.**

Built from GitHub main `0b1436d` (2.7.3), with the unstable local checkout preserved at `../backups/OlympusSMP-unstable-2026-10-16`. Requires Bedrock **1.21.120+**, stable Script API **2.3.0**, and both packs. Install `dist/Olympus_SMP_FINAL.mcaddon`; `/function olympus/status` must report **v3.4.0**. Existing pack UUIDs and progression are preserved. See CHANGELOG for superseded mechanics.

## Start here: add the pack to your world

1. [Open `Olympus_SMP_FINAL.mcaddon` in this repository](dist/Olympus_SMP_FINAL.mcaddon), then choose **Download raw file** to save it. Save a backup of the world you plan to use. The setup command places a large structure and can overwrite the area you choose with a placement seal.
2. Open the `.mcaddon` file with **Minecraft Bedrock** (on Windows, double-click it). Wait for Minecraft to report that the import succeeded. If your device asks which app should open the file, choose Minecraft.
3. For a **new world**, choose **Play → Create New → Create New World**. For an **existing world**, choose **Play**, then the pencil/edit button next to that world. In the world settings, open **Add-Ons → Behavior Packs → My Packs**, find **Olympus SMP Behavior**, and choose **Activate**. Check **Resource Packs → My Packs** and activate **Olympus SMP Resources** if it was not activated automatically. On a server or Realm, see the sections below.
4. Turn on **Cheats** in the world settings so setup commands work. Cheats can disable achievements for that world. Enter the world as its owner or an operator.
5. Open chat and run **`/function olympus/setup`**. This one command places the Hall, all god altars, the Crown throne, the forge, and Kratos's chamber beneath the Hall. The Hall is 33 × 15 × 33 blocks, with the lower chamber extending seven blocks underground; keep the area clear. The script searches for a safe site near world spawn. If it cannot find one, it gives you a **Hall Placement Seal**. Stand where you want the Hall centered and use the seal.
6. Run **`/function olympus/status`**. It should say `v3.1.1 script active`. If it reports an older version, leave the world, open its pack settings, deactivate the older Olympus packs, activate the newly imported packs, and rejoin.

### First steps in the Hall

- Each of the eight enchanting tables is an Olympian altar. Kratos's forbidden altar is the netherite block in the darker chamber downstairs: descend the scaffolding near the rear center of the Hall. Use an altar to read that god's powers and offering. Choose **Reserve**; the reservation lasts **10 minutes**. Bring the offering back and use the same altar again to claim. Gods are exclusive until an operator opens one to additional players.
- The relic you receive activates that god's special power. **Use** means press your normal item Use button. **Sneak-use** means crouch while using it. The god's passive abilities work without holding the relic. Run **`/function olympus/controls`** whenever you need a reminder.
- The **Crown of Olympus** is claimed at the gold and sea-lantern center. Claim a god first, then bring all eight offerings listed below and use the center sea lantern. Wear your Crown in the helmet slot and use its Seal of Divine Authority. Only a current Crown owner wearing their own Crown at the throne can choose to forge another fully powered Crown for a claimed player. **The existing owner keeps their Crown**; eight fresh offerings, one Dragon Egg, and one recorded Ender Dragon victory are consumed. Defeat or respawn and defeat the dragon again for each additional Crown. Every Crown has its own owner and cooldowns. Crown ownership transfers on a PvP kill.
- Roman numerals in the guide are Minecraft effect levels: **I** is level 1, **II** is level 2, and so on. A **cooldown** is the wait before an ability can be used again.

### Test Hephaestus quickly in Creative mode

To test **any god or the Crown**, search the Creative Items tab for **Olympus Creative Test Kit**, or run `/function olympus/creative_kit`. Use the kit to switch your god role or receive all eight Crown offerings, one Dragon Egg, and one test victory credit. Bring the items to the Hall throne to test a claim or duplication. The kit works only while you are in Creative. This is intended for a backed-up test world because god claims and Crown records persist.

Open the Creative inventory and search **`Hephaestus Creative Test Kit`** in the Items tab. Put it in your hotbar and use it in the air. The kit works only while you are in Creative. If Hephaestus is unclaimed and you have no god yet, it claims him for you. It gives you his Forge Relic, the real Divine Fortune pickaxe, a portable Divine Forge, and all fourteen finished custom forge items with their working powers. The kit does not change an existing god assignment or take Hephaestus from another player. If he is unavailable, the sample gear is still given, but forging and Divine Fortune require the Hephaestus role. You can also get the kit with `/give @s olympus:hephaestus_test_kit` in a cheats-enabled test world.

For a normal Survival world, claim Hephaestus at his altar and craft the portable forge using one crafting table surrounded by eight iron ingots. The costly combination recipes and each item’s controls are listed below and in the Forge Guide opened by his relic.

## Updating an existing Olympus world

Back up the world, close it, import the new `.mcaddon`, then edit that world's Behavior Packs and Resource Packs. Deactivate older Olympus versions and activate version 3.1.1 of both packs. Rejoin and check `/function olympus/status`. Existing god assignments, Crown ownership, cooldowns, Glory, and previously forged items are stored in the world. If the Hall was placed by an earlier pack, stand in the loaded Hall and run `/function olympus/setup` again to add the lower chamber. It leaves the existing upper Hall in place and opens a scaffolding entrance in its floor.

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
| Zeus | Storm flight and lightning in rain/thunder or at Y220+ Overworld | Mining Fatigue II | Use relic for lightning: 5s storm interval, otherwise 3min cooldown. Sneak-use for 30s flight; storm activation bypasses normal cooldown. |
| Poseidon | Strength II water/rain; Haste I water, II rain; clear water, no swimming hunger, mild swim cruise and rain clutch | Slowness III and Weakness III Nether/desert | Sneak-use toggles Tidal Sprint; hold sprint to boost and jump to rise. Rain clutch needs no bucket; one water source expires after 5s. |
| Hades | 4 bones |
| Ares | 1 stone sword |
| Apollo | Solar Bow: +10 sun / +4 other light; unlimited sunflight; normal Prophetic Bow with curving arrows | Weakness III at night/darkness; darkness stops powers; no Mining Fatigue | Relic menu: flight, Solar Flare, Oracle compass, recover Prophetic Bow, Tool Vault. Flight walking speed normally, fast when sprinting. Oracle: gold ring, colored bearings/trails, 15s. |
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
| Zeus | Storm flight and lightning in rain/thunder or at Y220+ Overworld | Mining Fatigue II | Use relic for lightning: 5s storm interval, otherwise 3min cooldown. Sneak-use for 30s flight; storm activation bypasses normal cooldown. |
| Poseidon | Strength II water/rain; Haste I water, II rain; clear water, no swimming hunger, mild swim cruise and rain clutch | Slowness III and Weakness III Nether/desert | Sneak-use toggles Tidal Sprint; hold sprint to boost and jump to rise. Rain clutch needs no bucket; one water source expires after 5s. |
| Hades | Fire Resistance and Night Vision always; Strength I/Haste I at Overworld night; Strength IV/Haste IV in Nether or End | Slowness III and Weakness III only in direct Overworld daylight | Covered caves and buildings protect him from daylight debuffs. Use the relic while standing in fire or lava to launch a visible, ghast-style Hellfire fireball (15 sec cooldown). |
| Ares | Strength II and Resistance II | Slowness III | Strength V and Resistance III rage for **30 sec** on a **5 min** cooldown. |
| Apollo | Solar Bow: +10 sun / +4 other light; unlimited sunflight; normal Prophetic Bow with curving arrows | Weakness III at night/darkness; darkness stops powers; no Mining Fatigue | Relic menu: flight, Solar Flare, Oracle compass, recover Prophetic Bow, Tool Vault. Flight walking speed normally, fast when sprinting. Oracle: gold ring, colored bearings/trails, 15s. |
| Hephaestus | Haste IV, Efficiency V and Divine Fortune IV pickaxe | Permanent Weakness III | The pickaxe has a **35% chance** for one bonus ore drop. Only Hephaestus can create fourteen tools and gear pieces at the Hall or a portable Divine Forge; anyone can use the results. |
| Dionysus | Each melee hit on a new target adds a random self buff. Strength, Speed, and Haste can reach IV for 180 sec; Resistance caps at III for 180 sec and Regeneration at I for 60 sec. Successfully used Bone Meal replenishes one-for-one. | Madness rises to 10 stacks: longer, stronger Nausea, random teleportation, and an increasing chance of Blindness | The same hit gives that target a debuff for 180 sec and teleports Dionysus 8–16 blocks when a raycast finds a clear, safe landing; otherwise he gets a brief explanation. **Different targets trigger instantly; the same target has a 3 sec cooldown.** Debuffs can coexist and strengthen up to level IV. Repeated hits can refresh Regeneration, but its level stays capped; external stronger effects remain intact. |
| Kratos | No automatic combat buff | Stolen burdens may apply Weakness, Slowness, Mining Fatigue, or Nausea | Melee hits on gods steal one random representative gift or burden for **8 sec**. Each god kill adds exactly one random lasting gift or burden, with no gameplay cap; he holds them together until death, including weaknesses. Repeated copies of one effect do not add their levels together. Stolen Zeus lightning can be fired with Kratos's relic, using Zeus's 5 sec thunder/3 min clear cooldown. Otherwise the relic shows status. |

**Hermes:** Speed VI is always active. Hold sprint to enter Speed XIV with additional directional momentum targeting 1.3 blocks per tick, designed to outrun a very fast horse. Left/right input now maps to the correct strafing directions; release sprint or sneak for a slower pace. A bright gold trail appears while sprinting. Slow Falling starts on. Sneak-use can switch the constant glide off; a dangerous fall automatically reactivates protection during descent.

**Divine Leap:** Sneak-use Hermes's relic and choose the Divine Leap toggle. It starts OFF, persists across death and restart, and applies Jump Boost II while enabled. Turning it off lets the short managed effect expire within roughly one second; external Jump Boost is not removed. The exact obstacle height depends on Bedrock movement and must be checked in game.

**Poseidon:** Sneak-use toggles Tidal Sprint; hold sprint for the boost, release sprint for normal swimming control. Jump takes priority over downward camera pitch and eases horizontal thrust at exits. Strength II works in water/rain, Haste I underwater (with adaptive mining compensation) and Haste II in rain. Mild swim cruise always helps while moving in water. Automatic rain clutch needs no bucket and places one ordinary water spot that disappears after 5 seconds, with no Slow Falling; rain alone no longer cancels falls. Riptide III remains native water/rain movement with an extra launch push. Nether/desert penalties still apply.

**Zeus:** Lightning and flight each have a three-minute cooldown in clear weather. Thunder lightning has a separate persistent five-second interval; switching weather or transferring the Crown does not clear it. Rain retains the existing lightning behavior. Flight has no cooldown in rain or thunder, even under cover, and lasts 30 seconds per use. Zeus receives no role-specific Strength.

**Apollo:** Use the relic menu for Lightflight, Solar Flare, Oracle, Prophetic Bow recovery or the Tool Vault. Draw and release the Prophetic Bow normally in light; native arrows curve toward a visible target without Solar damage/status buffs. Solar Flare applies to the Solar Bow and creates a beam/rings, three-second Blindness and 4 area damage within 3 blocks; the direct target receives the normal Solar bonus. Oracle shows a gold ground compass with cyan player, red mob, green animal and orange chest bearings/trails. Range: 48m creatures, 24m loaded chests; duration 15s. Existing Crown half-cooldowns apply; other-light flight keeps its one-minute floor.

**Hades:** Use the relic while physically inside regular fire, soul fire, or lava to launch a visible fireball along the crosshair. It uses a native ghast-style projectile impact and power-one explosion: it can ignite and break terrain when mob griefing permits. Direct impact is tuned to 4 damage before the explosion, keeping it below the vanilla ghast's direct hit. It has a 15-second cooldown, or 7.5 seconds when crowned. Nether residence, netherrack, lava merely nearby, and Underworld Dominion alone do not meet the requirement. The protected Hall cannot be blasted apart.

**Hephaestus:** Use your Forge Relic to open the in-game Forge Guide. The Hall's smithing table beside your altar is ready after `/function olympus/setup`. For a portable Divine Forge, put **one crafting table in the center** of a 3×3 crafting grid and **eight iron ingots around it**. Only Hephaestus can place it on an empty block. It becomes a smithing table; tap it to open the combination menu. Breaking a portable forge drops its item for reuse. Hold a **fresh, unenchanted, undamaged, unbound** base item (exactly one) in your selected hotbar slot, and carry the second ingredient, materials, and XP levels. Select the recipe, review its cost, then confirm. The forge consumes the two source items and creates a separate custom item. Source enchantments and durability do not transfer. Anyone can trade, drop, loot, and use the results, even when Hephaestus is offline. Existing gear forged in older versions keeps its original scripted effect.

| New custom item | Held base + second ingredient | Additional cost | Power and controls |
|---|---|---|---|
| Forgecleaver Sword-Pickaxe | Diamond pickaxe + diamond sword | 30 levels, 12 diamonds, 16 emeralds, 24 lapis, 1 netherite ingot | A real combined mining and melee tool. Adds 6 attack damage (7 total with the player's base hit). **Use** to reveal nearby ore with blue rays (6-block radius, 30-second cooldown). |
| Cinderbolt Pickaxe | Diamond pickaxe + blaze rod | 35 levels, 16 diamonds, 20 emeralds, 24 lapis, 1 netherite ingot | Mines stone and ore. **Use** to fire a visible ghast-style fireball with a power-one explosion that can ignite and break blocks (15-second cooldown). Its direct hit is tuned to 3 damage before explosion. |
| Undertow Boots | Diamond boots + Heart of the Sea | 28 levels, 12 diamonds, 16 emeralds, 24 lapis, 1 netherite ingot | Custom-looking boots grant Dolphin’s Grace I in water. **Sneak in water** to surge forward; release and sneak again after 25 seconds. |
| Magnetwood Axe | Diamond axe + lodestone | 32 levels, 14 diamonds, 20 emeralds, 24 lapis, 1 netherite ingot | Cuts wood. **Use** to pull up to 12 dropped item stacks within 8 blocks to you (20-second cooldown). |

All four items have separate inventory artwork drawn from the supplied *Combine Anything V2.1* add-on by **StarkerYT**. Undertow Boots also use its worn boot model. Their effects are implemented by Olympus scripts to keep them within this pack's Bedrock 1.21.120 requirements. The destructive TNT and extreme-damage items from the source add-on are not bundled.

Edit `CONFIG.combinations` and `CONFIG.forgePowers` in `behavior_pack/scripts/config.js` to adjust costs and scripted powers. Direct fireball impact damage and blast strength are defined in `behavior_pack/entities/hellfire_bolt.json` and `behavior_pack/entities/forge_firebolt.json`. The item tooltip describes the power and control when forged; the Forge Guide shows it before purchase. The Creative Hephaestus Test Kit gives all fourteen finished items for testing.

**Flight:** Zeus and Apollo rise while holding **jump**, descend while holding **sneak**, hover when both are released, and steer with normal movement. Apollo flies faster, indefinitely in direct sun, with five seconds per minute in other light. Darkness cancels flight immediately. Use the flight menu button again to stop.

Each god has a custom relic icon, colored particle emblem, sound, and ambient aura. Every temple altar displays the god's powers, weakness, offering, and claim status.

## Limits and approximations

- Stable Bedrock Script API 2.3.0 does not expose Creative flight to Survival players. Flight uses per-tick vertical control while players remain in Survival.
- Poseidon uses physical landing water only: no damage sensor, fall immunity, Resistance, Slow Falling or teleport safety. Protected/unloaded terrain and missing landing surfaces can still prevent water placement; water-only protection cannot guarantee every possible fall. Hermes retains Slow Falling.
- Bedrock caps real enchantments at vanilla levels. Divine Fortune IV is Fortune III plus a scripted ore bonus. Apollo's enhanced bow damage is a scripted bonus on hit.
- New forge results are custom Bedrock items with unique artwork and scripted powers; they do not raise vanilla enchantment limits. The old vanilla-equipment combinations remain supported for worlds that already own them. A missing or incompatible behavior pack removes scripted powers.
- Hellfire and Cinderbolt use native projectile impact/explosion components, respecting mob griefing and Hall protection. Oracle uses a viewer-only gold ground compass, colored trails and optional native model edges; graphics-mode acceptance remains pending. Solar Flare visuals do not create a world explosion.
- Rain powers use the stable weather-change event. A native player environment sensor also recognizes water/rain after reloading. Covered areas and dry biomes do not count as open rain.

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
