# Asset Notes

## `michael.fbx`

User-supplied binary FBX 7.4 character.

Verified structure:

- one skinned mesh (`char1`)
- 24 limb bones including hips, legs, feet, spine, shoulders, arms, hands, neck and head
- UV layer present
- no embedded `Material`, `Texture` or `Video` FBX nodes

The geometry is texture-ready, but the actual texture image is not contained in this upload.

## `michael_walk.fbx`

User-supplied Meshy walking animation.

Verified:

- same 24-bone naming layout
- animation duration ~1.0333 seconds
- custom frame rate 60 FPS

The runtime maps tracks by normalized bone name and removes only horizontal hip/root travel so the character controller owns world movement.

## Local source package vs GitHub host

The complete source package contains both normal FBX binaries. The connected GitHub text-write interface used during development cannot directly attach local binary FBX bytes, so a GitHub-hosted copy may initially lack those files. When that happens the runtime starts a safe preview rig and exposes an in-browser FBX picker under Diagnostics.

The old base64-chunk transport experiment is not required for the current GitHub build and should not be treated as the normal shipping path.

## Texture placement

When a legal diffuse/albedo texture is available, place it in this asset folder and wire it to Michael's material in `src/main.js` or the v2 runtime. Do not source or redistribute ripped GTA V textures.

## Weapons

See `WEAPONS.md`. Weapon source assets are CC0 candidates; built-in procedural meshes remain available as an offline/CORS-safe fallback.
