# Test Case 5: Movie with Trailers and Clips

## Description
Tests a movie with multiple trailers and clips to verify proper classification and association.

## Structure
- **Videos**: 
  - Main movie: The Matrix.mkv
  - Trailers: The Matrix Trailer.mp4, Matrix-trailer.mkv
  - Clips: EX Making Of.mp4, EX Behind Scenes.mkv
- **Subtitles**: Movie (EN, FR), trailer (EN), clip (EN)
- **Images**: poster, fanart, movie image with dimensions (should ignore 1920x1080)

## Expected Results
- Should detect 1 movie, 2 trailers, 2 clips
- Trailers should be absolutely classified (not overridden by duration)
- Clips should be absolutely classified  
- Should match subtitles to respective videos
- Should ignore dimension pattern "1920x1080" in image filename
- Media type: `movie_collection` or `movie_with_trailers`

## Key Test Points
- Absolute trailer detection by filename
- Absolute clip detection by "EX " prefix
- Movie/trailer/clip classification
- Subtitle association with different video types
- Image dimension pattern filtering