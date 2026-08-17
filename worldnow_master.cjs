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
  "worldnow_family_safety.cjs",
  "worldnow_visual_polish.cjs",
  "worldnow_navigation_restructure.cjs",
  "worldnow_post_composer.cjs",
  "worldnow_mundo_live.cjs",
  "worldnow_sports_live.cjs",
  "worldnow_sports_live_fix.cjs",
  "worldnow_creator_pro.cjs",
  "worldnow_posts_database.cjs",
  "worldnow_real_media_upload.cjs",
  "worldnow_social_interactions.cjs",
  "worldnow_follow_profiles.cjs",
  "worldnow_real_notifications.cjs",
  "worldnow_transportes.cjs"
];

for (const file of steps) {
  console.log(`\n>>> Running ${file}`);
  execSync(`node "${file}"`, { stdio: "inherit" });
}

console.log("\nWORLDNOWXXI MASTER BUILD applied successfully");
