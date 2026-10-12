# Media deployment

Public images and preserved videos live in the dedicated `mktwrs-media` R2 bucket at `https://media.mktwrs.com/assets/…`. Existing `/assets/…` links redirect there. Local originals remain in Git and on disk, but `.gitattributes` and `.dockerignore` omit them from deployment.

Before publishing new or changed media:

1. Configure the local AWS profile `mktwrs-r2` with bucket-scoped credentials. Never add credentials to Git or the application environment.
2. Run `python3 scripts/r2-media.py upload`. This uploads missing or changed assets and verifies the complete inventory by size and MD5.
3. Commit the inventory and verification report with the associated changes, then publish the application. Newly referenced assets must exist in R2 before deployment.

Railway builds the multi-stage Dockerfile. Its runtime contains Next.js standalone output, static client bundles, and `public` data; research inputs and dependencies used only during the build stay in the build stage.

Initial migration: 11,864 objects, 7,209,157,689 bytes, all verified. Local production image: 548,008,452 bytes. Git source archive after media exclusion: 140,934,849 bytes, zero media objects. The image and source sizes are measured locally; Railway measurements may differ.
