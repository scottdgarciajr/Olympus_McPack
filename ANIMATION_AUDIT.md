# Native animation compatibility — v3.4.5

Olympus leaves vanilla player, mob, weapon and item definitions to Minecraft.
It ships no replacement vanilla animation/controller definitions, copied player
definitions, or recreated animation set. Minecraft supplies spear hold/jab/charge,
trident, bow, shield, swimming, crawling, riding and native mob animations.
Hermes movement and damage are unchanged.

Oracle uses a private gold particle compass, colored ground directions/trails,
target/chest particles and bearing/distance feedback. Model-shaped ESP outlines
are removed so Oracle needs no vanilla entity overrides. Custom Olympus wearable
appearances still use native armor rendering; custom projectiles and carts remain
addon entities rather than vanilla replacements. Old Oracle chest markers
despawn on upgrade, and new visions do not spawn marker entities.

The withdrawn animation-overhaul approach is not bundled. Copied vanilla
definitions, generated outline meshes/controllers and their generators are
removed. `python validate_native_rendering.py`, `npm test` and `npm run build`
reject vanilla entity/item or animation/controller overrides, preventing this
addon from reintroducing missing native animation bindings.

Visual Minecraft checks remain necessary, especially with other packs active.
Replace both server packs and refresh downloaded client resources. Test spear
hold/jab/charge as Hermes and another player while walking/sprinting/stepping,
then trident, bows, shields, swimming, crawling, riding, custom wearables and
Oracle particles in normal graphics and Vibrant Visuals.
