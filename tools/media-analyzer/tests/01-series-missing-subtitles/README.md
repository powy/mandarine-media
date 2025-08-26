# Test Case 1: Series with Missing Subtitles

## Description
Tests a TV series where one episode is missing subtitles to verify the tool correctly identifies unmatched files.

## Structure
- **Videos**: S01E01, S01E02, S01E03 (3 episodes)
- **Subtitles**: S01E01 (English), S01E03 (French) - **S01E02 missing**
- **Images**: Thumbnails for all episodes

## Expected Results
- Should detect 3 video episodes
- Should match 2 subtitles (S01E01, S01E03)
- Should report 1 unmatched video (S01E02 has no subtitle)
- Should match all 3 images to respective episodes
- Media type: `series`
- Structure type: `flat`

## Key Test Points
- Missing subtitle detection
- Proper episode-to-subtitle matching
- Unmatched files reporting
- Image association with episodes