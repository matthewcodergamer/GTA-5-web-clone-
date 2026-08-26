# Decoder Contract

Each decoder receives context and returns a normalized object.

```js
registry.register('ydr', {
  async decode({ source, entry, generation, wasm }) {
    // validate entry bounds
    // read exact ranges
    // decode platform-specific structure
    // return normalized MeshData / DrawableData
  }
});
```

## Decoder requirements

- bounded reads only;
- explicit generation/platform;
- no scene graph mutations;
- no hidden global archive state;
- deterministic result for the same bytes/options;
- offsets in errors;
- limits on counts/sizes before allocations;
- fixtures for every discovered variant;
- parsing separated from GPU upload.

## WASM codecs

A JavaScript decoder may delegate a transform to WASM, but ownership stays explicit: JS validates metadata and sizes, WASM performs a narrow transform, JS validates output, and normalized data continues through the normal pipeline.
