# Content Validation System

The Media Analyzer Tool now includes comprehensive content validation to help identify missing or incomplete media assets. The validation system automatically checks for missing images, subtitles, and episodes in your media collection.

## 🔍 Validation Features

### 📸 Image Validation
Ensures all videos have required image formats for different display contexts:

**Required Resolutions:**
- `1080x1080` - Square format (social media, thumbnails) ✅ **Critical**
- `1920x1080` - Standard HD landscape (main display) ✅ **Critical**  
- `1920x720` - Wide format (banners, headers) ✅ **Critical**
- `810x1080` - Portrait format (mobile displays) ✅ **Critical**
- `1080x1920` - Vertical format (mobile, stories) ⚠️ **Preferred**

**Detects:**
- Videos completely missing images (Critical)
- Missing required image resolutions (Critical/Warning)
- Resolution coverage statistics across all content

### 💬 Subtitle Validation
Ensures consistent and complete subtitle coverage:

**Requirements:**
- French subtitles are mandatory for all content ✅ **Critical**
- Consistent subtitle languages across series episodes ⚠️ **Warning**

**Detects:**
- Videos missing French subtitles (Critical)
- Episodes with inconsistent subtitle language sets within a series (Warning)
- Language coverage statistics

### 📺 Episode Validation
Identifies gaps in episode sequences for series content:

**Logic:**
- **Confirmed Missing**: Episodes between available episodes (e.g., have 10, 12 → missing 11) ✅ **Critical**
- **Potentially Missing**: Episodes before first available (e.g., starts at episode 5 → might miss 1-4) ⚠️ **Warning**

**Example:**
- Available episodes: 10, 11, 15
- Confirmed missing: 12, 13, 14 (between 11 and 15)
- Potentially missing: 1-9 (before episode 10)

## 📊 Validation Output

### JSON Structure
```json
{
  "validation": {
    "summary": {
      "total_issues": 12,
      "critical_issues": 8,
      "warnings": 4,
      "validation_timestamp": "2025-08-24T23:35:00.000Z",
      "validation_date": "8/24/2025, 11:35:00 PM"
    },
    "images": {
      "videos_without_images": [...],
      "missing_resolutions": [...],
      "resolution_coverage": {...}
    },
    "subtitles": {
      "missing_french": [...],
      "inconsistent_languages": [...],
      "language_coverage": {...}
    },
    "episodes": {
      "missing_episodes": [...],
      "episode_gaps": [...],
      "series_analysis": {...}
    }
  }
}
```

### CLI Output
The command line interface shows validation summary:
```
🔍 Validation Issues Found:
  - Total Issues: 12
  - Critical: 8
  - Warnings: 4

🔴 Critical: 3 videos without images
🔴 Critical: 2 videos missing French subtitles
🔴 Critical: 5 confirmed missing episodes

📋 See detailed validation report in the JSON file.
```

### GUI Display
The graphical interface shows comprehensive validation reports with:
- Color-coded issue severity (🔴 Critical, 🟡 Warning)
- Expandable sections for each validation category
- File-level details with paths and metadata
- Resolution requirements and coverage statistics
- Episode gap analysis with series breakdowns

## 🚨 Issue Severity

### Critical Issues (🔴)
**Must be resolved** - These indicate incomplete or unusable content:
- Videos without any images
- Missing mandatory French subtitles
- Confirmed missing episodes (gaps in sequence)
- Missing required image resolutions (except vertical format)

### Warnings (🟡)  
**Should be reviewed** - These indicate potential improvements:
- Missing vertical/mobile image format (1080x1920)
- Inconsistent subtitle languages across series episodes  
- Potentially missing episodes (before first available episode)

## 🎯 Usage Examples

### Complete Series Validation
```bash
# Analyze series with validation
npm start -- -v /videos -s /subtitles -i /images -o analysis.json

# Check results
cat analysis.json | grep -A 20 '"validation"'
```

### GUI Validation
```bash
# Launch GUI for visual validation reports
npm run gui
```

### Understanding Episode Gaps
If you have a series with episodes 1, 3, 5, 8-12, 15:

**Confirmed Missing (Critical):**
- Episodes 2, 4, 6, 7 (gaps between available episodes)
- Episode 13, 14 (gaps between 12 and 15)

**Potentially Missing (Warning):**
- None (series starts at episode 1)

## 🔧 Customization

### Image Resolution Requirements
Edit `src/validators/ContentValidator.js` to modify required resolutions:
```javascript
this.requiredResolutions = [
    '1080x1080',    // Square format
    '1920x1080',    // Standard HD landscape
    '1920x720',     // Wide format  
    '810x1080',     // Portrait format
    '1080x1920'     // Vertical format (optional)
];
```

### Subtitle Language Requirements
Modify mandatory subtitle languages:
```javascript
this.mandatorySubtitleLanguages = ['fr', 'french'];
```

## 🐛 Troubleshooting

### False Positives
- **Image resolution detection**: Ensure image filenames include resolution (e.g., `poster_1920x1080.jpg`)
- **French subtitle detection**: Use standard language codes (`fr`, `french`, `fra`)
- **Episode numbering**: Ensure consistent episode numbering in filenames

### Performance
- Validation adds minimal processing time (~1-2 seconds)
- Image resolution detection works on filename patterns, not file analysis
- Can be disabled by modifying the analyzer if needed

## 📈 Benefits

1. **Quality Assurance**: Ensures complete media packages before distribution
2. **Workflow Optimization**: Identifies missing assets early in the process  
3. **Platform Compatibility**: Validates content meets multi-platform requirements
4. **Automated Checking**: Reduces manual review time and human error
5. **Detailed Reporting**: Provides actionable insights for content completion

The validation system helps maintain high content quality standards and ensures your media collection is complete and ready for distribution across different platforms and devices.