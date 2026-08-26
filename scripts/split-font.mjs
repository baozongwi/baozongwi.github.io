import { fontSplit } from 'cn-font-split';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';

const src = process.argv[2] || resolve('fonts-src/TsangerJinKai02-W04.ttf');
const dest = resolve('static/fonts/tsanger-jinkai02');

if (!existsSync(src)) {
  console.error('missing font file:', src);
  process.exit(1);
}

mkdirSync(dest, { recursive: true });

await fontSplit({
  input: src,
  outDir: dest,
  chunkSize: 80 * 1024,
  css: {
    fontFamily: 'TsangerJinKai02',
    fontWeight: '400',
    fontStyle: 'normal',
    fontDisplay: 'swap',
    compress: true,
  },
});

for (const junk of ['index.html', 'index.proto', 'reporter.bin']) {
  try { rmSync(join(dest, junk)); } catch {}
}

console.log('wrote', dest);
