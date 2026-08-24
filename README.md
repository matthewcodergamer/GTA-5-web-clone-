# Project V — Three.js Open-World Prototype

A mobile-first third-person action-game foundation built around the supplied Michael FBX rig and Meshy animation data. The current milestone is a **playable character + gunplay prototype**: movement, jumping, aiming, shooting, weapon switching, hit/balance reactions, a third-person camera and a lightweight open-world test block.

## What is working now

- Three.js r185.1 with `FBXLoader` and `GLTFLoader`.
- Michael loads directly from the repository at `assets/michael.fbx`.
- The supplied 60 FPS walk is hosted at `assets/michael_walk.fbx` and remapped by normalized bone name.
- The walking export contains the complete skinned mesh/rig, so it is also used as the current hosted Michael runtime file.
- Horizontal root motion is removed so the character controller owns world translation.
- Procedural idle, jump takeoff, airborne and landing animation layers.
- Smooth third-person camera with touch orbit.
- iPhone joystick, run, jump, aim, fire, reload and weapon controls.
- Local CC0 pistol, SMG and shotgun GLB models under `assets/weapons/`.
- Right-hand weapon socket with per-weapon scale/orientation calibration.
- Upper-body aim layering while locomotion continues underneath.
- Recoil, camera kick, muzzle flash, raycast hits, ammo and reload state.
- Directional balance/hit reactions as the first Euphoria-inspired runtime layer.
- ACES filmic tone mapping, warm sunlight, hemisphere fill, fog and mobile-conscious shadow quality.
- A polished mobile HUD/diagnostics sheet instead of a developer-console-first interface.
- Safe procedural weapon fallbacks if a model ever fails to load.

## Browser bug fixes

The direct runtime intentionally avoids the two failures seen during early testing:

- no `SkeletonHelper.update()` call — Three.js `SkeletonHelper` follows the hierarchy through the normal scene graph;
- no temporal-dead-zone startup call — the animation-frame timing variables are initialized before `requestAnimationFrame(frame)` starts.

The current HTML also uses a new cache-busted runtime URL (`main.js?v=6`) and no-cache metadata so iPhone Safari is less likely to keep serving the broken bootstrap build.

## Michael asset status

The supplied FBX data has:

- a skinned character mesh;
- 24 named limb bones;
- UV coordinates;
- animation curves;
- a ~1.03 second 60 FPS walking cycle.

The FBX does **not** contain the actual diffuse/albedo texture image. Project V therefore preserves usable material data and otherwise renders a neutral surface until a legal texture is supplied. Do not redistribute ripped Rockstar/GTA V textures.

## Weapon assets

The game now vendors three CC0 GLBs locally:

- `assets/weapons/pistol.glb`
- `assets/weapons/smg.glb`
- `assets/weapons/shotgun.glb`

They come from the CC0/public-domain Flat Guns set distributed through the FPS Asset Kit. The repository workflow `sync-cc0-weapons.yml` can refresh those files from their audited source. See `assets/WEAPONS.md` for exact paths and provenance.

## Touch controls

- Left joystick — move
- Run — hold to run
- Jump — jump
- Aim — toggle shoulder aim
- Fire — shoot
- Reload — reload current weapon
- Weapon button — cycle pistol / SMG / shotgun
- Drag the world — orbit camera
- Project V / menu button — diagnostics

## Desktop controls

- `WASD` / arrows — move
- `Shift` — run
- `Space` — jump
- `Q` — aim toggle
- `F` — fire
- `R` — reload
- Pointer drag — orbit camera

## Animation / physics direction

Project V does not attempt to reproduce NaturalMotion Euphoria itself. The useful design principle is to combine authored animation with runtime physical variation:

`intent animation + impact direction + impact strength + balance loss + recovery + optional ragdoll`

That lets the same base hit animation react differently depending on where the force arrives, rather than replaying an identical canned reaction every time.

## Rendering direction

The browser renderer uses the high-value pieces that suit an iPhone web target: ACES tone mapping, one strong sun, sky/ground fill, conservative device pixel ratio, nearby shadows and fog. Expensive effects such as SSR/SSAO/bloom should be added only after profiling.

## Next milestones

1. Add a legal Michael-compatible albedo/normal texture set.
2. Import the remaining Meshy firearm/reload/combat clips and blend them with the procedural upper-body system.
3. Replace box collision with a capsule controller supporting slopes and stairs.
4. Add NPC navigation, panic/surrender states and combat reactions.
5. Add partial-ragdoll / foot-placement experiments behind a performance toggle.
6. Convert the final shipping character/animation set to compressed GLB for faster mobile loading.
