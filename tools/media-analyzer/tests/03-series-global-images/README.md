# Test Case 3: Series with Global Images Only

## Description
Tests a TV series with only global/series-level images (no per-episode images).

## Structure
- **Videos**: S01E01, S01E02, S01E03 (3 episodes)
- **Subtitles**: Complete set for all episodes (English)
- **Images**: Global series images (poster, fanart, banner, logo)

## Expected Results
- Should detect 3 video episodes
- Should match all 3 subtitles correctly
- Should identify all 4 images as global images
- Episodes should have no individual images associated
- Global images should include: poster, fanart, banner, logo
- Media type: `series`

## Key Test Points
- Global image identification
- Proper image type classification (poster, fanart, banner, logo)
- No false episode-image associations
- Complete global images collection