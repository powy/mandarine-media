#!/usr/bin/env node

const fs = require('fs').promises;
const { program } = require('commander');

const MediaAnalyzer = require('./index');
const Config = require('./config');

/**
 * CLI interface for media analyzer
 */
async function main() {
    // Configuration de la ligne de commande
    program
        .name('media-analyzer')
        .description('Analyse et associe automatiquement les fichiers vidéo, sous-titres et images')
        .version('1.0.0')
        .argument('[path]', 'Chemin du dossier à analyser (mode legacy)')
        .option('-v, --video-path <path>', 'Chemin du dossier contenant les vidéos')
        .option('-s, --subtitle-path <path>', 'Chemin du dossier contenant les sous-titres')
        .option('-i, --image-path <path>', 'Chemin du dossier contenant les images')
        .option('-o, --output <file>', 'Fichier de sortie JSON')
        .option('--verbose', 'Mode verbose pour plus de détails')
        .option('--min-score <score>', 'Score minimum pour l\'association (défaut: 60)', parseInt)
        .option('--no-metadata', 'Ne pas lire les métadonnées vidéo (plus rapide)')
        .option('--export-for-upload', 'Format optimisé pour l\'upload')
        .parse();
    
    const options = program.opts();
    const [legacyPath] = program.args;
    
    // Determine if using new multi-path mode or legacy single path
    let analyzePaths;
    if (options.videoPath || options.subtitlePath || options.imagePath) {
        // New multi-path mode
        analyzePaths = {
            videoPath: options.videoPath,
            subtitlePath: options.subtitlePath,
            imagePath: options.imagePath
        };
        
        if (!options.videoPath && !options.subtitlePath && !options.imagePath) {
            console.error('❌ At least one path must be specified when using separate folder options');
            process.exit(1);
        }
    } else if (legacyPath) {
        // Legacy single path mode
        analyzePaths = legacyPath;
    } else {
        console.error('❌ You must specify either a single path or use the separate folder options');
        console.error('\nExamples:');
        console.error('  Legacy mode: media-analyzer /path/to/media');
        console.error('  New mode:    media-analyzer -v /videos -s /subtitles -i /images');
        process.exit(1);
    }
    
    // Configurer le logging
    if (options.verbose) {
        // Note: We would need to import and configure the logger here
        // For now, this is a placeholder
        process.env.LOG_LEVEL = 'debug';
    }
    
    // Créer la configuration
    const config = new Config();
    if (options.minScore) {
        config.MIN_MATCH_SCORE = options.minScore;
    }
    
    // Créer l'analyseur
    const analyzer = new MediaAnalyzer(config);
    
    try {
        // Options d'analyse
        const analyzeOptions = {
            readMetadata: options.metadata !== false
        };
        
        // Lancer l'analyse
        const outputFile = await analyzer.analyzeAndSave(analyzePaths, options.output, analyzeOptions);
        
        // Afficher le résumé
        const result = JSON.parse(await fs.readFile(outputFile, 'utf8'));
        
        console.log('\n✅ Analyse terminée avec succès!');
        console.log(`📄 Résultats sauvegardés dans: ${outputFile}`);
        
        console.log('\n📊 Résumé:');
        console.log(`  - Type de média: ${result.media_type}`);
        console.log(`  - Structure: ${result.structure_type}`);
        console.log(`  - Vidéos trouvées: ${result.statistics.total_videos}`);
        console.log(`  - Sous-titres: ${result.statistics.total_subtitles} (${result.statistics.matched_subtitles} associés)`);
        console.log(`  - Images: ${result.statistics.total_images}`);
        
        if (result.statistics.languages_found.length > 0) {
            console.log(`  - Langues détectées: ${result.statistics.languages_found.join(', ')}`);
        }
        
        if (result.unmatched_files.subtitles.length > 0) {
            console.log(`\n⚠️  ${result.unmatched_files.subtitles.length} sous-titres non associés`);
        }
        
        // Display validation results
        if (result.validation && result.validation.summary.total_issues > 0) {
            console.log(`\n🔍 Validation Issues Found:`);
            console.log(`  - Total Issues: ${result.validation.summary.total_issues}`);
            console.log(`  - Critical: ${result.validation.summary.critical_issues}`);
            console.log(`  - Warnings: ${result.validation.summary.warnings}`);
            
            if (result.validation.images.videos_without_images.length > 0) {
                console.log(`\n🔴 Critical: ${result.validation.images.videos_without_images.length} videos without images`);
            }
            
            if (result.validation.subtitles.missing_french.length > 0) {
                console.log(`🔴 Critical: ${result.validation.subtitles.missing_french.length} videos missing French subtitles`);
            }
            
            if (result.validation.episodes.missing_episodes.filter(ep => ep.type === 'confirmed_missing').length > 0) {
                const confirmedMissing = result.validation.episodes.missing_episodes.filter(ep => ep.type === 'confirmed_missing').length;
                console.log(`🔴 Critical: ${confirmedMissing} confirmed missing episodes`);
            }
            
            console.log(`\n📋 See detailed validation report in the JSON file.`);
        } else if (result.validation) {
            console.log(`\n✅ No validation issues found - all content appears complete!`);
        }
        
        // Format pour upload si demandé
        if (options.exportForUpload) {
            const uploadFormat = {
                uploads: []
            };
            
            for (const item of result.media_items) {
                // Ajouter la vidéo
                uploadFormat.uploads.push({
                    type: 'video',
                    path: item.video.filepath,
                    metadata: {
                        episode: item.episode_number,
                        season: item.season_number,
                        title: item.title
                    }
                });
                
                // Ajouter les sous-titres
                for (const sub of item.subtitles) {
                    uploadFormat.uploads.push({
                        type: 'subtitle',
                        path: sub.filepath,
                        language: sub.language_code,
                        video_ref: item.video.filepath
                    });
                }
            }
            
            const uploadFile = outputFile.replace('.json', '_upload.json');
            await fs.writeFile(uploadFile, JSON.stringify(uploadFormat, null, 2), 'utf8');
            console.log(`\n📤 Format upload sauvegardé dans: ${uploadFile}`);
        }
        
    } catch (err) {
        console.error(`\n❌ Erreur lors de l'analyse: ${err.message}`);
        if (options.verbose) {
            console.error(err.stack);
        }
        process.exit(1);
    }
}

// Export for programmatic usage
module.exports = {
    MediaAnalyzer,
    Config,
    main
};

// Point d'entrée si exécuté directement
if (require.main === module) {
    main().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}