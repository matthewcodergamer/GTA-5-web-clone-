# Project V Roadmap

Every milestone needs a fixture/test and a visible result before the next layer becomes the priority.

## M0 — Runtime scaffold — DONE

Acceptance:
- random-access byte sources;
- HTTP Range source;
- VFS mount table;
- endian-aware cursor;
- RPF magic probe;
- normalized resource contracts;
- spatial streaming scaffold;
- Three.js/WebGPU/WASM boundaries;
- CI tests.

## M1 — Xbox 360 RPF index

Acceptance:
- open a user-supplied Xbox 360 GTA V RPF;
- parse/validate archive header;
- enumerate directory tree and file records;
- report offset, stored size, unpacked size, flags/resource metadata;
- zero full-archive extraction required;
- malformed offsets cannot escape archive bounds;
- test fixtures are tiny metadata/header samples, not redistributed game assets.

## M2 — R2 range-backed archive

Acceptance:
- same RPF index code works with local `File` and remote HTTP Range sources;
- Worker returns `206 Partial Content` and exposes total size;
- no Cloudflare credential is shipped to the browser;
- archive index can be cached independently from raw archive bytes.

## M3 — First texture

Acceptance:
- identify one Xbox 360 texture resource;
- decode metadata and mip layout;
- unswizzle/translate one supported format;
- show the real texture in Texture Viewer;
- compare dimensions/format/checksum against an independent reference tool where possible.

## M4 — First drawable

Acceptance:
- decode one drawable/mesh;
- produce normalized vertex/index/material data;
- show it in Model Viewer;
- attach decoded texture correctly.

## M5 — World placement

Acceptance:
- decode archetype/map placement data;
- place at least 100 real world entities;
- support basic LOD metadata;
- camera can move through the sector.

## M6 — Streaming world

Acceptance:
- world database split into cells;
- load radius and unload hysteresis work;
- memory/GPU resources are released;
- cell diagnostics show requested/loaded/evicted state.

## M7 — Collision and player

Acceptance:
- decode one collision/bounds path;
- walkable static geometry;
- real extracted player/ped skeleton replaces temporary prototype character;
- gameplay controller consumes asset-runtime entities.

## M8 — Vehicles

Acceptance:
- vehicle drawable/fragment path;
- collision and wheel attachment metadata;
- handling data mapping;
- one drivable vehicle.

## M9 — Animation and physical reactions

Acceptance:
- runtime animation graph;
- partial ragdoll/joint motors;
- hit impulses, balance and recovery stepping;
- animation/physics blending remains modular and can be disabled on low-end devices.

## M10 — Renderer migration

Acceptance:
- profile before rewriting;
- define GPU-shaped intermediate assets;
- move proven hot paths to custom WebGPU;
- keep Three.js backend as a correctness/reference implementation until parity tests pass.
