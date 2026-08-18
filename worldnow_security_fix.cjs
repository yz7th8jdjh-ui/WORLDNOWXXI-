const {execSync} = require("child_process");
const fs = require("fs");

console.log("\n>>> WORLDNOWXXI SECURITY DEPENDENCY FIX");

execSync('node "worldnow_auth_hardening_final.cjs"', {stdio:"inherit"});

const pkg = JSON.parse(fs.readFileSync("package.json","utf8"));
pkg.dependencies = pkg.dependencies || {};
pkg.overrides = pkg.overrides || {};

pkg.dependencies["@neondatabase/neon-js"] = "0.7.0-beta";
pkg.overrides["better-auth"] = "1.6.2";
pkg.overrides["postcss"] = "8.5.25";
pkg.overrides["sharp"] = "0.35.3";
pkg.dependencies["next"] = "15.5.21";

fs.writeFileSync("package.json", JSON.stringify(pkg,null,2) + "\n");

console.log("Installing controlled security upgrades...");
execSync("rm -rf node_modules package-lock.json", {stdio:"inherit"});
execSync("npm install --legacy-peer-deps", {stdio:"inherit"});

console.log("\n>>> Verifying installed security versions");
for (const name of ["@neondatabase/neon-js","better-auth","postcss","sharp","next"]) {
  try {
    const v = execSync(`node -p "require('${name}/package.json').version"`, {encoding:"utf8"}).trim();
    console.log(`${name}: ${v}`);
  } catch {
    console.log(`${name}: version lookup unavailable`);
  }
}

console.log("\n>>> SECURITY AUDIT AFTER FIX");
let raw="";
try {
  raw=execSync("npm audit --json",{encoding:"utf8",stdio:["ignore","pipe","pipe"]});
} catch(e) {
  raw=(e.stdout||"").toString();
}
if(!raw.trim()){
  console.error("SECURITY FIX FAILED: npm audit produced no report");
  process.exit(71);
}

let report;
try { report=JSON.parse(raw); }
catch {
  console.error("SECURITY FIX FAILED: could not parse npm audit report");
  process.exit(72);
}

const v=report.metadata?.vulnerabilities||{};
console.log(`Total: ${v.total||0}`);
console.log(`Critical: ${v.critical||0}`);
console.log(`High: ${v.high||0}`);
console.log(`Moderate: ${v.moderate||0}`);
console.log(`Low: ${v.low||0}`);

fs.writeFileSync("worldnow_npm_audit_after_fix.json",JSON.stringify(report,null,2));

if((v.critical||0)>0){
  console.error("SECURITY GATE FAILED: critical vulnerability remains. Deployment stopped.");
  process.exit(73);
}

const vulns=report.vulnerabilities||{};
for(const [name,item] of Object.entries(vulns)){
  console.log(`[${String(item.severity||"unknown").toUpperCase()}] ${name} ${item.isDirect?"[DIRECT]":""}`);
}

console.log("\nWORLDNOWXXI SECURITY DEPENDENCY FIX applied successfully");
console.log("SECURITY GATE: no critical vulnerabilities detected");
