const {execSync}=require("child_process");

console.log("\n=== WORLDNOWXXI FINAL MASTER ===");

// Rebuild the base project first. The chained feature masters expect package.json/app files to exist.
execSync('node "assemble_worldnow.cjs"',{stdio:"inherit"});

// Then apply blocks 1→6 through the existing chain.
execSync('node "worldnow_block6_security.cjs"',{stdio:"inherit"});

console.log("\n=== WORLDNOWXXI ALL BLOCKS APPLIED ===");
