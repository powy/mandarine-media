# Test Case 2: Series with Missing Images

## Description
Tests a TV series where one episode is missing its thumbnail image to verify proper image association.

## Structure
- **Videos**: S01E01, S01E02, S01E03 (3 episodes)
- **Subtitles**: Complete set for all episodes (English)
- **Images**: Thumbnails for S01E01 and S01E03 - **S01E02 missing**

## Expected Results
- Should detect 3 video episodes
- Should match all 3 subtitles correctly
- Should match 2 images (S01E01, S01E03)
- S01E02 should have no associated image
- Should report no unmatched images (all are associated)
- Media type: `series`

## Key Test Points
- Missing image detection
- Proper episode-to-image association
- Complete subtitle matching
- No false image associations