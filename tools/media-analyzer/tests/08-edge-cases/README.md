# Test Case 8: Edge Cases and Complex Patterns

## Description
Tests edge cases with complex filename patterns, special characters, and mixed formats.

## Structure
- **Videos**: 
  - Trailers with brackets/parentheses: Movie [trailer].mkv, Film (trailer).mp4
  - Series with 1x01 format: Show 1x01, Show 1x02
  - Clip without episode info: EX Special.mkv
  - Simple trailer: teaser.mp4
- **Subtitles**: Various language codes (eng, fra)
- **Images**: Special types (clearlogo, backdrop) + dimension pattern (720p)

## Expected Results
- Should detect trailers with [trailer] and (trailer) patterns
- Should parse 1x01 episode format correctly
- Should identify teaser as trailer
- Should detect special image types (logo, fanart)
- Should ignore "720p" dimension pattern
- Should handle mixed content appropriately

## Key Test Points
- Bracket/parentheses trailer detection
- Alternative episode numbering formats (1x01)
- Clip without clear episode association
- Special image type recognition
- Complex filename parsing
- Dimension pattern variations (720p vs 1920x1080)