# Media Analyzer Tool - Node.js Version 🎬

Un outil Node.js puissant pour analyser et associer automatiquement les fichiers vidéo, sous-titres et images dans vos dossiers média. Optimisé pour être compilé en exécutable Windows standalone.

## 📋 Table des matières

- [Pourquoi Node.js ?](#-pourquoi-nodejs-)
- [Fonctionnalités](#-fonctionnalités)
- [Installation](#-installation)
- [Utilisation](#-utilisation)
- [Compilation en .exe](#-compilation-en-exe)
- [Format de sortie](#-format-de-sortie)
- [Configuration](#-configuration)
- [API JavaScript](#-api-javascript)
- [Intégration avec outils d'upload](#-intégration-avec-outils-dupload)
- [Dépendances](#-dépendances)
- [Structure supportée](#-structure-supportée)
- [Résolution des problèmes](#-résolution-des-problèmes)

## 🚀 Pourquoi Node.js ?

Cette version Node.js offre plusieurs avantages :

- **Exécutable Windows unique** : Compile en un seul .exe avec toutes les dépendances
- **FFmpeg embarqué** : Inclut FFmpeg/FFprobe directement dans l'exécutable
- **Intégration native** : S'intègre facilement avec vos outils d'upload JavaScript existants
- **Performance async** : Traitement parallèle natif avec l'event loop Node.js
- **Pas de dépendances externes** : Tout est bundlé dans l'exécutable

## ✨ Fonctionnalités

### Modes d'analyse
- **Mode legacy** : Analyse un dossier unique contenant tous types de fichiers
- **Mode multi-dossiers** : Analyse des dossiers séparés pour vidéos, sous-titres et images
- **Mode hybride** : Peut analyser seulement certains types de dossiers

### Détection automatique
- **Type de média** : Série TV, film unique, collection de films
- **Structure du dossier** : Flat, par saison, par épisode, hybride
- **Patterns d'épisodes** : S01E01, 1x01, Episode 1, EP01, [01], Part 1, dates
- **Langues** : Codes ISO 639-1/2, noms complets, détection automatique

### Association intelligente
- **Scoring avancé** : Algorithme de matching précis (score configurable)
- **Multi-formats** : Conserve tous les formats pour chaque langue
- **Images** : Différencie images globales vs par épisode
- **Tags spéciaux** : Forced, SDH, Commentary

### Métadonnées vidéo (via FFmpeg)
- Durée, résolution, codec, bitrate
- FFmpeg/FFprobe embarqués dans l'exécutable
- Optionnel pour performance

### Export optimisé
- Format JSON détaillé
- Mode export pour upload
- Statistiques complètes
- Liste des fichiers non matchés

### Avantages du mode multi-dossiers
- **Organisation flexible** : Vos médias peuvent être organisés dans des dossiers séparés
- **Performance améliorée** : Scan seulement les dossiers nécessaires
- **Sécurité** : Accès en lecture seule aux dossiers spécifiques
- **Intégration facile** : Compatible avec les structures de stockage existantes
- **Évolutif** : Ajoutez facilement de nouveaux dossiers de médias

## 📦 Installation

### Prérequis
- Node.js 16+ (pour développement)
- npm ou yarn

### Installation pour développement

```bash
# Cloner le repository
git clone https://github.com/yourusername/media-analyzer-node.git
cd media-analyzer-node

# Installer les dépendances
npm install
```

### Dépendances nécessaires

```json
{
  "dependencies": {
    "commander": "^11.0.0",
    "glob-promise": "^6.0.0",
    "glob": "^10.0.0",
    "string-similarity": "^4.0.4",
    "fluent-ffmpeg": "^2.1.2",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "ffmpeg-static": "^5.2.0",
    "ffprobe-static": "^3.1.0",
    "pkg": "^5.8.0"
  }
}
```

### Installation rapide

```bash
# Package.json complet
cat > package.json << 'EOF'
{
  "name": "media-analyzer",
  "version": "1.0.0",
  "description": "Media file analyzer and associator",
  "main": "media-analyzer.js",
  "bin": {
    "media-analyzer": "./media-analyzer.js"
  },
  "scripts": {
    "start": "node media-analyzer.js",
    "build:exe": "pkg . --targets node18-win-x64 --output dist/media-analyzer.exe",
    "build:all": "pkg . --targets node18-win-x64,node18-linux-x64,node18-macos-x64 --out-path dist"
  },
  "pkg": {
    "assets": [
      "node_modules/ffmpeg-static/**/*",
      "node_modules/ffprobe-static/**/*"
    ],
    "outputPath": "dist"
  },
  "dependencies": {
    "commander": "^11.0.0",
    "glob-promise": "^6.0.0",
    "glob": "^10.0.0",
    "string-similarity": "^4.0.4",
    "fluent-ffmpeg": "^2.1.2",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "ffmpeg-static": "^5.2.0",
    "ffprobe-static": "^3.1.0",
    "pkg": "^5.8.0"
  }
}
EOF

npm install
```

## 🚀 Utilisation

### Ligne de commande

#### Utilisation basique (mode legacy)
```bash
node media-analyzer.js /chemin/vers/media
```

#### Nouveau mode avec dossiers séparés
```bash
# Spécifier des dossiers séparés pour chaque type de fichier
node media-analyzer.js -v /chemin/vers/videos -s /chemin/vers/subtitles -i /chemin/vers/images

# Vous pouvez aussi spécifier seulement certains dossiers
node media-analyzer.js -v /chemin/vers/videos -s /chemin/vers/subtitles

# Ou seulement les vidéos
node media-analyzer.js -v /chemin/vers/videos
```

#### Avec options
```bash
# Mode legacy avec options
node media-analyzer.js /chemin/vers/media -o analyse.json --verbose

# Mode dossiers séparés avec options
node media-analyzer.js -v /videos -s /subtitles -i /images -o analyse.json --verbose

# Sans métadonnées (plus rapide)
node media-analyzer.js -v /videos -s /subtitles --no-metadata

# Score de matching personnalisé
node media-analyzer.js -v /videos -s /subtitles --min-score 40

# Format optimisé pour upload
node media-analyzer.js -v /videos -s /subtitles --export-for-upload
```

### Utilisation de l'exécutable Windows

```batch
REM Analyse simple (mode legacy)
media-analyzer.exe "C:\Videos\Series\Breaking Bad"

REM Nouveau mode avec dossiers séparés
media-analyzer.exe -v "C:\Videos" -s "C:\Subtitles" -i "C:\Images"

REM Seulement vidéos et sous-titres
media-analyzer.exe -v "D:\Videos" -s "D:\Subs"

REM Avec options
media-analyzer.exe -v "C:\Videos" -s "C:\Subtitles" -o films.json --verbose

REM Export pour upload
media-analyzer.exe -v "E:\Videos" -s "E:\Subs" --export-for-upload
```

## 🔨 Compilation en .exe

### Méthode 1 : pkg (Recommandé)

```bash
# Installer pkg globalement
npm install -g pkg

# Compiler pour Windows x64
pkg media-analyzer.js --targets node18-win-x64 --output media-analyzer.exe

# Ou utiliser le script npm
npm run build:exe
```

### Méthode 2 : nexe

```bash
# Installer nexe
npm install -g nexe

# Compiler
nexe media-analyzer.js -t windows-x64-18.0.0 -o media-analyzer.exe
```

### Méthode 3 : Avec toutes les plateformes

```bash
npm run build:all
# Génère dans dist/ :
# - media-analyzer-win.exe (Windows)
# - media-analyzer-linux (Linux)
# - media-analyzer-macos (macOS)
```

### Notes importantes pour l'exe

1. **FFmpeg embarqué** : L'exécutable inclut FFmpeg/FFprobe (~50MB supplémentaires)
2. **Taille finale** : ~60-80MB selon les optimisations
3. **Antivirus** : Certains antivirus peuvent détecter l'exe comme suspect (faux positif)
4. **Performance** : Légèrement plus lent au démarrage que le script Node.js

## 📊 Format de sortie

### Format standard

```json
{
  "analysis_date": "2024-01-15T10:30:00.000Z",
  "root_path": "C:\\Media\\Series",
  "media_type": "series",
  "structure_type": "by_season",
  "global_images": [
    {
      "filepath": "C:\\Media\\Series\\poster.jpg",
      "filename": "poster.jpg",
      "type": "poster",
      "size": 245632
    }
  ],
  "media_items": [
    {
      "episode_number": 1,
      "season_number": 1,
      "title": "Breaking Bad",
      "video": {
        "filepath": "C:\\Media\\Series\\S01E01.mkv",
        "filename": "S01E01.mkv",
        "size": 1234567890,
        "duration": 2820.5,
        "resolution": [1920, 1080],
        "codec": "h264",
        "bitrate": 3500000
      },
      "subtitles": [
        {
          "filepath": "C:\\Media\\Series\\S01E01.en.srt",
          "filename": "S01E01.en.srt",
          "language_code": "en",
          "language_name": "English",
          "format": "srt",
          "is_forced": false,
          "is_sdh": false,
          "is_commentary": false,
          "size": 45632
        }
      ],
      "images": []
    }
  ],
  "statistics": {
    "total_videos": 10,
    "total_subtitles": 20,
    "total_images": 5,
    "matched_subtitles": 18,
    "unmatched_subtitles": 2,
    "languages_found": ["en", "fr"],
    "subtitle_formats": ["srt", "vtt"]
  },
  "unmatched_files": {
    "subtitles": [],
    "images": []
  }
}
```

### Format pour upload (--export-for-upload)

```json
{
  "uploads": [
    {
      "type": "video",
      "path": "C:\\Media\\Series\\S01E01.mkv",
      "metadata": {
        "episode": 1,
        "season": 1,
        "title": "Breaking Bad"
      }
    },
    {
      "type": "subtitle",
      "path": "C:\\Media\\Series\\S01E01.en.srt",
      "language": "en",
      "video_ref": "C:\\Media\\Series\\S01E01.mkv"
    }
  ]
}
```

## ⚙️ Configuration

### Via code JavaScript

```javascript
const { MediaAnalyzer, Config } = require('./media-analyzer');

// Configuration personnalisée
const config = new Config();

// Ajouter des extensions
config.VIDEO_EXTENSIONS.add('.m2ts');
config.SUBTITLE_EXTENSIONS.add('.sbv');
config.IMAGE_EXTENSIONS.add('.avif');

// Ajuster les seuils
config.MIN_MATCH_SCORE = 50;
config.SIMILARITY_THRESHOLD = 0.6;

// Ajouter des langues
config.LANGUAGE_CODES['pt-br'] = 'Brazilian Portuguese';

// Créer l'analyseur avec config
const analyzer = new MediaAnalyzer(config);
```

## 🔧 API JavaScript

### Utilisation basique

```javascript
const { MediaAnalyzer } = require('./media-analyzer');

async function analyzeMedia() {
    const analyzer = new MediaAnalyzer();
    
    // Analyse simple (mode legacy)
    const result = await analyzer.analyze('C:\\Media\\Series');
    
    // Nouveau mode avec dossiers séparés
    const resultMultiPath = await analyzer.analyze({
        videoPath: 'C:\\Videos',
        subtitlePath: 'C:\\Subtitles',
        imagePath: 'C:\\Images'
    });
    
    console.log(`Type: ${result.media_type}`);
    console.log(`Videos: ${result.statistics.total_videos}`);
    
    // Sauvegarder (mode legacy)
    await analyzer.analyzeAndSave('C:\\Media\\Series', 'output.json');
    
    // Sauvegarder (nouveau mode)
    await analyzer.analyzeAndSave({
        videoPath: 'C:\\Videos',
        subtitlePath: 'C:\\Subtitles',
        imagePath: 'C:\\Images'
    }, 'multi-path-output.json');
}

analyzeMedia();
```

### Utilisation avancée

```javascript
const { 
    MediaAnalyzer, 
    Config,
    FileScanner,
    NameParser 
} = require('./media-analyzer');

async function advancedAnalysis() {
    // Scanner uniquement
    const scanner = new FileScanner();
    const files = await scanner.scanDirectory('C:\\Media');
    
    // Parser des noms
    const parser = new NameParser();
    for (const video of files.videos) {
        const info = parser.parseEpisodeInfo(video.filename);
        console.log(`${video.filename}: S${info.season}E${info.episode}`);
    }
    
    // Analyse complète avec options
    const analyzer = new MediaAnalyzer();
    const result = await analyzer.analyze('C:\\Media', {
        readMetadata: true  // Lire les métadonnées FFmpeg
    });
    
    // Traiter les résultats
    for (const item of result.media_items) {
        console.log(`Episode ${item.episode_number}:`);
        console.log(`  Video: ${item.video.filename}`);
        console.log(`  Subtitles: ${item.subtitles.length}`);
        
        for (const sub of item.subtitles) {
            console.log(`    - ${sub.language_name} (${sub.format})`);
        }
    }
}
```

## 🔗 Intégration avec outils d'upload

### Exemple d'intégration

```javascript
// uploader.js
const { MediaAnalyzer } = require('./media-analyzer');
const { uploadVideo, uploadSubtitle } = require('./your-upload-tools');

async function analyzeAndUpload(folderPath) {
    const analyzer = new MediaAnalyzer();
    
    // Analyser
    const result = await analyzer.analyze(folderPath);
    
    // Upload chaque vidéo et ses sous-titres
    for (const item of result.media_items) {
        // Upload vidéo
        const videoId = await uploadVideo({
            file: item.video.filepath,
            metadata: {
                title: item.title,
                season: item.season_number,
                episode: item.episode_number,
                duration: item.video.duration
            }
        });
        
        // Upload sous-titres associés
        for (const subtitle of item.subtitles) {
            await uploadSubtitle({
                file: subtitle.filepath,
                videoId: videoId,
                language: subtitle.language_code,
                isSDH: subtitle.is_sdh,
                isForced: subtitle.is_forced
            });
        }
    }
    
    // Upload images globales
    for (const image of result.global_images) {
        await uploadImage({
            file: image.filepath,
            type: image.type
        });
    }
}

// Utilisation
analyzeAndUpload('C:\\Media\\Series\\BreakingBad')
    .then(() => console.log('Upload completed!'))
    .catch(err => console.error('Error:', err));
```

### Pipeline automatisé

```javascript
// pipeline.js
const { MediaAnalyzer } = require('./media-analyzer');
const chokidar = require('chokidar');

// Surveiller un dossier
const watcher = chokidar.watch('C:\\Media\\Incoming', {
    persistent: true,
    ignoreInitial: true
});

watcher.on('add', async (path) => {
    if (path.endsWith('.mkv') || path.endsWith('.mp4')) {
        console.log(`New video detected: ${path}`);
        
        const analyzer = new MediaAnalyzer();
        const dir = path.dirname(path);
        
        // Attendre un peu pour que tous les fichiers soient copiés
        setTimeout(async () => {
            const result = await analyzer.analyze(dir);
            
            // Déclencher l'upload
            await processUploads(result);
        }, 5000);
    }
});
```

## 📚 Dépendances

### Dépendances de production

| Package | Version | Description | Taille |
|---------|---------|-------------|--------|
| `commander` | ^11.0.0 | Interface CLI | ~50KB |
| `glob` | ^10.0.0 | Scan de fichiers | ~60KB |
| `glob-promise` | ^6.0.0 | Wrapper async pour glob | ~5KB |
| `string-similarity` | ^4.0.4 | Calcul de similarité | ~10KB |
| `fluent-ffmpeg` | ^2.1.2 | Interface FFmpeg | ~100KB |
| `winston` | ^3.11.0 | Logging avancé | ~200KB |

### Dépendances de développement

| Package | Version | Description | Taille |
|---------|---------|-------------|--------|
| `ffmpeg-static` | ^5.2.0 | FFmpeg binaire | ~80MB |
| `ffprobe-static` | ^3.1.0 | FFprobe binaire | ~40MB |
| `pkg` | ^5.8.0 | Compilateur exe | ~50MB |

### Taille finale

- **Script Node.js** : ~500KB (sans node_modules)
- **node_modules** : ~150MB (avec FFmpeg)
- **Exécutable Windows** : ~60-80MB (tout inclus)

## 🏗️ Structure supportée

L'outil reconnaît automatiquement :

### Formats vidéo
MP4, MKV, AVI, MOV, WMV, FLV, WebM, M4V, MPG, MPEG, M2TS, TS, VOB, 3GP

### Formats sous-titres
SRT, VTT, ASS, SSA, SUB, IDX, SMI, TTML, SBV, DFXP

### Formats images
JPG, JPEG, PNG, WebP, BMP, GIF, TIFF, SVG

### Structures de dossiers
- **Flat** : Tous les fichiers au même niveau
- **By Season** : Organisation Season 1/, Season 2/
- **By Episode** : Un dossier par épisode
- **Hybrid** : Dossiers Videos/, Subtitles/, Images/

### Patterns de numérotation
- S01E01, S1E1
- 1x01, 01x01
- Episode 1, Ep 1, EP01
- E01, e01
- [01], [001]
- Part 1, Partie 1
- 2024-01-15 (dates)

## 🔧 Résolution des problèmes

### L'exécutable est détecté comme virus

**Solution** : Ajouter une exception dans votre antivirus. C'est un faux positif courant avec les exécutables Node.js.

### FFmpeg non trouvé

**Solution** : L'outil utilise FFmpeg embarqué. Si erreur, installer FFmpeg système :
```bash
# Windows (avec Chocolatey)
choco install ffmpeg

# Ou télécharger depuis https://ffmpeg.org
```

### Erreur de mémoire avec gros dossiers

**Solution** : Augmenter la mémoire Node :
```bash
node --max-old-space-size=4096 media-analyzer.js /path
```

### Sous-titres non associés

**Solutions** :
1. Réduire le score minimum : `--min-score 30`
2. Vérifier les noms de fichiers
3. Ajouter les codes de langue dans les noms

### Performance lente

**Solutions** :
1. Désactiver la lecture des métadonnées : `--no-metadata`
2. Limiter la profondeur de scan
3. Utiliser le mode async pour les gros volumes

### Caractères spéciaux dans les noms

**Solution** : L'outil gère UTF-8. Pour Windows, s'assurer que la console supporte UTF-8 :
```batch
chcp 65001
media-analyzer.exe "C:\Médias\Séries"
```

## 📊 Benchmarks

### Performance comparée

| Nombre de fichiers | Avec métadonnées | Sans métadonnées |
|-------------------|------------------|------------------|
| 100 fichiers | ~5 secondes | ~1 seconde |
| 1000 fichiers | ~45 secondes | ~5 secondes |
| 10000 fichiers | ~7 minutes | ~30 secondes |

### Optimisations

```javascript
// Pour de gros volumes, utiliser le streaming
const analyzer = new MediaAnalyzer();

// Traiter par batch
async function analyzeLargeLibrary(rootPath) {
    const scanner = new FileScanner();
    const files = await scanner.scanDirectory(rootPath);
    
    // Diviser en batches
    const batchSize = 100;
    const results = [];
    
    for (let i = 0; i < files.videos.length; i += batchSize) {
        const batch = files.videos.slice(i, i + batchSize);
        // Traiter le batch
        const batchResult = await processBatch(batch);
        results.push(...batchResult);
    }
    
    return results;
}
```

## 🎯 Cas d'usage

### 1. Organisation de bibliothèque média

```javascript
const analyzer = new MediaAnalyzer();

async function organizeLibrary(path) {
    const result = await analyzer.analyze(path);
    
    // Identifier les fichiers mal nommés
    const poorlyNamed = result.media_items.filter(item => 
        !item.episode_number || !item.season_number
    );
    
    // Identifier les sous-titres manquants
    const missingSubtitles = result.media_items.filter(item =>
        item.subtitles.length === 0
    );
    
    console.log(`Fichiers mal nommés: ${poorlyNamed.length}`);
    console.log(`Vidéos sans sous-titres: ${missingSubtitles.length}`);
}
```

### 2. Préparation pour streaming

```javascript
async function prepareForStreaming(path) {
    const analyzer = new MediaAnalyzer();
    const result = await analyzer.analyze(path, { readMetadata: true });
    
    for (const item of result.media_items) {
        const video = item.video;
        
        // Vérifier la compatibilité
        if (video.codec !== 'h264' || video.resolution[0] > 1920) {
            console.log(`Needs transcoding: ${video.filename}`);
            console.log(`  Current: ${video.codec} ${video.resolution.join('x')}`);
            
            // Déclencher le transcodage
            await transcodeVideo(video.filepath);
        }
        
        // Vérifier les sous-titres
        const hasEnglish = item.subtitles.some(s => s.language_code === 'en');
        if (!hasEnglish) {
            console.log(`Missing English subtitles: ${video.filename}`);
        }
    }
}
```

### 3. Génération de rapports

```javascript
async function generateReport(path) {
    const analyzer = new MediaAnalyzer();
    const result = await analyzer.analyze(path);
    
    const report = {
        date: new Date().toISOString(),
        summary: {
            totalSize: 0,
            totalDuration: 0,
            languages: new Set(),
            resolutions: new Set(),
            codecs: new Set()
        },
        series: {},
        issues: []
    };
    
    for (const item of result.media_items) {
        // Calculer les stats
        report.summary.totalSize += item.video.size;
        if (item.video.duration) {
            report.summary.totalDuration += item.video.duration;
        }
        
        // Collecter les métadonnées
        if (item.video.resolution) {
            report.summary.resolutions.add(item.video.resolution.join('x'));
        }
        if (item.video.codec) {
            report.summary.codecs.add(item.video.codec);
        }
        
        // Langues
        item.subtitles.forEach(sub => {
            report.summary.languages.add(sub.language_code);
        });
        
        // Grouper par série
        const seriesName = item.title || 'Unknown';
        if (!report.series[seriesName]) {
            report.series[seriesName] = {
                episodes: 0,
                seasons: new Set()
            };
        }
        report.series[seriesName].episodes++;
        if (item.season_number) {
            report.series[seriesName].seasons.add(item.season_number);
        }
    }
    
    // Convertir les Sets en arrays
    report.summary.languages = Array.from(report.summary.languages);
    report.summary.resolutions = Array.from(report.summary.resolutions);
    report.summary.codecs = Array.from(report.summary.codecs);
    
    // Sauvegarder le rapport
    await fs.writeFile('media_report.json', JSON.stringify(report, null, 2));
    console.log('Report generated: media_report.json');
}
```

## 🔐 Sécurité

### Permissions fichiers

L'outil nécessite uniquement des permissions de lecture :
- ✅ Lecture des fichiers et dossiers
- ❌ Pas de modification de fichiers
- ❌ Pas d'accès réseau
- ❌ Pas d'accès au registre Windows

### Validation des entrées

```javascript
// L'outil valide automatiquement les chemins
const analyzer = new MediaAnalyzer();

// Tentative avec chemin invalide
try {
    await analyzer.analyze('../../../etc/passwd');
} catch (error) {
    // Erreur : Path is not a directory
}
```

## 🤝 Contribution

### Structure du projet

```
media-analyzer-node/
├── media-analyzer.js      # Code principal
├── package.json           # Dépendances
├── README.md             # Documentation
├── .gitignore            # Fichiers ignorés
├── examples/             # Exemples d'utilisation
│   ├── basic.js         # Exemple basique
│   ├── upload.js        # Intégration upload
│   └── watch.js         # Surveillance dossier
├── test/                # Tests
│   ├── fixtures/        # Fichiers de test
│   └── analyzer.test.js # Tests unitaires
└── dist/               # Exécutables compilés
    ├── media-analyzer-win.exe
    ├── media-analyzer-linux
    └── media-analyzer-macos
```

### Tests

```bash
# Installer les dépendances de test
npm install --save-dev mocha chai

# Lancer les tests
npm test

# Tests avec couverture
npm run test:coverage
```

### Build automatisé

```json
// package.json
{
  "scripts": {
    "test": "mocha test/**/*.test.js",
    "build": "npm run build:exe",
    "build:exe": "pkg . --targets node18-win-x64 --output dist/media-analyzer.exe",
    "build:all": "pkg . --targets node18-win-x64,node18-linux-x64,node18-macos-x64 --out-path dist",
    "release": "npm test && npm run build:all"
  }
}
```

## 🚀 Déploiement

### Distribution de l'exécutable

1. **Compilation** :
```bash
npm run build:exe
```

2. **Test de l'exe** :
```bash
dist\media-analyzer.exe --version
dist\media-analyzer.exe "C:\Test\Media" -o test.json
```

3. **Packaging pour distribution** :
```batch
REM Créer un zip avec l'exe et la doc
7z a media-analyzer-v1.0.0-win64.zip dist\media-analyzer.exe README.md

REM Ou installer avec setup
makensis installer.nsi
```

### Installation sur poste utilisateur

```batch
REM Copier l'exe
copy media-analyzer.exe C:\Tools\

REM Ajouter au PATH (optionnel)
setx PATH "%PATH%;C:\Tools"

REM Utilisation
media-analyzer "D:\Videos" -o analyse.json
```

### Intégration dans un workflow

```batch
@echo off
REM batch_analyze.bat

echo Analyse des médias en cours...

REM Analyser plusieurs dossiers
for %%D in ("D:\Series" "E:\Films" "F:\Animes") do (
    echo.
    echo Analyse de %%D
    media-analyzer.exe %%D -o "%%~nD_analysis.json" --no-metadata
)

echo.
echo Analyses terminées !
pause
```

## 📝 Changelog

### Version 1.0.0 (2024-01-15)
- ✨ Version initiale Node.js
- ✨ Support compilation en .exe
- ✨ FFmpeg embarqué
- ✨ Detection série/film automatique
- ✨ Association multi-langues
- ✨ Export pour upload
- ✨ Mode sans métadonnées pour performance

### Roadmap v1.1.0
- 🔄 Interface graphique Electron (optionnelle)
- 🔄 Support base de données SQLite
- 🔄 API REST pour intégration
- 🔄 Support TMDB/TVDB pour métadonnées
- 🔄 Renommage automatique
- 🔄 Détection de doublons

## 📄 Licence

MIT License - Voir le fichier LICENSE pour plus de détails.

## 🙏 Support

Pour toute question ou problème :
1. Consultez d'abord cette documentation
2. Vérifiez les [issues GitHub](https://github.com/yourusername/media-analyzer-node/issues)
3. Créez une nouvelle issue avec :
   - Version de l'outil
   - Système d'exploitation
   - Message d'erreur complet
   - Structure de dossier exemple

## ⚡ Quick Start

```bash
# 1. Télécharger le projet
git clone https://github.com/yourusername/media-analyzer-node.git
cd media-analyzer-node

# 2. Installer les dépendances
npm install

# 3. Tester sur un dossier
node media-analyzer.js "C:\Mes Videos" -o test.json

# 4. Compiler en exe
npm run build:exe

# 5. Utiliser l'exe
dist\media-analyzer.exe "C:\Mes Videos"
```

---

**Note** : Cet outil est conçu pour un usage personnel. Respectez toujours les droits d'auteur et les conditions d'utilisation des contenus que vous analysez.