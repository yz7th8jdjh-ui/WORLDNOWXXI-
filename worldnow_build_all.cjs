const { execSync } = require("child_process");

const steps = [
  "worldnow_v10_update.cjs",
  "worldnow_v12_complete.cjs",
  "worldnow_world_live.cjs",
  "worldnow_community.cjs",
  "worldnow_world_map.cjs",
  "worldnow_trending_money.cjs",
  "worldnow_media.cjs",
  "worldnow_admin_security.cjs",
  "worldnow_news_local.cjs",
  "worldnow_experience.cjs",
  "worldnow_family_safety.cjs"
];

for (const file of steps) {
  console.log(`\n>>> Running ${file}`);
  execSync(`node "${file}"`, { stdio: "inherit" });
}

console.log("\nWORLDNOWXXI ALL BLOCKS applied successfully");
