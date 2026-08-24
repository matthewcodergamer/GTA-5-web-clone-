# Asset Notes

## michael.fbx

User-supplied binary FBX 7.4 character.

Verified structure:

- one mesh (`char1`)
- 24 limb bones including `Hips`, legs, feet, spine, shoulders, arms, hands, neck and head
- UV layer present
- no embedded `Material`, `Texture` or `Video` FBX nodes

That means the geometry is texture-ready, but the actual texture image is not contained in this upload.

## michael_walk.fbx

User-supplied Meshy walking animation.

Verified:

- same 24-bone naming layout
- animation duration ~1.0333 seconds
- custom frame rate 60 FPS

The runtime maps tracks by normalized bone name and removes only horizontal hip/root translation.

## Hosted asset bundle

For this GitHub-hosted build the two FBX files are also mirrored as gzip + base64 text chunks in `assets/chunks/`. The runtime first tries normal `.fbx` files and falls back to those chunks when the direct binaries are not present. This is only a transport workaround; after decoding, Three.js receives the original FBX bytes.

## Future texture placement

When a legal diffuse/albedo texture is available, add it here and wire it in `src/main.js`. Do not source or redistribute ripped GTA V textures.
