import fs from 'fs/promises';
import path from 'path';

/**
 * Utility for extracting duration from subtitle files (VTT and SRT formats)
 */

/**
 * Parse a VTT timestamp and convert to seconds
 * Format: HH:MM:SS.mmm or MM:SS.mmm
 * @param {string} timestamp - VTT timestamp string
 * @returns {number} Time in seconds
 */
function parseVttTimestamp(timestamp) {
    const parts = timestamp.trim().split(':');

    if (parts.length === 3) {
        // HH:MM:SS.mmm
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parseFloat(parts[2]);
        return hours * 3600 + minutes * 60 + seconds;
    } else if (parts.length === 2) {
        // MM:SS.mmm
        const minutes = parseInt(parts[0], 10);
        const seconds = parseFloat(parts[1]);
        return minutes * 60 + seconds;
    }

    return 0;
}

/**
 * Parse an SRT timestamp and convert to seconds
 * Format: HH:MM:SS,mmm
 * @param {string} timestamp - SRT timestamp string
 * @returns {number} Time in seconds
 */
function parseSrtTimestamp(timestamp) {
    // Replace comma with dot for parsing
    const normalized = timestamp.trim().replace(',', '.');
    const parts = normalized.split(':');

    if (parts.length === 3) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parseFloat(parts[2]);
        return hours * 3600 + minutes * 60 + seconds;
    }

    return 0;
}

/**
 * Extract duration from VTT content
 * @param {string} vttContent - Content of VTT file
 * @returns {number} Duration in seconds (last subtitle end time)
 */
function extractVttDuration(vttContent) {
    if (!vttContent || typeof vttContent !== 'string') {
        return 0;
    }

    // Match VTT timestamp lines: HH:MM:SS.mmm --> HH:MM:SS.mmm
    const timePattern = /([\d:]+\.[\d]+)\s*-->\s*([\d:]+\.[\d]+)/g;
    let maxEndTime = 0;

    let match;
    while ((match = timePattern.exec(vttContent)) !== null) {
        const endTimestamp = match[2];
        const endTime = parseVttTimestamp(endTimestamp);
        maxEndTime = Math.max(maxEndTime, endTime);
    }

    return Math.round(maxEndTime);
}

/**
 * Extract duration from SRT content
 * @param {string} srtContent - Content of SRT file
 * @returns {number} Duration in seconds (last subtitle end time)
 */
function extractSrtDuration(srtContent) {
    if (!srtContent || typeof srtContent !== 'string') {
        return 0;
    }

    // Match SRT timestamp lines: HH:MM:SS,mmm --> HH:MM:SS,mmm
    const timePattern = /([\d:]+,[\d]+)\s*-->\s*([\d:]+,[\d]+)/g;
    let maxEndTime = 0;

    let match;
    while ((match = timePattern.exec(srtContent)) !== null) {
        const endTimestamp = match[2];
        const endTime = parseSrtTimestamp(endTimestamp);
        maxEndTime = Math.max(maxEndTime, endTime);
    }

    return Math.round(maxEndTime);
}

/**
 * Get subtitle duration from file
 * Automatically detects format (VTT or SRT) based on extension
 * @param {string} filePath - Path to subtitle file
 * @returns {Promise<number>} Duration in seconds
 */
async function getSubtitleDuration(filePath) {
    try {
        const extension = path.extname(filePath).toLowerCase();
        const content = await fs.readFile(filePath, 'utf-8');

        if (extension === '.vtt') {
            return extractVttDuration(content);
        } else if (extension === '.srt') {
            return extractSrtDuration(content);
        } else {
            console.warn(`[subtitleDurationParser] Unsupported subtitle format: ${extension}`);
            return 0;
        }
    } catch (error) {
        console.error(`[subtitleDurationParser] Error reading subtitle file ${filePath}:`, error.message);
        return 0;
    }
}

/**
 * Get subtitle duration from content string
 * Automatically detects format based on content
 * @param {string} content - Subtitle file content
 * @param {string} extension - File extension (.vtt or .srt)
 * @returns {number} Duration in seconds
 */
function getSubtitleDurationFromContent(content, extension) {
    const ext = extension.toLowerCase();

    if (ext === '.vtt') {
        return extractVttDuration(content);
    } else if (ext === '.srt') {
        return extractSrtDuration(content);
    } else {
        console.warn(`[subtitleDurationParser] Unsupported subtitle format: ${extension}`);
        return 0;
    }
}

export {
    extractVttDuration,
    extractSrtDuration,
    getSubtitleDuration,
    getSubtitleDurationFromContent,
    parseVttTimestamp,
    parseSrtTimestamp
};
