# Project V — Three.js Open-World Foundation

A mobile-first third-person game foundation built around the supplied Michael FBX rig and the supplied Meshy 60 FPS walking animation.

This is **Phase 1**, not a finished GTA V recreation. The goal is to get the character, camera, animation bridge, world movement, jumping, lighting and diagnostics solid before adding weapons, NPC AI, vehicles and active-ragdoll behavior.

## Supplied assets

The complete source package prepared with this build contains:

- `assets/michael.fbx` — supplied character FBX.
- `assets/michael_walk.fbx` — supplied Meshy walking animation FBX.

The connected GitHub write interface can create/update repository text files but cannot attach local binary FBX bytes directly. If those two `.fbx` files are not visible in the repository's `assets/` folder, copy them from the complete source package using the exact names above. The runtime also contains a safe procedural-walk fallback.

### What was verified from the supplied FBX files

The character FBX is a binary FBX 7.4 file with:

- 1 skinned mesh
- 24 named limb bones
- UV coordinates
- about 15,275 source vertices
- about 27,854 triangles
- no embedded material/texture image nodes

The walking FBX uses the same named rig and contains a ~1.033 second walk clip authored at 60 FPS.

Because the supplied character FBX contains UVs but **does not contain the actual texture image**, this build uses a neutral fallback surface. Add a legally obtained diffuse/albedo texture later without changing the controller or animation architecture.

## What works now

- Modern Three.js r185.1 import-map setup.
- FBX character loading with automatic scale and ground placement.
- Bone-name mapping from the supplied walking FBX to Michael.
- Horizontal root-motion cleanup so world movement is controlled by the game controller instead of being applied twice.
- Procedural idle with restrained breathing / micro-movement.
- Procedural jump takeoff, airborne pose and landing clips generated directly against Michael's own bones.
- Imported 60 FPS walking animation, with a procedural fallback if retargeting fails.
- Hold-to-run playback/speed state.
- Touch joystick, jump and run controls.
- Keyboard controls (`WASD`, arrows, `Shift`, `Space`).
- Smooth third-person spring camera and touch orbit.
- Small optimized city-block test environment and collision.
- ACES filmic tone mapping, sun + sky fill, fog and soft shadows.
- iPhone-oriented DPR cap and a one-tap fast mode.
- Rig/material/UV/animation diagnostics.
- Skeleton display that **does not call the invalid `SkeletonHelper.update()` method**.
- Runtime error guards so failures surface cleanly instead of flooding the UI.

## Controls

### iPhone / touch

- Left joystick: move
- Hold runner button: run
- Arrow button: jump
- Drag the world: rotate camera
- Tap the Project V badge / `…`: diagnostics

### Desktop

- `WASD` / arrow keys: move
- `Shift`: run
- `Space`: jump
- Mouse / pointer drag: camera

## Why Three.js first, not Unity

The immediate target is an iPhone-hosted web game. Three.js keeps the runtime small, gives direct control over FBX/glTF, bones, procedural animation, touch input and WebGL/WebGPU evolution, and deploys directly on GitHub Pages. Unity WebGL can be reconsidered later if a feature genuinely needs its tooling or middleware.

## Rendering direction

The visual target is inspired by the *principles* visible in GTA V's rendering pipeline, not by copying Rockstar assets or code. Technical analyses of GTA V show heavy use of HDR/deferred rendering, cascaded shadows, SSAO, reflections, fog/atmosphere, tone mapping and gradual exposure adaptation. An iPhone web build cannot reproduce that entire desktop/console pipeline cheaply, so this foundation uses the highest-value low-cost equivalents first:

1. good albedo/materials
2. one strong sun light
3. sky/ground fill
4. soft shadows near the player
5. fog to control distant detail
6. ACES tone mapping
7. aggressive LOD / draw-call control later

See `docs/RESEARCH.md` for the research notes and legal gun/animation asset candidates.

## Weapon plan

Do **not** bundle ripped GTA V weapons or textures. For the first legal prototype, use a CC0 weapon pack or your own model, then attach it to a `RightHand` weapon socket and layer upper-body aiming/recoil over locomotion.

Recommended first states:

- pistol draw
- pistol aim idle
- single-shot recoil
- reload
- armed walk/run
- rifle aim/fire

The game should keep the projectile, muzzle flash, sound, recoil impulse and hit reaction procedural, while animation supplies the character's intent and body pose.

## Euphoria-like direction

Euphoria is not simply a library of canned hit clips. The direction for this project is a hybrid system:

- authored or generated locomotion/action clips
- procedural spine/shoulder offsets
- impact-direction impulses
- balance loss
- foot recovery
- partial ragdoll
- animation-to-physics blending
- recovery back to locomotion

That is a later phase after the base character controller is stable.

## GitHub Pages

This project is static and has `index.html` at the repository root. Enable GitHub Pages from the default branch root after the two supplied FBX files are present in `assets/`.

## Next build phase

1. Add a legal textured Michael-compatible character surface or a properly textured replacement export.
2. Add weapon socket calibration and a CC0 pistol model.
3. Add upper-body aim/recoil layering while lower-body locomotion keeps running.
4. Add a proper capsule controller with slopes/stairs.
5. Add NPCs and navigation.
6. Add active hit-reaction / partial-ragdoll experiments.
7. Convert final shipping assets to GLB + compressed textures once the animation library is settled.
