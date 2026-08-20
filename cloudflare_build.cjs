const { execSync } = require("child_process");
const fs = require("fs");

function run(cmd) {
  console.log(`\n$ ${cmd}\n`);
  execSync(cmd, { stdio: "inherit" });
}

run("node worldnow_r2_integracion.cjs");

run(
  "npm install --no-save --legacy-peer-deps @opennextjs/cloudflare@1.20.2 wrangler@latest @noble/ciphers@1.3.0"
);

fs.writeFileSync(
  "open-next.config.ts",
  'import { defineCloudflareConfig } from "@opennextjs/cloudflare";\nexport default defineCloudflareConfig();\n'
);

fs.writeFileSync(
  "wrangler.jsonc",
  JSON.stringify(
    {
      $schema: "./node_modules/wrangler/config-schema.json",
      name: "worldnowxxi",
      main: ".open-next/worker.js",
      compatibility_date: "2026-08-20",
      compatibility_flags: ["nodejs_compat"],
      assets: {
        directory: ".open-next/assets",
        binding: "ASSETS"
      }
    },
    null,
    2
  )
);

run("npx opennextjs-cloudflare build --skipNextBuild");
