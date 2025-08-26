# Test Case 6: Series with Clips and Trailers

## Description
Tests a TV series with episodes, season trailer, and episode clips to verify clip-episode association.

## Structure
- **Videos**: 
  - Episodes: S01E01, S01E02, S01E03
  - Trailer: Season 1 Trailer.mp4
  - Clips: EX S01E01 Preview.mkv, EX S01E02 Deleted.mp4
- **Subtitles**: All episodes + one clip subtitle
- **Images**: Series poster

## Expected Results
- Should detect 3 episodes, 1 trailer, 2 clips
- Clips should be associated with their respective episodes:
  - EX S01E01 Preview → S01E01
  - EX S01E02 Deleted → S01E02
- Trailer should be absolute classification
- Should match clip subtitles correctly
- Media type: `series`

## Key Test Points
- Clip-to-episode association logic
- Series trailer detection
- Episode number parsing in clips
- Clip subtitle matching
- Mixed content in series structure