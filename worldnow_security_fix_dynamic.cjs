const {execSync} = require("child_process");
const fs = require("fs");
const path = require("path");

function sh(cmd, options={}) {
  console.log(`\n$ ${cmd}`);
  return execSync(cmd, {encoding:"utf8", stdio:["ignore","pipe","pipe"], ...options});
}
function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, {stdio:"inherit"});
}
function npmLatest(spec) {
  const out = sh(`npm view "${spec}" version --json`).trim();
  const val = JSON.parse(out);
  return Array.isArray(val) ? val[val.length-1] : val;
}
function collectFiles(dir, out=[]) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir,name);
    const s = fs.statSync(p);
    if (s.isDirectory()) collectFiles(p,out);
    else if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(name)) out.push(p);
  }
  return out;
}
function sourceUses(pkgName) {
  const files = ["app","components","lib"].flatMap(d=>collectFiles(d));
  return files.some(f=>{
    try { return fs.readFileSync(f,"utf8").includes(pkgName); }
    catch { return false; }
  });
}
function auditReport() {
  let raw="";
  try {
    raw=execSync("npm audit --json",{encoding:"utf8",stdio:["ignore","pipe","pipe"]});
  } catch(e) {
    raw=(e.stdout||"").toString();
  }
  if(!raw.trim()) throw new Error("npm audit did not return JSON");
  return JSON.parse(raw);
}

console.log("\n>>> WORLDNOWXXI DYNAMIC SECURITY FIX");

// Always begin from the last known-good green source chain.
run('node "worldnow_auth_hardening_final.cjs"');

const pkg = JSON.parse(fs.readFileSync("package.json","utf8"));
pkg.dependencies = pkg.dependencies || {};
pkg.devDependencies = pkg.devDependencies || {};
pkg.overrides = pkg.overrides || {};

console.log("\n>>> Checking which Neon SDK packages are actually imported by generated source");
const neonPkgs = [
  "@neondatabase/neon-js",
  "@neondatabase/auth",
  "@neondatabase/auth-ui"
];

for (const name of neonPkgs) {
  const used = sourceUses(name);
  console.log(`${name}: ${used ? "USED" : "NOT USED"}`);
  if (!used) {
    delete pkg.dependencies[name];
    delete pkg.devDependencies[name];
    console.log(`Removed unused dependency ${name}`);
  } else {
    const latest = npmLatest(name);
    pkg.dependencies[name] = latest;
    console.log(`Pinned ${name} to published latest ${latest}`);
  }
}

// Resolve versions from npm itself so nonexistent versions can never be selected.
const next16 = npmLatest("next@16");
const betterAuth = npmLatest("better-auth");
const passkey = npmLatest("@better-auth/passkey");
const postcss = npmLatest("postcss@8");
const sharp = npmLatest("sharp");

console.log("\n>>> Published versions selected from npm");
console.log(`next: ${next16}`);
console.log(`better-auth: ${betterAuth}`);
console.log(`@better-auth/passkey: ${passkey}`);
console.log(`postcss: ${postcss}`);
console.log(`sharp: ${sharp}`);

pkg.dependencies["next"] = next16;

// Only keep direct dependencies if the project already needs them.
for (const [name,version] of Object.entries({
  "better-auth": betterAuth,
  "@better-auth/passkey": passkey,
  "postcss": postcss,
  "sharp": sharp
})) {
  if (pkg.dependencies[name]) pkg.dependencies[name]=version;
  if (pkg.devDependencies[name]) pkg.devDependencies[name]=version;
}

// Pin vulnerable transitives to current published patched lines.
pkg.overrides["better-auth"] = betterAuth;
pkg.overrides["@better-auth/passkey"] = passkey;
pkg.overrides["postcss"] = postcss;
pkg.overrides["sharp"] = sharp;

fs.writeFileSync("package.json", JSON.stringify(pkg,null,2)+"\n");

console.log("\n>>> Clean install");
run("rm -rf node_modules package-lock.json");
run("npm install --legacy-peer-deps");

console.log("\n>>> npm audit security gate");
const report = auditReport();
const v = report.metadata?.vulnerabilities || {};
console.log(`Total: ${v.total||0}`);
console.log(`Critical: ${v.critical||0}`);
console.log(`High: ${v.high||0}`);
console.log(`Moderate: ${v.moderate||0}`);
console.log(`Low: ${v.low||0}`);

for (const [name,item] of Object.entries(report.vulnerabilities||{})) {
  console.log(`\n[${String(item.severity||"unknown").toUpperCase()}] ${name}${item.isDirect?" [DIRECT]":""}`);
  if(item.range) console.log(` affected: ${item.range}`);
  for(const x of (Array.isArray(item.via)?item.via:[]).slice(0,5)) {
    if(typeof x === "string") console.log(` via: ${x}`);
    else console.log(` via: ${x.title||x.name||"advisory"}${x.url?" - "+x.url:""}`);
  }
}

fs.writeFileSync("worldnow_npm_audit_dynamic.json", JSON.stringify(report,null,2));

if ((v.total||0) !== 0) {
  console.error("\nSECURITY GATE FAILED: vulnerabilities remain. Deployment stopped.");
  process.exit(91);
}

console.log("\n>>> Audit clean. Running production build gate");
run("npm run build");

console.log("\nWORLDNOWXXI DYNAMIC SECURITY FIX applied successfully");
console.log("SECURITY GATE: 0 vulnerabilities");
console.log("BUILD GATE: production build passed");
