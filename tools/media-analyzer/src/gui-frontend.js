// Frontend JavaScript for the Media Analyzer GUI

class MediaAnalyzerUI {
    constructor() {
        this.isAnalyzing = false;
        this.currentResult = null;
        
        // Initialize the UI
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupProgressListener();
    }

    setupEventListeners() {
        // Browse button event listeners
        document.getElementById('browse-video').addEventListener('click', () => {
            this.selectFolder('video-path');
        });

        document.getElementById('browse-subtitle').addEventListener('click', () => {
            this.selectFolder('subtitle-path');
        });

        document.getElementById('browse-image').addEventListener('click', () => {
            this.selectFolder('image-path');
        });

        // Start analysis button
        document.getElementById('start-analysis').addEventListener('click', () => {
            this.startAnalysis();
        });

        // Close results button
        document.getElementById('close-results').addEventListener('click', () => {
            this.closeResults();
        });

        // Path input change listeners to enable/disable start button
        ['video-path', 'subtitle-path', 'image-path'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.updateStartButtonState();
            });
        });

        // Initial state update
        this.updateStartButtonState();
    }

    setupProgressListener() {
        window.electronAPI.onAnalysisProgress((data) => {
            this.updateProgress(data);
        });
    }

    async selectFolder(inputId) {
        try {
            const folderPath = await window.electronAPI.selectFolder();
            if (folderPath) {
                document.getElementById(inputId).value = folderPath;
                this.updateStartButtonState();
            }
        } catch (error) {
            console.error('Error selecting folder:', error);
            this.showError('Failed to select folder: ' + error.message);
        }
    }

    updateStartButtonState() {
        const videoPath = document.getElementById('video-path').value.trim();
        const subtitlePath = document.getElementById('subtitle-path').value.trim();
        const imagePath = document.getElementById('image-path').value.trim();
        
        const hasAtLeastOnePath = videoPath || subtitlePath || imagePath;
        const startButton = document.getElementById('start-analysis');
        
        startButton.disabled = !hasAtLeastOnePath || this.isAnalyzing;
    }

    async startAnalysis() {
        if (this.isAnalyzing) return;

        this.isAnalyzing = true;
        this.updateStartButtonState();

        // Hide results and show progress
        this.hideResults();
        this.showProgress();

        try {
            // Get paths
            const paths = {
                videoPath: document.getElementById('video-path').value.trim() || null,
                subtitlePath: document.getElementById('subtitle-path').value.trim() || null,
                imagePath: document.getElementById('image-path').value.trim() || null
            };

            // Get options
            const options = {
                readMetadata: document.getElementById('read-metadata').checked,
                exportForUpload: document.getElementById('export-upload').checked
            };

            // Start analysis
            const result = await window.electronAPI.startAnalysis(paths, options);

            if (result.success) {
                this.currentResult = result.result;
                this.showResults(result.result, result.outputFile);
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Analysis error:', error);
            this.showError('Analysis failed: ' + error.message);
        } finally {
            this.isAnalyzing = false;
            this.updateStartButtonState();
            this.hideProgress();
        }
    }

    updateProgress(data) {
        const progressFill = document.getElementById('progress-fill');
        const progressStage = document.getElementById('progress-stage');
        const progressPercent = document.getElementById('progress-percent');
        const progressMessage = document.getElementById('progress-message');

        progressFill.style.width = data.progress + '%';
        progressStage.textContent = this.formatStage(data.stage);
        progressPercent.textContent = data.progress + '%';
        progressMessage.textContent = data.message;
    }

    formatStage(stage) {
        const stages = {
            'starting': 'Starting',
            'scanning': 'Scanning Files',
            'detecting': 'Detecting Structure',
            'associating': 'Creating Associations',
            'formatting': 'Formatting Results',
            'complete': 'Complete',
            'error': 'Error'
        };
        return stages[stage] || stage;
    }

    showProgress() {
        document.querySelector('.progress-section').style.display = 'block';
    }

    hideProgress() {
        document.querySelector('.progress-section').style.display = 'none';
    }

    showResults(result, outputFile) {
        const resultsSection = document.querySelector('.results-section');
        const resultsContent = document.getElementById('results-content');

        // Generate human-friendly report
        const reportHTML = this.generateHumanFriendlyReport(result, outputFile);
        resultsContent.innerHTML = reportHTML;

        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    hideResults() {
        document.querySelector('.results-section').style.display = 'none';
    }

    closeResults() {
        this.hideResults();
    }

    generateHumanFriendlyReport(result, outputFile) {
        const timestamp = result.generated_at || new Date().toLocaleString();
        
        let html = `
            <div class="result-summary">
                <h3>📊 Analysis Summary</h3>
                <p><strong>Generated:</strong> ${timestamp}</p>
                <p><strong>JSON File:</strong> ${outputFile}</p>
                
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Media Type:</span>
                        <span class="stat-value">${result.media_type || 'Unknown'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Structure:</span>
                        <span class="stat-value">${result.structure_type || 'Unknown'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Videos:</span>
                        <span class="stat-value">${result.statistics.total_videos || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Subtitles:</span>
                        <span class="stat-value">${result.statistics.total_subtitles || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Matched Subtitles:</span>
                        <span class="stat-value">${result.statistics.matched_subtitles || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Images:</span>
                        <span class="stat-value">${result.statistics.total_images || 0}</span>
                    </div>
                </div>
            </div>
        `;

        // Languages found
        if (result.statistics.languages_found && result.statistics.languages_found.length > 0) {
            html += `
                <div class="result-summary">
                    <h3>🌐 Languages Detected</h3>
                    <p>${result.statistics.languages_found.join(', ')}</p>
                </div>
            `;
        }

        // Media items
        if (result.media_items && result.media_items.length > 0) {
            html += `<div class="media-items"><h3>🎬 Media Items (${result.media_items.length})</h3>`;
            
            result.media_items.forEach((item, index) => {
                html += `
                    <div class="media-item">
                        <h4>${this.getMediaItemTitle(item, index + 1)}</h4>
                        
                        <div class="file-info">
                            <div><strong>Video:</strong></div>
                            <div class="file-path">${item.video.filepath}</div>
                            ${item.video.metadata ? `
                                <div class="file-metadata">
                                    Duration: ${item.video.metadata.duration || 'Unknown'} | 
                                    Resolution: ${item.video.metadata.resolution || 'Unknown'} |
                                    Size: ${this.formatFileSize(item.video.metadata.filesize)}
                                </div>
                            ` : ''}
                            
                            ${item.subtitles.length > 0 ? `
                                <div style="margin-top: 1rem;"><strong>Subtitles (${item.subtitles.length}):</strong></div>
                                ${item.subtitles.map(sub => `
                                    <div class="file-path">${sub.language_code}: ${sub.filepath}</div>
                                `).join('')}
                            ` : ''}
                            
                            ${item.images.length > 0 ? `
                                <div style="margin-top: 1rem;"><strong>Images (${item.images.length}):</strong></div>
                                ${item.images.map(img => `
                                    <div class="file-path">${img.type}: ${img.filepath}</div>
                                `).join('')}
                            ` : ''}
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }

        // Global images
        if (result.global_images && result.global_images.length > 0) {
            html += `
                <div class="result-summary">
                    <h3>🖼️ Global Images (${result.global_images.length})</h3>
                    ${result.global_images.map(img => `
                        <div class="file-path">${img.type}: ${img.filepath}</div>
                    `).join('')}
                </div>
            `;
        }

        // Validation Results
        if (result.validation && result.validation.summary.total_issues > 0) {
            html += this.generateValidationReport(result.validation);
        }

        // Unmatched files
        const hasUnmatched = 
            (result.unmatched_files.subtitles && result.unmatched_files.subtitles.length > 0) ||
            (result.unmatched_files.images && result.unmatched_files.images.length > 0);

        if (hasUnmatched) {
            html += `<div class="result-summary"><h3>⚠️ Unmatched Files</h3>`;
            
            if (result.unmatched_files.subtitles.length > 0) {
                html += `
                    <div style="margin-bottom: 1rem;">
                        <strong>Unmatched Subtitles (${result.unmatched_files.subtitles.length}):</strong>
                        ${result.unmatched_files.subtitles.map(file => `
                            <div class="file-path">${file.filepath}</div>
                        `).join('')}
                    </div>
                `;
            }
            
            if (result.unmatched_files.images.length > 0) {
                html += `
                    <div>
                        <strong>Unmatched Images (${result.unmatched_files.images.length}):</strong>
                        ${result.unmatched_files.images.map(file => `
                            <div class="file-path">${file.filepath}</div>
                        `).join('')}
                    </div>
                `;
            }
            
            html += `</div>`;
        }

        return html;
    }

    getMediaItemTitle(item, index) {
        if (item.title) {
            return item.title;
        }
        
        if (item.season_number && item.episode_number) {
            return `Season ${item.season_number}, Episode ${item.episode_number}`;
        }
        
        if (item.episode_number) {
            return `Episode ${item.episode_number}`;
        }
        
        return `Media Item ${index}`;
    }

    formatFileSize(bytes) {
        if (!bytes) return 'Unknown';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    generateValidationReport(validation) {
        const summary = validation.summary;
        let html = `
            <div class="result-summary validation-report">
                <h3>🔍 Content Validation Report</h3>
                <p><strong>Issues Found:</strong> ${summary.total_issues} total (${summary.critical_issues} critical, ${summary.warnings} warnings)</p>
                
                <div class="validation-summary">
                    <div class="validation-stat critical">
                        <span class="validation-label">🔴 Critical Issues:</span>
                        <span class="validation-value">${summary.critical_issues}</span>
                    </div>
                    <div class="validation-stat warning">
                        <span class="validation-label">🟡 Warnings:</span>
                        <span class="validation-value">${summary.warnings}</span>
                    </div>
                </div>
            </div>
        `;

        // Image validation issues
        if (validation.images.videos_without_images.length > 0 || validation.images.missing_resolutions.length > 0) {
            html += `
                <div class="result-summary validation-section">
                    <h3>🖼️ Image Issues</h3>
            `;

            if (validation.images.videos_without_images.length > 0) {
                html += `
                    <div class="validation-issue critical">
                        <h4>🔴 Videos Without Images (${validation.images.videos_without_images.length})</h4>
                        <div class="issue-list">
                            ${validation.images.videos_without_images.map(item => `
                                <div class="issue-item">
                                    <strong>${item.video}</strong><br>
                                    <span class="file-path">${item.filepath}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            if (validation.images.missing_resolutions.length > 0) {
                html += `
                    <div class="validation-issue">
                        <h4>Missing Required Image Resolutions</h4>
                        <div class="resolution-list">
                            ${validation.images.missing_resolutions.map(item => `
                                <div class="resolution-item ${item.severity}">
                                    ${item.severity === 'critical' ? '🔴' : '🟡'} <strong>${item.resolution}</strong> - Missing for ${item.affected_videos} videos
                                </div>
                            `).join('')}
                        </div>
                        <p class="resolution-note">
                            <strong>Required resolutions:</strong> 1080x1080, 1920x1080, 1920x720, 810x1080<br>
                            <strong>Preferred:</strong> 1080x1920 (vertical/mobile format)
                        </p>
                    </div>
                `;
            }

            html += `</div>`;
        }

        // Subtitle validation issues
        if (validation.subtitles.missing_french.length > 0 || validation.subtitles.inconsistent_languages.length > 0) {
            html += `
                <div class="result-summary validation-section">
                    <h3>💬 Subtitle Issues</h3>
            `;

            if (validation.subtitles.missing_french.length > 0) {
                html += `
                    <div class="validation-issue critical">
                        <h4>🔴 Missing French Subtitles (${validation.subtitles.missing_french.length})</h4>
                        <p><strong>French subtitles are mandatory for all content.</strong></p>
                        <div class="issue-list">
                            ${validation.subtitles.missing_french.map(item => `
                                <div class="issue-item">
                                    <strong>${item.video}</strong><br>
                                    <span class="file-path">${item.filepath}</span><br>
                                    <span class="available-languages">Available languages: ${item.available_languages.length > 0 ? item.available_languages.join(', ') : 'none'}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            if (validation.subtitles.inconsistent_languages.length > 0) {
                html += `
                    <div class="validation-issue warning">
                        <h4>🟡 Inconsistent Subtitle Languages</h4>
                        <div class="issue-list">
                            ${validation.subtitles.inconsistent_languages.map(series => `
                                <div class="issue-item">
                                    <strong>${series.series}</strong><br>
                                    ${series.inconsistent_episodes.length}/${series.total_episodes} episodes have inconsistent languages<br>
                                    <span class="common-languages">Common languages: ${series.common_languages.join(', ') || 'none'}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            html += `</div>`;
        }

        // Episode validation issues
        if (validation.episodes.episode_gaps.length > 0) {
            html += `
                <div class="result-summary validation-section">
                    <h3>📺 Episode Issues</h3>
            `;

            validation.episodes.episode_gaps.forEach(series => {
                const confirmedMissing = series.missing_episodes.filter(ep => ep !== undefined);
                const potentialMissing = series.potential_missing.filter(ep => ep !== undefined);

                html += `
                    <div class="validation-issue">
                        <h4>${series.series} Episode Gaps</h4>
                        <p><strong>Available episodes:</strong> ${series.available_episodes.join(', ')}</p>
                        
                        ${confirmedMissing.length > 0 ? `
                            <div class="missing-episodes critical">
                                🔴 <strong>Confirmed missing episodes:</strong> ${confirmedMissing.join(', ')}<br>
                                <span class="explanation">These episodes are missing between available episodes and should be added.</span>
                            </div>
                        ` : ''}
                        
                        ${potentialMissing.length > 0 ? `
                            <div class="missing-episodes warning">
                                🟡 <strong>Potentially missing episodes:</strong> ${potentialMissing.join(', ')}<br>
                                <span class="explanation">These episodes might be missing (series starts at episode ${Math.min(...series.available_episodes)}).</span>
                            </div>
                        ` : ''}
                    </div>
                `;
            });

            html += `</div>`;
        }

        return html;
    }

    showError(message) {
        // Simple error display - you could make this more sophisticated
        alert('Error: ' + message);
    }
}

// Initialize the UI when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MediaAnalyzerUI();
});