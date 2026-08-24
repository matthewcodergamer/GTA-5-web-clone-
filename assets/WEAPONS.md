# Weapon Asset Sources

Project V does not use ripped GTA V weapon models. The current weapon props are vendored as local CC0 GLB files so the game can load them directly from GitHub Pages.

## Local runtime files

- `assets/weapons/pistol.glb` — `Pistol_Full_West.glb`
- `assets/weapons/smg.glb` — `SMG_Compact_West.glb`
- `assets/weapons/shotgun.glb` — `Shotgun_Pump_West.glb`

## Source and license

These three files come from the **FPS Asset Kit** repository by `petroulacl`, which curates the Flat Guns weapon set as CC0/public-domain assets. The weapon pack is provided in web-friendly GLB as well as other formats.

Source repository:

`https://github.com/petroulacl/fps-asset-kit`

Source paths:

- `weapons/flat_guns_west/Flat Guns West/GLB/Pistol_Full_West.glb`
- `weapons/flat_guns_west/Flat Guns West/GLB/SMG_Compact_West.glb`
- `weapons/flat_guns_west/Flat Guns West/GLB/Shotgun_Pump_West.glb`

License: **CC0 / public domain**.

## Why this set

The three models are compact enough for an iPhone-oriented Three.js prototype, have clear third-person silhouettes, need no humanoid rig, and are easy to normalize and attach to Michael's right-hand socket.

The runtime loads the local copies first. If a GLB is missing or malformed, Project V still creates a lightweight procedural weapon so gunplay never becomes a blank-screen dependency.

## Rigging model

Weapons remain rigid props. Michael's skeleton owns the hand, forearm, shoulder and torso motion. A `WeaponSocket_RightHand` transform under the detected right-hand bone controls per-weapon scale, rotation and position while procedural aim and recoil are layered onto the character pose.
