// Build-time patch for the pinned dsh release (see the Dockerfile and ADR 004).
//
// dsh's browser client enables host settings (Settings > Models, the provider directory, the General page)
// only when the page's own hostname is loopback. On dsh.<HOST> the page is a "remote browser", so those
// screens fail with "settings are unavailable in this browser" and models cannot be created or edited.
// The restriction exists only in the client: the server's settings service has no such check, and every
// request to it already has to pass Cloudflare Access, the trusted-host fence and dsh's session cookie.
//
// This rewrites the two client-side checks so the page always uses host settings. It fails the image
// build unless each expected line is present exactly once, so a dsh upgrade that changes this code
// surfaces as a build error to review instead of a silently unpatched or half-patched image.
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const scope = path.join(execSync('npm root -g').toString().trim(), '@deepseek-ai/dsh/node_modules/@deepseek-ai');
const OLD = 'ctx.remote.$host.isLoopback ?';
const NEW = 'true /* patched by patch-remote-settings.js */ ?';

for (const file of ['dsh-client-ui-settings/lib/client.js', 'dsh-client-ui-settings-general/lib/client.js']) {
  const target = path.join(scope, file);
  const source = fs.readFileSync(target, 'utf8');
  const count = source.split(OLD).length - 1;
  if (count !== 1) {
    console.error(`patch-remote-settings: expected exactly 1 match for ${JSON.stringify(OLD)} in ${file}, found ${count}. dsh changed; review this patch.`);
    process.exit(1);
  }
  fs.writeFileSync(target, source.replace(OLD, () => NEW));
  const after = fs.readFileSync(target, 'utf8');
  if (after.includes(OLD) || !after.includes(NEW)) {
    console.error(`patch-remote-settings: ${file} was not patched as expected.`);
    process.exit(1);
  }
  console.log(`patch-remote-settings: patched ${file}`);
}
