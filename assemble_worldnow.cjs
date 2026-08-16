const fs = require("fs");
const path = require("path");

for (const dir of ["app","components","lib","public"]) {
  const p = path.join(process.cwd(), dir);
  if (fs.existsSync(p)) fs.rmSync(p, {recursive:true, force:true});
}
for (let i = 1; i <= 4; i++) {
  require(`./worldnow_block_${i}.cjs`);
}
console.log("WORLDNOWXXI assembled.");
