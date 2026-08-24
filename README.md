# Project V — Three.js Open-World Prototype

A mobile-first third-person action-game foundation built around the supplied Michael FBX rig and Meshy 60 FPS walking animation. The current milestone is a **playable character + gunplay prototype**, not a finished GTA V recreation.

## Current milestone

The browser runtime now includes:

- Three.js r185.1 with FBX + glTF loaders.
- Michael FBX loading, scale normalization, ground placement and bone discovery.
- Direct mapping of the supplied 60 FPS walking clip by normalized bone name.
- Horizontal root-motion cleanup so the controller owns world translation.
- Procedural idle, jump takeoff, airborne and landing clips that use Michael's own rig.
- Smooth third-person camera, touch orbit, mobile joystick, run and jump controls.
- Pistol, compact SMG and sawed-off weapon slots.
- Right-hand weapon socket with per-weapon calibration.
- Upper-body aim layering while locomotion continues underneath.
- Procedural recoil, camera kick, muzzle flash, tracers, raycast hits, ammo and reload state.
- Simple impact-direction / balance-recovery experiments as the first Euphoria-like layer.
- ACES filmic tone mapping, warm directional sunlight, hemisphere fill, fog, soft shadows and an optimized city-block test scene.
- A polished mobile HUD and diagnostics sheet instead of a developer-console-first interface.
- Safe fallback character and procedural weapon meshes so missing CDN/binary assets do not blank the game.
- Runtime guards that avoid the old `SkeletonHelper.update is not a function` failure. `SkeletonHelper` is left to update through the normal Three.js scene graph.

## Supplied Michael assets

The complete source package contains:

- `assets/michael.fbx`
- `assets/michael_walk.fbx`

Verified from the supplied files:

- binary FBX 7.4 character
- one skinned mesh (`char1`)
- 24 named limb bones
- UV coordinates
- roughly 15,275 source vertices / 27,854 triangles
- no embedded material, texture or video image nodes
- walk clip duration ~1.0333 seconds at 60 FPS
- walking FBX uses the same bone naming layout as the character

### Texture limitation

The character is UV-mapped, but the supplied character FBX does **not** contain the actual diffuse/albedo texture image. The game therefore preserves any materials it finds and otherwise uses a neutral fallback surface. Add a legally obtained texture later; do not redistribute ripped Rockstar textures.

## Binary hosting and import fallback

The connected GitHub write interface used for this build can update repository text but cannot directly attach the two local FBX binary files. The web runtime therefore works in two ways:

1. If `assets/michael.fbx` and `assets/michael_walk.fbx` are present on the host, they load automatically.
2. If they are not present, a safe preview rig appears and **Diagnostics → Import your FBX files** lets you select the supplied character and animation directly from Files on the device.

The downloadable complete package contains the original FBX files.

## Weapon selection

The weapon system is intentionally independent of ripped GTA assets. The three current visual targets are lightweight CC0 models from Quaternius / Poly Pizza:

- Pistol — Quaternius, CC0, FBX/GLTF
- Submachine Gun — Quaternius, CC0, FBX/GLTF
- Sawed-Off Shotgun — from the Quaternius Ultimate Guns Pack, CC0, FBX/GLB

The game has an immediate built-in procedural model for each weapon. It may also try an external GLB candidate at runtime; if that request fails because of CDN/CORS/network changes, gameplay continues with the local fallback. See `assets/WEAPONS.md` for the verified source pages and licensing.

## Controls

### iPhone / touch

- Left joystick — move
- Run — hold to run
- Jump — jump
- Aim — toggle shoulder aim
- Fire — shoot
- Reload — reload current weapon
- Weapon — cycle pistol / compact SMG / sawed-off
- Drag the open world — orbit camera
- Tap the Project V status / menu button — diagnostics

### Desktop

- `WASD` / arrows — move
- `Shift` — run
- `Space` — jump
- `E` — aim
- `F` — fire
- `R` — reload
- `Q` — cycle weapon
- Pointer drag — orbit camera

## Gunplay architecture

The visual weapon is attached to a `RightHand` socket. Animation is layered rather than replacing the entire body:

- lower body: idle / walk / run / jump
- upper body: weapon aim pose
- action: recoil / reload state
- camera: shoulder offset + recoil kick
- gameplay: raycast, hit point, ammo, rate of fire
- FX: muzzle flash and tracer

This makes it possible to run while aiming and to add generated Meshy firearm clips later without rewriting movement.

## Euphoria-like direction

The project does **not** try to clone NaturalMotion Euphoria. The design borrows the useful principle of combining authored intent with runtime physical variation:

- impact direction changes spine/shoulder reaction
- impact strength changes balance loss
- velocity affects stumble amount
- feet attempt to recover
- extreme impacts can later transition into partial ragdoll
- animation blends back into locomotion after stabilization

The current build includes lightweight balance-hit tests; active ragdoll and foot-placement IK are later milestones.

## Rendering direction

The visual target takes conceptual cues from public analyses of GTA V's rendering pipeline while remaining realistic for an iPhone web build. The current high-value features are ACES tone mapping, one strong sun, sky/ground fill, nearby shadows, atmosphere/fog and conservative device pixel ratio. SSAO/SSR/bloom and more expensive passes should only be enabled after profiling.

See `docs/RESEARCH.md` for sources and technical notes.

## Next milestones

1. Put the supplied FBX binaries on the hosted `assets/` path or convert the final character to GLB.
2. Add the missing legal Michael-compatible albedo/normal textures.
3. Calibrate hand sockets against the final weapon models.
4. Add Meshy pistol reload/draw/fire clips as optional animation layers.
5. Replace box collision with a capsule controller supporting slopes/stairs.
6. Add NPC locomotion/navigation and combat reactions.
7. Add active-ragdoll / IK experiments behind a performance toggle.
8. Convert shipping assets to GLB + compressed textures for iPhone memory/bandwidth.
