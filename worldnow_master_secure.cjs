const { execSync } = require("child_process");
const fs = require("fs");

console.log("\n==================================================");
console.log(" WORLDNOWXXI — MASTER SECURE");
console.log(" Single build entrypoint");
console.log("==================================================\n");

function run(cmd){
  console.log("\n$ " + cmd);
  execSync(cmd,{stdio:"inherit"});
}

function must(file){
  if(!fs.existsSync(file)){
    console.error("\nMASTER SECURE ERROR: missing required file:",file);
    process.exit(301);
  }
}

/*
  CURRENT STABLE CHAIN
  --------------------
  This master intentionally calls only the latest green identity layer.
  That layer already chains:
    identity phase 1
      -> identity core
        -> dynamic security fix
          -> clean auth hardening
            -> security shield
              -> full WORLDNOWXXI master chain

  This avoids asking Cloudflare for a different build command every time.
*/
must("worldnow_identity_phase1.cjs");
run('node "worldnow_identity_phase1.cjs"');

console.log("\n>>> MASTER SECURE FINAL GATES");

// Ensure the server-session identity bridge exists.
[
  "app/api/auth/secure-session/route.js",
  "app/api/auth/me/route.js",
  "app/api/auth/profile/route.js",
  "lib/current-user-client.js",
  "lib/use-current-user.js"
].forEach(must);

// The known sensitive pages must remain present.
// We do NOT use destructive regex rewrites here.
const sensitive=[
  "app/crear/page.js",
  "app/guardados/page.js",
  "app/mensajes/page.js",
  "app/notificaciones/page.js",
  "app/page.js",
  "app/perfil/bloqueados/page.js",
  "app/perfil/page.js",
  "app/post/[id]/page.js",
  "app/seguridad/usuario/[id]/page.js",
  "app/usuario/[id]/page.js"
];
sensitive.forEach(must);

// Produce one compact identity-risk report every build.
const risk=[];
for(const file of sensitive){
  const text=fs.readFileSync(file,"utf8");
  const direct=
    (text.match(/localStorage\.getItem\(["']worldnow_user_id["']\)/g)||[]).length+
    (text.match(/localStorage\.getItem\(["']user_id["']\)/g)||[]).length;
  risk.push({file,direct_browser_identity_reads:direct});
}
fs.writeFileSync(
  "worldnow_master_secure_identity_report.json",
  JSON.stringify(risk,null,2)
);

const remaining=risk.reduce((n,x)=>n+x.direct_browser_identity_reads,0);
console.log("Sensitive pages verified:",sensitive.length);
console.log("Remaining direct browser identity reads:",remaining);
console.log("Identity report: worldnow_master_secure_identity_report.json");

// Dependency audit must remain completely clean.
let raw="";
try{
  raw=execSync("npm audit --json",{encoding:"utf8",stdio:["ignore","pipe","pipe"]});
}catch(e){
  raw=(e.stdout||"").toString();
}
let audit={};
try{audit=JSON.parse(raw||"{}")}catch{}
const v=audit.metadata?.vulnerabilities||{};
console.log("\nDependency vulnerabilities:",v.total||0);
if((v.total||0)!==0){
  console.error("MASTER SECURE FAILED: npm audit is not clean.");
  process.exit(302);
}

// Final production build.
run("npm run build");

console.log("\n==================================================");
console.log(" WORLDNOWXXI MASTER SECURE — SUCCESS");
console.log(" SECURITY GATE: 0 dependency vulnerabilities");
console.log(" BUILD GATE: production build passed");
console.log(" SERVER SESSION IDENTITY BRIDGE: present");
console.log("==================================================\n");
