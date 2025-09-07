const path = require('path');
const fs = require('fs').promises;

/**
 * Content validation module for detecting missing images, subtitles, and episodes
 */
class ContentValidator {
    constructor(config = null) {
        this.config = config;
        
        // Required image resolutions for video content
        this.requiredResolutions = [
            '1080x1080',    // Square format
            '1920x1080',    // Standard HD landscape
            '1920x720',     // Wide format
            '810x1080',     // Portrait format
            '1080x1920'     // Vertical/mobile format (optional but preferred)
        ];
        
        // Required subtitle languages (French is mandatory)
        this.mandatorySubtitleLanguages = ['fr', 'french'];
        
        this.validationResults = {
            images: {
                missing_resolutions: [],
                videos_without_images: [],
                resolution_coverage: {}
            },
            subtitles: {
                missing_french: [],
                inconsistent_languages: [],
                language_coverage: {}
            },
            episodes: {
                missing_episodes: [],
                episode_gaps: [],
                series_analysis: {}
            },
            summary: {
                total_issues: 0,
                critical_issues: 0,
                warnings: 0
            }
        };
    }

    /**
     * Validate all content and return comprehensive report
     */
    validate(analysisResult) {
        console.log('Starting content validation...');
        
        // Reset validation results
        this.resetValidationResults();
        
        // Run all validation checks
        this.validateImages(analysisResult);
        this.validateSubtitles(analysisResult);
        this.validateEpisodes(analysisResult);
        
        // Calculate summary statistics
        this.calculateSummaryStatistics();
        
        console.log(`Validation completed. Found ${this.validationResults.summary.total_issues} issues.`);
        return this.validationResults;
    }

    resetValidationResults() {
        this.validationResults = {
            images: {
                missing_resolutions: [],
                videos_without_images: [],
                resolution_coverage: {}
            },
            subtitles: {
                missing_french: [],
                inconsistent_languages: [],
                language_coverage: {}
            },
            episodes: {
                missing_episodes: [],
                episode_gaps: [],
                series_analysis: {}
            },
            summary: {
                total_issues: 0,
                critical_issues: 0,
                warnings: 0
            }
        };
    }

    /**
     * Validate image coverage and resolutions
     */
    validateImages(analysisResult) {
        console.log('Validating image coverage...');
        
        const mediaItems = analysisResult.media_items || [];
        const globalImages = analysisResult.global_images || [];
        
        // Initialize resolution coverage tracking
        this.requiredResolutions.forEach(res => {
            this.validationResults.images.resolution_coverage[res] = {
                available: false,
                count: 0,
                videos_covered: 0,
                videos_missing: []
            };
        });
        
        // Check each media item for image coverage
        mediaItems.forEach((item, index) => {
            const itemImages = item.images || [];
            const videoTitle = this.getVideoTitle(item, index);
            
            // Check if video has any images at all
            if (itemImages.length === 0) {
                this.validationResults.images.videos_without_images.push({
                    video: videoTitle,
                    filepath: item.video?.filepath || 'unknown',
                    episode: item.episode_number,
                    season: item.season_number
                });
            }
            
            // Check resolution coverage for this video
            const availableResolutions = this.extractImageResolutions(itemImages, globalImages);
            
            this.requiredResolutions.forEach(requiredRes => {
                const coverage = this.validationResults.images.resolution_coverage[requiredRes];
                
                if (availableResolutions.includes(requiredRes)) {
                    coverage.available = true;
                    coverage.count++;
                    coverage.videos_covered++;
                } else {
                    coverage.videos_missing.push({
                        video: videoTitle,
                        filepath: item.video?.filepath || 'unknown',
                        episode: item.episode_number,
                        season: item.season_number
                    });
                }
            });
        });
        
        // Identify completely missing resolutions
        this.requiredResolutions.forEach(res => {
            const coverage = this.validationResults.images.resolution_coverage[res];
            if (!coverage.available || coverage.count === 0) {
                this.validationResults.images.missing_resolutions.push({
                    resolution: res,
                    severity: res === '1080x1920' ? 'warning' : 'critical', // Vertical format is preferred but not critical
                    affected_videos: mediaItems.length
                });
            }
        });
        
        console.log(`Image validation completed. Found ${this.validationResults.images.videos_without_images.length} videos without images.`);
    }

    /**
     * Extract image resolutions from image collections
     */
    extractImageResolutions(itemImages, globalImages) {
        const resolutions = new Set();
        
        // Check item-specific images
        itemImages.forEach(img => {
            const resolution = this.detectImageResolution(img.filename);
            if (resolution) {
                resolutions.add(resolution);
            }
        });
        
        // Check global images (available to all videos)
        globalImages.forEach(img => {
            const resolution = this.detectImageResolution(img.filename);
            if (resolution) {
                resolutions.add(resolution);
            }
        });
        
        return Array.from(resolutions);
    }

    /**
     * Detect image resolution from filename patterns
     */
    detectImageResolution(filename) {
        // Common patterns for resolution in filenames
        const resolutionPatterns = [
            /(\d{3,4})[x-](\d{3,4})/i,  // 1920x1080, 1920-1080
            /(\d{3,4})_(\d{3,4})/,      // 1920_1080
            /(\d{3,4})\.(\d{3,4})/      // 1920.1080
        ];
        
        for (const pattern of resolutionPatterns) {
            const match = filename.match(pattern);
            if (match) {
                const width = parseInt(match[1]);
                const height = parseInt(match[2]);
                return `${width}x${height}`;
            }
        }
        
        return null;
    }

    /**
     * Validate subtitle coverage and consistency
     */
    validateSubtitles(analysisResult) {
        console.log('Validating subtitle coverage...');
        
        const mediaItems = analysisResult.media_items || [];
        const languageConsistency = {};
        
        // Analyze each media item
        mediaItems.forEach((item, index) => {
            const itemSubtitles = item.subtitles || [];
            const videoTitle = this.getVideoTitle(item, index);
            const languages = itemSubtitles.map(sub => sub.language_code?.toLowerCase()).filter(Boolean);
            
            // Check for French subtitles
            const hasFrench = languages.some(lang => 
                this.mandatorySubtitleLanguages.includes(lang) || lang.startsWith('fr')
            );
            
            if (!hasFrench) {
                this.validationResults.subtitles.missing_french.push({
                    video: videoTitle,
                    filepath: item.video?.filepath || 'unknown',
                    episode: item.episode_number,
                    season: item.season_number,
                    available_languages: languages
                });
            }
            
            // Track language consistency for series
            if (item.season_number && item.episode_number) {
                const seriesKey = `Season ${item.season_number}`;
                if (!languageConsistency[seriesKey]) {
                    languageConsistency[seriesKey] = {
                        episodes: [],
                        common_languages: null,
                        inconsistent_episodes: []
                    };
                }
                
                languageConsistency[seriesKey].episodes.push({
                    episode: item.episode_number,
                    languages: languages,
                    video: videoTitle
                });
            }
            
            // Update language coverage statistics
            languages.forEach(lang => {
                if (!this.validationResults.subtitles.language_coverage[lang]) {
                    this.validationResults.subtitles.language_coverage[lang] = 0;
                }
                this.validationResults.subtitles.language_coverage[lang]++;
            });
        });
        
        // Analyze language consistency within series
        Object.entries(languageConsistency).forEach(([seriesKey, data]) => {
            if (data.episodes.length > 1) {
                // Find common languages across all episodes
                let commonLanguages = data.episodes[0].languages;
                data.episodes.forEach(ep => {
                    commonLanguages = commonLanguages.filter(lang => ep.languages.includes(lang));
                });
                
                data.common_languages = commonLanguages;
                
                // Find episodes with inconsistent languages
                data.episodes.forEach(ep => {
                    const missingLanguages = commonLanguages.filter(lang => !ep.languages.includes(lang));
                    const extraLanguages = ep.languages.filter(lang => !commonLanguages.includes(lang));
                    
                    if (missingLanguages.length > 0 || extraLanguages.length > 0) {
                        data.inconsistent_episodes.push({
                            episode: ep.episode,
                            video: ep.video,
                            missing_languages: missingLanguages,
                            extra_languages: extraLanguages,
                            has_languages: ep.languages
                        });
                    }
                });
                
                if (data.inconsistent_episodes.length > 0) {
                    this.validationResults.subtitles.inconsistent_languages.push({
                        series: seriesKey,
                        common_languages: commonLanguages,
                        total_episodes: data.episodes.length,
                        inconsistent_episodes: data.inconsistent_episodes
                    });
                }
            }
        });
        
        console.log(`Subtitle validation completed. Found ${this.validationResults.subtitles.missing_french.length} videos without French subtitles.`);
    }

    /**
     * Validate episode sequences and detect gaps
     */
    validateEpisodes(analysisResult) {
        console.log('Validating episode sequences...');
        
        const mediaItems = analysisResult.media_items || [];
        const seriesMap = {};
        
        // Group episodes by series/season
        mediaItems.forEach((item, index) => {
            if (item.season_number && item.episode_number) {
                const seriesKey = `Season ${item.season_number}`;
                if (!seriesMap[seriesKey]) {
                    seriesMap[seriesKey] = {
                        episodes: [],
                        season: item.season_number
                    };
                }
                
                seriesMap[seriesKey].episodes.push({
                    episode: item.episode_number,
                    video: this.getVideoTitle(item, index),
                    filepath: item.video?.filepath || 'unknown'
                });
            }
        });
        
        // Analyze each series for gaps
        Object.entries(seriesMap).forEach(([seriesKey, data]) => {
            const episodes = data.episodes.sort((a, b) => a.episode - b.episode);
            const episodeNumbers = episodes.map(ep => ep.episode);
            
            if (episodes.length > 0) {
                const minEpisode = Math.min(...episodeNumbers);
                const maxEpisode = Math.max(...episodeNumbers);
                
                const analysis = {
                    series: seriesKey,
                    season: data.season,
                    available_episodes: episodeNumbers,
                    episode_range: `${minEpisode}-${maxEpisode}`,
                    total_available: episodes.length,
                    expected_total: maxEpisode - minEpisode + 1,
                    missing_episodes: [],
                    potential_missing: [],
                    gaps: []
                };
                
                // Find definite gaps (missing episodes between available ones)
                for (let ep = minEpisode; ep <= maxEpisode; ep++) {
                    if (!episodeNumbers.includes(ep)) {
                        analysis.missing_episodes.push(ep);
                        analysis.gaps.push({
                            episode: ep,
                            type: 'confirmed_missing',
                            reason: `Episode ${ep} is missing between available episodes ${minEpisode} and ${maxEpisode}`
                        });
                    }
                }
                
                // Identify potential missing episodes (before the first available episode)
                if (minEpisode > 1) {
                    for (let ep = 1; ep < minEpisode; ep++) {
                        analysis.potential_missing.push(ep);
                        analysis.gaps.push({
                            episode: ep,
                            type: 'potentially_missing',
                            reason: `Episode ${ep} might be missing (series starts at episode ${minEpisode})`
                        });
                    }
                }
                
                this.validationResults.episodes.series_analysis[seriesKey] = analysis;
                
                // Add to main results if there are issues
                if (analysis.missing_episodes.length > 0 || analysis.potential_missing.length > 0) {
                    this.validationResults.episodes.episode_gaps.push(analysis);
                }
                
                analysis.missing_episodes.forEach(epNum => {
                    this.validationResults.episodes.missing_episodes.push({
                        series: seriesKey,
                        season: data.season,
                        episode: epNum,
                        type: 'confirmed_missing'
                    });
                });
                
                analysis.potential_missing.forEach(epNum => {
                    this.validationResults.episodes.missing_episodes.push({
                        series: seriesKey,
                        season: data.season,
                        episode: epNum,
                        type: 'potentially_missing'
                    });
                });
            }
        });
        
        console.log(`Episode validation completed. Found ${this.validationResults.episodes.episode_gaps.length} series with missing episodes.`);
    }

    /**
     * Calculate summary statistics for validation results
     */
    calculateSummaryStatistics() {
        let totalIssues = 0;
        let criticalIssues = 0;
        let warnings = 0;
        
        // Count image issues
        totalIssues += this.validationResults.images.videos_without_images.length;
        totalIssues += this.validationResults.images.missing_resolutions.length;
        
        this.validationResults.images.missing_resolutions.forEach(issue => {
            if (issue.severity === 'critical') {
                criticalIssues++;
            } else {
                warnings++;
            }
        });
        
        criticalIssues += this.validationResults.images.videos_without_images.length; // No images is critical
        
        // Count subtitle issues
        criticalIssues += this.validationResults.subtitles.missing_french.length; // Missing French is critical
        warnings += this.validationResults.subtitles.inconsistent_languages.length;
        totalIssues += this.validationResults.subtitles.missing_french.length;
        totalIssues += this.validationResults.subtitles.inconsistent_languages.length;
        
        // Count episode issues
        const confirmedMissing = this.validationResults.episodes.missing_episodes.filter(ep => ep.type === 'confirmed_missing').length;
        const potentialMissing = this.validationResults.episodes.missing_episodes.filter(ep => ep.type === 'potentially_missing').length;
        
        criticalIssues += confirmedMissing; // Confirmed missing episodes are critical
        warnings += potentialMissing; // Potential missing episodes are warnings
        totalIssues += confirmedMissing + potentialMissing;
        
        this.validationResults.summary = {
            total_issues: totalIssues,
            critical_issues: criticalIssues,
            warnings: warnings,
            validation_timestamp: new Date().toISOString(),
            validation_date: new Date().toLocaleString()
        };
    }

    /**
     * Get a readable title for a video item
     */
    getVideoTitle(item, index) {
        if (item.title) {
            return item.title;
        }
        
        if (item.season_number && item.episode_number) {
            return `Season ${item.season_number}, Episode ${item.episode_number}`;
        }
        
        if (item.episode_number) {
            return `Episode ${item.episode_number}`;
        }
        
        if (item.video?.filename) {
            return path.basename(item.video.filename, path.extname(item.video.filename));
        }
        
        return `Media Item ${index + 1}`;
    }

    /**
     * Generate a human-readable validation report
     */
    generateHumanReadableReport() {
        const report = [];
        
        report.push('# CONTENT VALIDATION REPORT');
        report.push(`Generated: ${this.validationResults.summary.validation_date}`);
        report.push('');
        
        // Summary
        report.push('## SUMMARY');
        report.push(`- Total Issues: ${this.validationResults.summary.total_issues}`);
        report.push(`- Critical Issues: ${this.validationResults.summary.critical_issues}`);
        report.push(`- Warnings: ${this.validationResults.summary.warnings}`);
        report.push('');
        
        // Image Issues
        if (this.validationResults.images.videos_without_images.length > 0 || 
            this.validationResults.images.missing_resolutions.length > 0) {
            
            report.push('## 🖼️ IMAGE ISSUES');
            
            if (this.validationResults.images.videos_without_images.length > 0) {
                report.push(`### Videos Without Images (${this.validationResults.images.videos_without_images.length})`);
                this.validationResults.images.videos_without_images.forEach(item => {
                    report.push(`- ${item.video}: ${item.filepath}`);
                });
                report.push('');
            }
            
            if (this.validationResults.images.missing_resolutions.length > 0) {
                report.push('### Missing Image Resolutions');
                this.validationResults.images.missing_resolutions.forEach(item => {
                    const severity = item.severity === 'critical' ? '🔴' : '🟡';
                    report.push(`${severity} ${item.resolution} - Missing for ${item.affected_videos} videos`);
                });
                report.push('');
            }
        }
        
        // Subtitle Issues
        if (this.validationResults.subtitles.missing_french.length > 0 || 
            this.validationResults.subtitles.inconsistent_languages.length > 0) {
            
            report.push('## 💬 SUBTITLE ISSUES');
            
            if (this.validationResults.subtitles.missing_french.length > 0) {
                report.push(`### Missing French Subtitles (${this.validationResults.subtitles.missing_french.length})`);
                this.validationResults.subtitles.missing_french.forEach(item => {
                    const langs = item.available_languages.length > 0 ? 
                        ` (has: ${item.available_languages.join(', ')})` : ' (no subtitles)';
                    report.push(`🔴 ${item.video}${langs}`);
                });
                report.push('');
            }
            
            if (this.validationResults.subtitles.inconsistent_languages.length > 0) {
                report.push('### Inconsistent Subtitle Languages');
                this.validationResults.subtitles.inconsistent_languages.forEach(series => {
                    report.push(`🟡 ${series.series}: ${series.inconsistent_episodes.length}/${series.total_episodes} episodes have inconsistent languages`);
                    report.push(`   Common languages: ${series.common_languages.join(', ') || 'none'}`);
                });
                report.push('');
            }
        }
        
        // Episode Issues
        if (this.validationResults.episodes.episode_gaps.length > 0) {
            report.push('## 📺 EPISODE ISSUES');
            
            this.validationResults.episodes.episode_gaps.forEach(series => {
                report.push(`### ${series.series}`);
                report.push(`Available episodes: ${series.available_episodes.join(', ')}`);
                
                if (series.missing_episodes.length > 0) {
                    report.push(`🔴 Confirmed missing: ${series.missing_episodes.join(', ')}`);
                }
                
                if (series.potential_missing.length > 0) {
                    report.push(`🟡 Potentially missing: ${series.potential_missing.join(', ')}`);
                }
                
                report.push('');
            });
        }
        
        if (this.validationResults.summary.total_issues === 0) {
            report.push('✅ No validation issues found! All content appears complete.');
        }
        
        return report.join('\n');
    }
}

module.exports = ContentValidator;