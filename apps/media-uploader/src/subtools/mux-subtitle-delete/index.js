#!/usr/bin/env node

/**
 * Mux Subtitle Delete Tool
 *
 * A subtool for deleting subtitle tracks from Mux assets by language code
 *
 * Features:
 * - Delete by Mux asset ID (Layer 1)
 * - Delete by video file ID (Layer 2)
 * - Delete by media description ID (Layer 3)
 * - Delete using INI configuration (Layer 4)
 * - Dry-run mode for safe testing
 * - Language-based filtering
 *
 * Usage:
 *   node index.js from-asset --asset-id <id> --language <code> --mux-token-id <id> --mux-token-secret <secret>
 *   node index.js from-video-file --video-file-id <id> --language <code> [backend and mux credentials]
 *   node index.js from-media-description --media-description-id <id> --language <code> [backend and mux credentials]
 *   node index.js from-ini --ini <path> --media-description-id <id> --language <code>
 */

import MuxSubtitleDeleteCLI from './cli/index.js';

// Export core functions for programmatic use
export { deleteFromAssetId } from './core/deleteFromAssetId.js';
export { deleteFromVideoFileId } from './core/deleteFromVideoFileId.js';
export { deleteFromMediaDescriptionId } from './core/deleteFromMediaDescriptionId.js';
export { deleteWithIniConfig } from './core/deleteWithIniConfig.js';

// Export service for advanced use
export { default as MuxSubtitleDeleter } from './services/muxSubtitleDeleter.js';

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new MuxSubtitleDeleteCLI();
  cli.run();
}

export default MuxSubtitleDeleteCLI;
