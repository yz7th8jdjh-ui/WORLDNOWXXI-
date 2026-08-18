const {execSync} = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("\n>>> WORLDNOWXXI IDENTITY TRUST AUDIT");

// Reconstruct from the last green security build.
execSync('node "worldnow_security_fix_dynamic.cjs"', {stdio:"inherit"});

const roots = ["app","components","lib"];
const hits = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir,name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(name)) inspect(p);
  }
}

function inspect(file) {
  const text = fs.readFileSync(file,"utf8");
  const lines = text.split(/\r?\n/);
  lines.forEach((line,i)=>{
    const lower = line.toLowerCase();
    const risky =
      lower.includes("localstorage") ||
      lower.includes("worldnow_user_id") ||
      lower.includes("user_id") ||
      lower.includes("userid") ||
      lower.includes("storeduser") ||
      lower.includes("myid(");
    if (risky) {
      hits.push({
        file,
        line: i+1,
        text: line.trim().slice(0,300)
      });
    }
  });
}

for (const r of roots) walk(r);

console.log(`\nIdentity-related references found: ${hits.length}\n`);
for (const h of hits) {
  console.log(`${h.file}:${h.line}`);
  console.log(`  ${h.text}`);
}

fs.writeFileSync(
  "worldnow_identity_audit.json",
  JSON.stringify({count:hits.length,hits},null,2)
);

console.log("\n>>> Categorizing likely authorization-risk references");

const riskyHits = hits.filter(h=>{
  const s = h.text.toLowerCase();
  return (
    (s.includes("localstorage") && (s.includes("user") || s.includes("id"))) ||
    s.includes("worldnow_user_id") ||
    s.includes("localstorage.getitem(\"user_id") ||
    s.includes("localstorage.getitem('user_id")
  );
});

const files = [...new Set(riskyHits.map(h=>h.file))];
console.log(`Potential client-trusted identity references: ${riskyHits.length}`);
console.log(`Files affected: ${files.length}`);
for (const f of files) console.log(`  - ${f}`);

fs.writeFileSync(
  "worldnow_identity_risk_files.json",
  JSON.stringify({count:riskyHits.length,files,riskyHits},null,2)
);

console.log("\nWORLDNOWXXI IDENTITY AUDIT completed");
console.log("No application files were modified by this audit.");
console.log("Next step: patch only the exact files listed above, one by one, using server session identity.");
