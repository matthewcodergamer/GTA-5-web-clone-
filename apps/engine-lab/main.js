import { BlobSource } from '../../packages/vfs/src/index.js';
import { probeRpfSource } from '../../packages/rpf/src/index.js';

const picker = document.querySelector('#rpf-picker');
const output = document.querySelector('#probe-output');
const fileMeta = document.querySelector('#file-meta');
const steps = [...document.querySelectorAll('[data-step]')];

function formatBytes(n) {
  if (!Number.isFinite(n)) return '—';
  const units = ['B','KB','MB','GB']; let i=0;
  while (n >= 1024 && i < units.length-1) { n /= 1024; i++; }
  return `${n.toFixed(i > 1 ? 2 : 0)} ${units[i]}`;
}

picker.addEventListener('change', async () => {
  const file = picker.files?.[0];
  if (!file) return;
  fileMeta.textContent = `${file.name} • ${formatBytes(file.size)} • local only`;
  output.textContent = 'Reading first 64 bytes…';
  try {
    const result = await probeRpfSource(new BlobSource(file));
    output.textContent = JSON.stringify(result, null, 2);
    steps[0].dataset.state = result.isRpf ? 'ok' : 'warn';
  } catch (error) {
    output.textContent = `${error.name}: ${error.message}`;
    steps[0].dataset.state = 'warn';
  }
});
