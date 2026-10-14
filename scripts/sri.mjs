// Prints the pinned jsDelivr URL and SRI hash of the single-file bundle for the current version.
// Webflow's hosted-script registration needs both.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
// Webflow uses the single-file bundle: SRI can't vouch for an ES module's lazily imported chunks.
const url = `https://cdn.jsdelivr.net/gh/Faction42HQ/deploy-calculators@${version}/dist/deploy-calcs.bundle.js`;
const local = createHash('sha384').update(readFileSync('dist/deploy-calcs.bundle.js')).digest('base64');

console.log(`URL:  ${url}`);
console.log(`SRI:  sha384-${local}  (local dist/)`);

try {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const remote = createHash('sha384').update(Buffer.from(await res.arrayBuffer())).digest('base64');
  console.log(remote === local ? 'CDN:  ✓ jsDelivr serves the same file' : `CDN:  ✗ jsDelivr file differs (sha384-${remote}); is the tag pushed?`);
} catch (e) {
  console.log(`CDN:  not reachable yet (${e.message}); push the v${version} tag first`);
}
