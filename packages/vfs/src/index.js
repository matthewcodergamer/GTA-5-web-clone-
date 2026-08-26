/** Project V VFS primitives. All reads use [offset, offset + length). */
export class ByteSource {
  async size() { throw new Error('ByteSource.size() not implemented'); }
  async read(_offset, _length) { throw new Error('ByteSource.read() not implemented'); }
}

export class BlobSource extends ByteSource {
  constructor(blob) { super(); this.blob = blob; }
  async size() { return this.blob.size; }
  async read(offset, length) {
    assertRange(offset, length, this.blob.size);
    return this.blob.slice(offset, offset + length).arrayBuffer();
  }
}

export class HttpRangeSource extends ByteSource {
  constructor(url, { headers = {}, fetchImpl = globalThis.fetch } = {}) {
    super();
    if (!fetchImpl) throw new Error('fetch is unavailable');
    this.url = url;
    this.headers = headers;
    this.fetchImpl = fetchImpl;
    this._size = null;
  }
  async size() {
    if (this._size != null) return this._size;
    const response = await this.fetchImpl(this.url, { method: 'HEAD', headers: this.headers, cache: 'no-store' });
    if (!response.ok) throw new Error(`HEAD ${response.status} for ${this.url}`);
    const raw = response.headers.get('content-length');
    if (!raw) throw new Error('Source does not expose Content-Length');
    this._size = Number(raw);
    if (!Number.isSafeInteger(this._size) || this._size < 0) throw new Error('Invalid Content-Length');
    return this._size;
  }
  async read(offset, length) {
    const total = await this.size();
    assertRange(offset, length, total);
    if (length === 0) return new ArrayBuffer(0);
    const end = offset + length - 1;
    const response = await this.fetchImpl(this.url, { headers: { ...this.headers, Range: `bytes=${offset}-${end}` }, cache: 'no-store' });
    if (response.status !== 206 && !(offset === 0 && length === total && response.status === 200)) throw new Error(`Expected HTTP 206 Range response, got ${response.status}`);
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength !== length) throw new Error(`Short range read: expected ${length}, got ${buffer.byteLength}`);
    return buffer;
  }
}

export class SubrangeSource extends ByteSource {
  constructor(parent, baseOffset, byteLength) { super(); this.parent = parent; this.baseOffset = baseOffset; this.byteLength = byteLength; }
  async size() { return this.byteLength; }
  async read(offset, length) { assertRange(offset, length, this.byteLength); return this.parent.read(this.baseOffset + offset, length); }
}

export class VfsMountTable {
  constructor() { this.mounts = new Map(); }
  mount(prefix, provider) {
    const key = normalizePath(prefix);
    if (!provider) throw new Error('mount provider is required');
    this.mounts.set(key, provider);
    return () => this.mounts.delete(key);
  }
  resolve(path) {
    const target = normalizePath(path);
    const candidates = [...this.mounts.keys()].filter(prefix => target === prefix || target.startsWith(prefix + '/')).sort((a, b) => b.length - a.length);
    const prefix = candidates[0];
    if (!prefix) throw new Error(`No VFS mount for ${target}`);
    const relativePath = target.slice(prefix.length).replace(/^\//, '');
    return { prefix, relativePath, provider: this.mounts.get(prefix) };
  }
}

export function normalizePath(input) {
  const source = String(input ?? '').replaceAll('\\', '/');
  const parts = [];
  for (const part of source.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (!parts.length) throw new Error('Path escapes VFS root');
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return '/' + parts.join('/');
}

export function assertRange(offset, length, total) {
  for (const value of [offset, length, total]) if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Ranges must be non-negative safe integers');
  if (offset > total || length > total - offset) throw new RangeError(`Read ${offset}+${length} exceeds source size ${total}`);
}
