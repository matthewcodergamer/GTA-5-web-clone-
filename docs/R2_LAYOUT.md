# Cloudflare R2 Layout

R2 is private source storage plus generated indexes/caches. The browser should talk to an authenticated Worker, not directly to S3 credentials.

Suggested object layout:

```text
projectv/
  source/
    gta-v-xbox360/
      disc1-install.7z
      archives/
  indexes/
    gta-v-xbox360/
      archive-manifest.json
      world-cells.json
  cache/
    decoder-v1/
      textures/
      meshes/
      collision/
```

## Required Worker capabilities

- metadata/head endpoint;
- byte-range reads with `206 Partial Content`;
- explicit `Content-Range`, `Content-Length` and stable ETag/version;
- authenticated access without exposing R2 API secrets;
- optional index listing/search endpoint;
- CORS restricted to Project V origins.

## Do not do this

- do not embed Access Key ID, Secret Access Key or R2 token in GitHub Pages;
- do not make the raw bucket public just to simplify loading;
- do not download an 8 GB object before reading a 64-byte header;
- do not push extracted proprietary game data into the public Git repository.
