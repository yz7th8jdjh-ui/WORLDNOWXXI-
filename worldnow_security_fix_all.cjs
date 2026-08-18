const {execSync} = require("child_process");
const fs = require("fs");

function run(cmd, opts={}) {
  console.log(`\n$ ${cmd}`);
  return execSync(cmd, {stdio:"inherit", ...opts});
}

function auditJson() {
  let raw="";
  try {
    raw=execSync("npm audit --json",{encoding:"utf8",stdio:["ignore","pipe","pipe"]});
  } catch(e) {
    raw=(e.stdout||"").toString();
  }
  if(!raw.trim()) throw new Error("npm audit produced no JSON report");
  return JSON.parse(raw);
}

console.log("\n>>> WORLDNOWXXI SECURITY FIX ALL");

// Reconstruct from the last known-good green chain.
run('node "worldnow_auth_hardening_final.cjs"');

const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
pkg.dependencies=pkg.dependencies||{};
pkg.devDependencies=pkg.devDependencies||{};
pkg.overrides=pkg.overrides||{};

// Security/compatibility set verified against upstream package manifests/advisories.
pkg.dependencies["next"]="16.3.0";
pkg.dependencies["@neondatabase/neon-js"]="0.6.3-beta";
pkg.dependencies["@neondatabase/auth"]="0.5.0-beta";
pkg.dependencies["@neondatabase/auth-ui"]="0.3.0-beta";

// Pin patched authentication and build/image dependencies.
pkg.overrides["better-auth"]="1.6.23";
pkg.overrides["@better-auth/passkey"]="1.6.23";
pkg.overrides["postcss"]="8.5.25";
pkg.overrides["sharp"]="0.35.3";

// If these are direct dependencies already, make them match the secure pins too.
for (const [name,version] of Object.entries({
  "better-auth":"1.6.23",
  "@better-auth/passkey":"1.6.23",
  "postcss":"8.5.25",
  "sharp":"0.35.3"
})) {
  if (pkg.dependencies[name]) pkg.dependencies[name]=version;
  if (pkg.devDependencies[name]) pkg.devDependencies[name]=version;
}

fs.writeFileSync("package.json",JSON.stringify(pkg,null,2)+"\n");

console.log("\n>>> Installing clean dependency graph");
run("rm -rf node_modules package-lock.json");
run("npm install --legacy-peer-deps");

console.log("\n>>> Installed top-level versions");
try {
  const tree=execSync(
    "npm ls next @neondatabase/neon-js @neondatabase/auth @neondatabase/auth-ui better-auth @better-auth/passkey postcss sharp --depth=0",
    {encoding:"utf8"}
  );
  console.log(tree);
} catch(e) {
  console.log((e.stdout||"").toString());
  console.error("Dependency tree is invalid.");
  process.exit(81);
}

console.log("\n>>> WORLDNOWXXI FINAL SECURITY AUDIT");
let report;
try { report=auditJson(); }
catch(e) {
  console.error(e.message);
  process.exit(82);
}

const m=report.metadata?.vulnerabilities||{};
console.log(`Total: ${m.total||0}`);
console.log(`Critical: ${m.critical||0}`);
console.log(`High: ${m.high||0}`);
console.log(`Moderate: ${m.moderate||0}`);
console.log(`Low: ${m.low||0}`);

const vulns=report.vulnerabilities||{};
for(const [name,item] of Object.entries(vulns)){
  console.log(`\n[${String(item.severity||"unknown").toUpperCase()}] ${name}${item.isDirect?" [DIRECT]":""}`);
  if(item.range) console.log(` affected: ${item.range}`);
  const via=Array.isArray(item.via)?item.via:[];
  for(const x of via.slice(0,5)){
    if(typeof x==="string") console.log(` via: ${x}`);
    else console.log(` via: ${x.title||x.name||"advisory"}${x.url?" - "+x.url:""}`);
  }
}

fs.writeFileSync("worldnow_npm_audit_final.json",JSON.stringify(report,null,2));

// User asked to fix everything: do not deploy while npm reports any vulnerability.
if((m.total||0)!==0){
  console.error("\nSECURITY GATE FAILED: npm audit is not clean. Deployment stopped.");
  process.exit(83);
}

console.log("\n>>> npm audit CLEAN — running Next production smoke build");
run("npm run build");

console.log("\nWORLDNOWXXI SECURITY FIX ALL applied successfully");
console.log("SECURITY GATE: 0 npm audit vulnerabilities");
console.log("BUILD GATE: Next production build passed");
