const {execSync}=require("child_process");
const fs=require("fs");
const path=require("path");

console.log("\n>>> WORLDNOWXXI AUTH HARDENING FIX");
execSync('node "worldnow_auth_hardening.cjs"',{stdio:"inherit"});

const imports={
  "app/page.js":"../lib/current-user",
  "app/perfil/page.js":"../../lib/current-user",
  "app/guardados/page.js":"../../lib/current-user",
  "app/post/[id]/page.js":"../../../lib/current-user",
  "app/seguridad/usuario/[id]/page.js":"../../../../lib/current-user",
  "app/perfil/bloqueados/page.js":"../../../lib/current-user",
  "app/mensajes/page.js":"../../lib/current-user",
  "app/crear/page.js":"../../lib/current-user",
  "app/notificaciones/page.js":"../../lib/current-user"
};

for(const [rel,correct] of Object.entries(imports)){
  const file=path.join(process.cwd(),rel);
  if(!fs.existsSync(file)) continue;
  let s=fs.readFileSync(file,"utf8");

  s=s.replace(
    /import\s+\{getCurrentUserId\}\s+from\s+["'][^"']*lib\/current-user["'];?/,
    `import {getCurrentUserId} from "${correct}";`
  );

  fs.writeFileSync(file,s);
}

// Validate every hardened page can resolve the helper before Cloudflare runs Next build.
let bad=[];
for(const [rel,imp] of Object.entries(imports)){
  const file=path.join(process.cwd(),rel);
  if(!fs.existsSync(file)) continue;
  const target=path.resolve(path.dirname(file),imp+".js");
  if(!fs.existsSync(target)) bad.push(`${rel} -> ${imp}`);
}
if(bad.length){
  console.error("AUTH HARDENING FIX FAILED: unresolved imports:");
  for(const x of bad) console.error(" - "+x);
  process.exit(42);
}

console.log("WORLDNOWXXI AUTH IMPORT PATHS verified");
console.log("WORLDNOWXXI AUTH HARDENING FIX applied successfully");
