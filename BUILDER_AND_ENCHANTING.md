# Hestia and Athena — v3.5.9

## Hestia: resource-powered Hearth Builder

Use Hestia’s relic normally to open her toolbox. Hearth Renewal is a button inside, alongside Tool Vault. Choose a building material from anywhere in inventory, then take a separate tool. Selection Wand: tap two corners, then Fill or Copy. Paint Brush: paint where you aim. Clipboard: paste a copied build. Terrain Shaper: raise/lower ground. Eraser: remove a block/area. Building Trowel: floor/wall/stairs. Undo Charm: undo/redo. Normal use performs the main action; sneak-use opens a small tool-options menu. Looking down works. Tools stay personal, inventory-locked and death-protected; Put building tools away stores them privately, and Take restores the same tool. The advanced editor and in-game handbook remain available.

- Aim at blocks and mark corners A/B. Selections and edits are capped at 128 blocks; every edited block must be within 16 blocks of you.
- Copy saves a persistent blueprint. Cut returns supported ordinary materials and saves the blueprint. Paste places non-air clipboard blocks above the aimed block, consuming resources. Rotate/mirror changes the clipboard only.
- Fill paints a selected box, outline paints its outer surface, hollow paints the surface and clears the interior, and clear removes supported blocks. Sphere/cube brushes paint nearby terrain. Raise/lower sculpts a 3x3 surface patch.
- Brush radius cycles 1–3. Spheres cap at 123 blocks; cubes cap at radius 2/125 blocks. Quick foundation/wall/stair shapes remain available.
- Choose building material in the toolbox to use blocks from anywhere in inventory. Without a saved choice, the next hotbar slot supplies the material. Capture Palette reads up to four distinct materials from the next four slots, wrapping after slot 9, and alternates them by position. Palette capture grants no materials. Clear it with Use only next-slot material.
- Cost previews require confirmation. Every new block costs one item; removed ordinary blocks return to inventory. Moves/replacements net matching materials. Grass returns dirt; restoring grass needs real grass blocks. Insufficient materials or inventory space rejects the operation.
- Quick shapes and all toolbox edits share a size-scaled construction cooldown (1s for small edits, up to 20s for 128-block edits), subject to existing Crown policy. Selections, copy and clipboard/palette configuration do not spend the edit cooldown. Creative also spends resources; Adventure/Spectator cannot edit.
- Undo/redo saves 24 edits per player across disconnect/restart. It uses the same resource ledger, requires the materials being restored, rejects intervening world changes, and cannot create free copies. New edits discard redo. Spending cut materials can make undo unavailable until those materials are replaced.
- Only ordinary full building/terrain blocks are supported. Containers, ores, fluids, falling sand/gravel, machines and custom blocks are excluded. Hall/Forge/Dominion protection applies. Edits overlapping or immediately beneath players/creatures are rejected. Confirmation rechecks role, world, resources, protection and entities.

This independent builder is included in Olympus and requires no separate Marketplace addon. It uses original code and existing Olympus assets.

## Athena: Enchanting Workshop

Sneak-use the relic while looking ahead. Put ordinary target gear in the next hotbar slot and stand within two horizontal/one vertical blocks of an enchanting table. Normal-use remains Aegis; passives remain. Each direct recipe adds one level, preserving other target enchantments. All choices share a three-minute cooldown. Bound god equipment and tridents are excluded.

| Recipe | Direct cap | XP levels per upgrade | Lapis |
| --- | --- | --- | --- |
| Unbreaking | III | 6 | 3 |
| Efficiency | IV | 8 | 4 |
| Protection | III | 10 | 6 |
| Feather Falling | IV | 6 | 3 |
| Sharpness | IV | 12 | 8 |
| Power | IV | 12 | 8 |
| Respiration | III | 6 | 4 |
| Aqua Affinity | I | 6 | 4 |

For Bookbinding, put an enchanted book in the second slot after the relic. Select one enchantment. The entire source book, including unchosen enchantments, is consumed, along with 12 XP levels and 8 lapis. A higher book level transfers; equal levels combine by one up to the native cap. Weaker/capped/incompatible/conflicting or unreadable books cause no payment. No rare books are generated. Target other enchantments remain. Rejected inventory writes restore costs, source and target.

Hephaestus retains exclusive forge products, Efficiency V/Divine Fortune IV and stronger Haste. Apollo retains Power V god bows, aim assistance, scripted damage and flight; direct Athena Power stops at IV. Bookbinding can reach normal native caps only by consuming real books. Existing combat abilities, burdens, Crown policies and locks remain.

## Zeus and Poseidon

Zeus checks his active position/environment every tick. Flight begun at Y70 can reach exposed Y220+ and continue past its original timer without reactivation. Entering sky power shows unlimited-flight feedback; leaving starts one 15-second descent window and the flight cooldown. Thunder also empowers exposed Overworld flight. Other ground/dimension limits remain.

Poseidon movement, swim helper, gear upkeep, trident creation/delivery and complete Tidecaller release behavior match archived v3.4.4, including that version’s original delayed boost. Clutch is separate: dangerous descent while holding any trident, or exposed rain independently. No rain, charge or launch detection is needed for the held-trident condition; ordinary falls with a trident held deliberately qualify. Water appears near landing and expires after five seconds. Administrative disable, protected terrain, Nether exclusion and inventory locking remain.

Offline tests and archive comparisons do not confirm native Minecraft gameplay. Use the current acceptance checklist in TESTING.md.

## Athena XP and Artemis jump additions

Athena earns 2 extra raw XP per credited hostile mob kill and 1 per common livestock/fish kill, capped at 40 bonus XP in a rolling 60-second window. The cap/deduplication ledger persists across reconnects. Melee and owned projectiles count; other gods, PvP, pets/villagers and addon entities do not. No passive XP or bonus from enchanting/refunding levels. These are raw XP points, not levels.

Artemis gets one extra airborne jump at light 0-3. Release jump, then press it again in the air. Landing resets it; bright locations, fresh airborne spawns, water/climbing/gliding/flight and dimension changes cannot grant repeated jumps. Existing horizontal momentum is preserved.

Weather probes are no longer created on player coordinates: every spawn/teleport is at least 12 blocks clear of nearby players, normally 24 blocks overhead. Trident controls/locks remain unchanged from v3.5.8. Native A/B testing confirmed normal Riptide launch after changing only probe placement. Offset local-weather sampling at biome/altitude boundaries still needs engine verification.
