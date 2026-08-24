# Project V — Asset Sources

This project does not bundle ripped Grand Theft Auto V weapon models, textures, maps, or Rockstar code. Weapon props are loaded from legal CC0/public-domain sources and attached to Michael's right-hand bone at runtime.

## Runtime weapon props

### Pistol

- Creator: Quaternius
- Source: https://poly.pizza/m/J3i9KDQ3kt
- License: CC0 / Public Domain
- Formats listed by source: FBX / GLTF
- Runtime GLB: https://static.poly.pizza/f5a88c73-af97-49ca-8650-4bde579d2f80.glb

### Submachine gun

- Creator: Quaternius
- Source pack: https://poly.pizza/bundle/Ultimate-Guns-Pack-cpgUfI4t2F
- License: CC0 / Public Domain
- Runtime GLB: https://static.poly.pizza/100fd5db-d5e8-4db7-8ad3-9a96cc217e56.glb

### Sawed-off shotgun

- Creator: Quaternius
- Source: https://poly.pizza/m/29FXKu7G91
- License: CC0 / Public Domain
- Runtime GLB: https://static.poly.pizza/9a6ee0ee-068b-4774-8b0f-679c3cef0b6e.glb

## Why these models were chosen

They are lightweight enough for an iPhone-oriented Three.js prototype, legally reusable, and available as browser-friendly glTF/GLB assets. The runtime also creates a small procedural fallback gun if a remote GLB cannot load, so a CDN/CORS failure does not break gameplay.

The guns are rigid props, so they do not need a humanoid skeleton. Project V creates a `WeaponSocket_RightHand` group under Michael's detected right-hand bone, normalizes each model to a gameplay scale, and applies per-weapon mount position/rotation. Character hands, shoulders, aim, recoil and later reload motions are driven by Michael's skeleton.

## Character asset status

The supplied Michael FBX and Meshy walking FBX are user-provided project assets. The checked character FBX contains a skinned mesh and UV coordinates but does not contain the actual embedded texture image. Project V therefore preserves the material data it can read and reports the missing image honestly rather than fabricating a GTA texture.

When `assets/michael.fbx` is not yet present on GitHub, the web build offers an in-app FBX importer. The selected file is stored locally in IndexedDB on that device and parsed with Three.js `FBXLoader`. The same fallback is available for the walking FBX.

## Motion / physics direction

Project V uses authored/generated animation for intent and runtime variation for physical response. The current test layer includes directional torso balance response, recoil, camera impulse and recovery. Future phases can add foot placement, capsule-to-ragdoll transitions, per-limb hit impulses and partial ragdoll blending instead of trying to reproduce Euphoria with one canned clip.
