const {execSync}=require("child_process");
const fs=require("fs");
const path=require("path");
console.log("\n>>> BLOCK 6/6 SECURITY + RELEASE");
execSync('node "worldnow_block5_providers.cjs"',{stdio:"inherit"});

// Keep Next.js on the current 15.x line while moving to the July 2026 patched Maintenance LTS.
execSync('npm pkg set dependencies.next="15.5.21"',{stdio:"inherit"});

// Remove the adapter from package devDependencies so Cloudflare can configure the compatible adapter itself.
try{execSync('npm pkg delete devDependencies.@opennextjs/cloudflare',{stdio:"inherit"})}catch{}

// Clean generated adapter configs before Cloudflare's deploy autoconfiguration.
for(const f of ["open-next.config.ts","wrangler.jsonc"]){
 try{fs.rmSync(path.join(process.cwd(),f),{force:true})}catch{}
}
execSync('npm pkg set dependencies."@peculiar/asn1-x509"="2.9.0"', {stdio:"inherit"});
execSync('npm install --legacy-peer-deps',{stdio:"inherit"});
console.log("WORLDNOWXXI SECURITY RELEASE PREP applied");
console.log("Next.js target: 15.5.21");
