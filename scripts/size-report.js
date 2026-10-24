// Prints raw and gzip sizes of build output. Usage: node scripts/size-report.js [dir ...]
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const dirs = process.argv.slice(2).length ? process.argv.slice(2) : ["dist"];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const kib = (n) => `${(n / 1024).toFixed(1)} KiB`;

for (const dir of dirs) {
  if (!fs.existsSync(dir)) {
    console.error(`${dir}: not found (run npm run build first)`);
    process.exitCode = 1;
    continue;
  }
  const files = walk(dir).filter((f) => /\.(m?js|cjs|wasm)$/.test(f));
  let raw = 0;
  let gz = 0;
  for (const file of files.sort()) {
    const buf = fs.readFileSync(file);
    const g = zlib.gzipSync(buf, { level: 9 }).length;
    raw += buf.length;
    gz += g;
    console.log(`${kib(buf.length).padStart(12)} ${kib(g).padStart(12)} gz  ${path.relative(dir, file)}`);
  }
  console.log(`${kib(raw).padStart(12)} ${kib(gz).padStart(12)} gz  TOTAL ${dir} (${files.length} files)\n`);
}
