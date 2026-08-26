# Asset Pipeline

## Principle: index, do not extract everything

The source archive can remain intact. Project V should build metadata that lets it request only the byte ranges needed for the current asset/world cell.

Normalized index record example:

```json
{
  "id": "archive:path/to/resource",
  "name": "example.ydr",
  "kind": "ydr",
  "archive": "source/x64-example.rpf",
  "offset": 187234829,
  "storedSize": 84231,
  "unpackedSize": 311288,
  "flags": 0,
  "generation": "five-xbox360"
}
```

The exact RPF record fields must come from verified Xbox 360 fixtures; this JSON is the runtime's normalized representation, not a claim about the raw on-disk struct.

## Pipeline stages

1. `ByteSource` opens local or Range-backed data.
2. RPF layer enumerates archive entries.
3. Indexer stores normalized metadata.
4. Resource dispatcher selects a decoder by kind/version/platform.
5. Decoder returns normalized texture/mesh/placement/collision data.
6. Optional build/cache step converts expensive source layouts into GPU-shaped cache objects.
7. Streamer requests runtime assets by cell and priority.
8. Renderer/physics upload the normalized data.

## Cache keys

Cache keys should include archive identity/hash, entry offset + stored size, decoder version, target platform/backend and conversion options.
