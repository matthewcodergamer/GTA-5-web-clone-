# Weapon Asset Sources

Project V does not ship ripped GTA V weapon models. The current weapon interface is designed around small, legal glTF/GLB/FBX assets and has a procedural fallback for every slot.

## Selected prototype set

### Pistol

- Model: **Pistol**
- Author: Quaternius
- Source: https://poly.pizza/m/J3i9KDQ3kt
- Format: FBX / GLTF
- License: Public Domain (CC0)
- Poly Pizza reports 968 triangles.

Why selected: small enough for mobile, readable third-person silhouette, permissive license and simple socket calibration.

### Compact SMG

- Model: **Submachine Gun**
- Author: Quaternius
- Source: https://poly.pizza/m/7ehatxr7FY
- Format: FBX / GLTF
- License: Public Domain (CC0)

Why selected: same visual family as the pistol and appropriate for a lightweight automatic weapon slot.

### Sawed-Off Shotgun

- Model: **Shotgun Sawed Off** from the Ultimate Guns Pack
- Author: Quaternius
- Pack: https://poly.pizza/bundle/Ultimate-Guns-Pack-cpgUfI4t2F
- Format: FBX / GLB
- License: Public Domain (CC0)

Why selected: short third-person silhouette, distinct handling from pistol/SMG, and the pack is explicitly published for personal and commercial use under CC0.

## Runtime policy

The runtime has three calibrated slots: `pistol`, `smg`, and `shotgun`.

Each slot:

1. creates a lightweight built-in weapon immediately;
2. mounts it to Michael's right-hand socket;
3. applies procedural aim/recoil independently of the mesh;
4. may attempt a remote GLB candidate;
5. keeps the local fallback if the remote request fails.

That means a CDN outage or CORS change cannot make the game unplayable.

## Before production

Download and vendor the final CC0 GLB files into `assets/weapons/`, then replace remote URLs with local paths. Recheck model orientation/scale, optimize meshes, and compress textures before mobile shipping.
