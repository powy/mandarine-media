# Test Case 4: Series with Mixed Images

## Description
Tests a TV series with both global series images and per-episode images.

## Structure
- **Videos**: S01E01, S01E02, S01E03 (3 episodes)
- **Subtitles**: Complete set (mixed languages: EN, FR, EN)
- **Images**: 
  - Per-episode: S01E01-thumb, S01E02-thumb (S01E03 missing)
  - Global: poster, fanart

## Expected Results
- Should detect 3 video episodes
- Should match all 3 subtitles with correct languages
- Should associate 2 thumbnails with respective episodes
- Should identify 2 global images (poster, fanart)
- S01E03 should have no individual image
- Media type: `series`

## Key Test Points
- Mixed image type handling
- Proper separation of global vs episode images
- Language detection in subtitles
- Partial per-episode image coverage