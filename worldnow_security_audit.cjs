const {execSync} = require("child_process");
const fs = require("fs");

console.log("\n>>> WORLDNOWXXI SECURITY AUDIT");

execSync('node "worldnow_auth_hardening_final.cjs"', {stdio:"inherit"});

console.log("\n>>> Running npm audit (read-only, no automatic fixes)\n");

let raw = "";
try {
  raw = execSync("npm audit --json", {encoding:"utf8", stdio:["ignore","pipe","pipe"]});
} catch (e) {
  raw = (e.stdout || "").toString();
  if (!raw.trim()) {
    console.error("npm audit could not produce a JSON report.");
    if (e.stderr) console.error(e.stderr.toString());
    process.exit(61);
  }
}

let report;
try {
  report = JSON.parse(raw);
} catch {
  console.error("Could not parse npm audit JSON.");
  process.exit(62);
}

const meta = report.metadata?.vulnerabilities || {};
const total = meta.total ?? Object.values(meta).reduce((a,b)=>a+(Number(b)||0),0);

console.log("=== WORLDNOWXXI NPM AUDIT SUMMARY ===");
console.log(`Total vulnerabilities: ${total}`);
console.log(`Critical: ${meta.critical || 0}`);
console.log(`High: ${meta.high || 0}`);
console.log(`Moderate: ${meta.moderate || 0}`);
console.log(`Low: ${meta.low || 0}`);
console.log("");

const vulns = report.vulnerabilities || {};
const rows = [];

for (const [name, v] of Object.entries(vulns)) {
  const via = Array.isArray(v.via)
    ? v.via.map(x => typeof x === "string" ? x : `${x.title || x.name || "advisory"}${x.url ? " ("+x.url+")" : ""}`)
    : [];
  rows.push({
    name,
    severity: v.severity || "unknown",
    direct: !!v.isDirect,
    range: v.range || "",
    fix: v.fixAvailable === false ? "none" :
         v.fixAvailable === true ? "available" :
         (v.fixAvailable?.name ? `${v.fixAvailable.name}@${v.fixAvailable.version}${v.fixAvailable.isSemVerMajor ? " (major)" : ""}` : "available"),
    via: via.slice(0,3)
  });
}

const order = {critical:0, high:1, moderate:2, low:3, unknown:4};
rows.sort((a,b)=>(order[a.severity]??9)-(order[b.severity]??9) || Number(b.direct)-Number(a.direct));

for (const r of rows) {
  console.log(`[${r.severity.toUpperCase()}] ${r.name}${r.direct ? " [DIRECT]" : ""}`);
  if (r.range) console.log(`  affected: ${r.range}`);
  console.log(`  fix: ${r.fix}`);
  for (const x of r.via) console.log(`  via: ${x}`);
}

fs.writeFileSync("worldnow_npm_audit.json", JSON.stringify(report, null, 2));

console.log("\nWORLDNOWXXI SECURITY AUDIT completed");
console.log("Full JSON saved as worldnow_npm_audit.json");
console.log("NOTE: This block does NOT run npm audit fix or modify dependencies.");
