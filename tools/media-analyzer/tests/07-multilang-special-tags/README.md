# Test Case 7: Multi-Language and Special Tags

## Description
Tests language detection, special subtitle tags, and dimension pattern filtering.

## Structure
- **Videos**: Episode 01, Episode 02
- **Subtitles**: 
  - Episode 01: English, French, English Forced, English SDH
  - Episode 02: Spanish, Commentary
- **Images**: Episode images with dimensions (1920-1080) and thumbnail

## Expected Results
- Should detect 2 episodes
- Should identify multiple languages: English, French, Spanish
- Should detect special tags: forced, sdh, commentary
- Should ignore "1920-1080" dimension pattern in image matching
- Should properly associate all subtitles with correct episodes
- Media type: `series`

## Key Test Points
- Multi-language subtitle detection
- Special subtitle tag recognition (forced, sdh, commentary)
- Image dimension pattern filtering
- Language code extraction and naming
- Multiple subtitle association per episode