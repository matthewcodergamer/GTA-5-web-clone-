# Project V — Three.js Open-World Foundation

A mobile-first third-person web game foundation built for the supplied Michael FBX rig and Meshy walking animation. The immediate target is iPhone Safari / GitHub Pages, so the project stays in Three.js rather than moving to Unity before the browser gameplay stack is proven.

This is an original technical prototype inspired by the *feel and systems* of modern open-world third-person games. It does not redistribute Rockstar code, maps, weapon assets, or ripped GTA V textures.

## Current playable foundation

- Three.js r185.1 browser runtime.
- FBX character loading with automatic height normalization and ground placement.
- Bone-name bridge for the supplied Meshy 60 FPS walking FBX.
- Horizontal root-motion cleanup so the controller owns world movement.
- Procedural idle, jump takeoff, airborne pose and landing.
- Walk / run speed states with smooth action crossfades.
- Touch joystick, run, jump, aim and fire controls.
- Keyboard controls: `WASD`, `Shift`, `Space`, `Q` aim, `F` fire, `R` reload.
- Smooth third-person orbit/spring camera.
- Lightweight city-block test world and collisions.
- ACES filmic tone mapping, warm sun, cool sky fill, fog and soft nearby shadows.
- iPhone-oriented DPR cap plus Balanced/Fast performance toggle.
- Character mesh, bone, UV, texture and animation diagnostics.
- Skeleton inspection with **no invalid `SkeletonHelper.update()` call**.

## Gunplay foundation

The game now has a reusable weapon socket on Michael's detected right-hand bone.

Current weapon states:

- pistol
- SMG
- sawed-off shotgun
- aim toggle and crosshair
- ammo and reserve HUD
- fire-rate limits per weapon
- reload state
- camera recoil
- weapon recoil
- muzzle flash light
- raycast bullet impacts
- touch vibration when supported
- procedural fallback gun if a remote model cannot load

The live weapon models are lightweight CC0 Quaternius assets. See [`docs/ASSET_SOURCES.md`](./docs/ASSET_SOURCES.md) for source and license details.

## Euphoria-style direction

The goal is not to fake Euphoria by playing one giant canned animation. Project V separates **intent animation** from **runtime physical response**.

Current experiment:

`authored locomotion -> directional torso impulse -> balance offset -> recovery`

Planned progression:

`hit direction + hit strength + current velocity -> spine/shoulder response -> balance loss -> recovery step / partial ragdoll -> blend back to locomotion`

The diagnostics sheet includes a **Balance impulse** test so this runtime layer can be tuned independently from the animation clips.

## Supplied FBX files

Expected hosted paths:

- `assets/michael.fbx`
- `assets/michael_walk.fbx`

The supplied character was inspected as a binary FBX 7.4 file with a skinned humanoid rig, UV coordinates and roughly 27.8k triangles. The supplied walk uses the same named rig and is roughly one second at 60 FPS.

### Texture status

The supplied character FBX has UV coordinates but does **not** contain an embedded albedo/diffuse image. The runtime preserves the usable FBX material information and reports this in diagnostics. A legally obtained character texture can be added later without changing the controller, skeleton mapping or weapon system.

### If the binary FBX is not yet in GitHub

The connected GitHub text-write interface cannot directly place this chat's local binary attachment into the repository. To keep the build usable instead of failing with a blank screen, Project V now has an in-app fallback:

1. Open the game.
2. Open **Diagnostics** when prompted.
3. Choose **Import Michael FBX** and select the supplied character file.
4. The browser caches the binary privately in IndexedDB on that device.
5. Optionally import the Meshy walking FBX the same way.

If the files are later uploaded to the two expected `assets/` paths, the runtime automatically prefers the hosted copies and no import step is needed.

Verified SHA-256 values are stored in [`assets/checksums.txt`](./assets/checksums.txt).

## Mobile controls

- Left stick — move
- Run — hold for faster locomotion
- Jump — jump
- Aim — toggle aiming / crosshair
- Fire — shoot current weapon
- Tap ammo HUD — reload
- Drag the right side of the world — orbit camera
- Project V badge / `…` — diagnostics and weapon cycling

## Rendering strategy

A browser on an iPhone should not reproduce GTA V's full PC/console frame graph. The high-value order for this project is:

1. correct materials and textures
2. strong sun/sky lighting
3. nearby shadows
4. fog and atmosphere
5. stable character animation
6. aggressive LOD and streaming
7. carefully profiled post-processing only when the frame budget allows it

Research notes are in [`docs/RESEARCH.md`](./docs/RESEARCH.md).

## Architecture

```text
Player input
  -> movement controller
  -> locomotion AnimationMixer
  -> procedural upper-body aim/recoil layer
  -> weapon socket / raycast gunplay
  -> physical balance-response layer
  -> camera response
  -> renderer
```

This lets future Meshy clips replace procedural animation pieces without rewriting movement, shooting, physics or the UI.

## Next build phase

1. Put the supplied binary FBX files at the expected GitHub asset paths, or continue using the new IndexedDB importer while developing.
2. Calibrate the right-hand socket against the real Michael mesh and each gun.
3. Import the remaining Meshy pistol/reload/combat clips and layer them over locomotion.
4. Add a capsule controller with slopes, stairs and step-up handling.
5. Add NPC navigation and civilian state machines.
6. Add per-limb hit impulses, stumble selection and partial ragdoll recovery.
7. Convert final shipping character/animation assets to GLB and compressed textures after the animation library stabilizes.
