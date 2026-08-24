# Project V Asset Notes

## Michael runtime FBX

`assets/michael.fbx` and `assets/michael_walk.fbx` are now hosted directly in this repository, so the GitHub Pages build does not depend on a one-time iPhone file picker to start.

For the current runtime both paths point to the supplied Meshy 60 FPS walking export. That export contains the complete skinned Michael mesh as well as the animation data, so it can serve as both the renderable character and the source walking clip.

Verified from the supplied FBX data:

- binary FBX 7.4
- one skinned character mesh
- 24 limb bones including hips, legs, feet, spine, shoulders, arms, hands, neck and head
- UV layer present
- walking animation data present
- no embedded diffuse/albedo texture image

The separate user-supplied character-only FBX remains a valid source asset, but it is not required for this first hosted gameplay build because the walking export already includes the same usable mesh/rig structure.

## Texture status

The character is UV-mapped, but the uploaded Meshy FBX does not contain the actual diffuse/albedo texture image. The game therefore preserves usable material information and otherwise renders a neutral surface until a legal character texture is supplied.

Do not copy or redistribute ripped Rockstar/GTA V textures.

## Weapons

The runtime now vendors three CC0 GLB props under `assets/weapons/`:

- `pistol.glb`
- `smg.glb`
- `shotgun.glb`

They are downloaded by the repository's `sync-cc0-weapons.yml` workflow from the CC0 FPS Asset Kit and are loaded locally before any network fallback is attempted.

See `WEAPONS.md` for provenance and license notes.
