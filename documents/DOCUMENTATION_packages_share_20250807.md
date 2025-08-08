
# Documentation du Package Share - KYOOL Media

## Vue d'ensemble

Le package `share` est une bibliothèque TypeScript conçue pour regrouper toutes les fonctions communes aux différents frontends React.js et React Native de la plateforme KYOOL Media. Il contient principalement **toute l'API de communication avec le serveur**, ainsi que des hooks React, des utilitaires et des types partagés.

## 🏗️ Architecture

```
packages/share/
├── src/
│   ├── api/           # 📡 Modules d'API serveur
│   ├── hooks/         # 🎣 Hooks React personnalisés
│   ├── types/         # 📝 Définitions TypeScript
│   ├── utils/         # 🛠️ Utilitaires
│   ├── components/    # 🎨 Composants partagés (vide pour l'instant)
│   └── index.ts       # Point d'entrée principal
├── dist/              # 📦 Build de distribution
├── package.json       # Configuration du package
└── README.md          # Documentation basique
```

## 🚀 Installation et Configuration

### 1. Installation
Le package est privé et géré par NX. Il s'installe automatiquement comme dépendance locale.

### 2. Configuration de l'API
```typescript
import { initApiClient } from 'share';

// Configuration requise au démarrage de l'application
initApiClient({
  baseURL: 'http://localhost:8000', // URL du serveur API
  onAuthError: () => {
    // Gestionnaire d'erreur d'authentification
    // Rediriger vers login, par exemple
  }
});
```

### 3. Configuration du Storage (optionnelle)
```typescript
import { initStorage } from 'share';

// Pour React Native avec AsyncStorage
initStorage(AsyncStorage);

// Pour React.js, utilise localStorage par défaut
```

---

## 📡 API - Communication Serveur

Le package contient **14 modules API** avec plus de **80 fonctions** couvrant toutes les opérations CRUD et fonctionnalités spécialisées.

### 🔐 Authentification (`authApi`)

#### Connexion/Déconnexion
```typescript
import { authApi } from 'share';

// Connexion
const tokens = await authApi.login({ 
  email: 'user@example.com', 
  password: 'password' 
});

// Vérifier l'authentification
const isAuth = await authApi.isAuthenticated();

// Récupérer l'utilisateur actuel
const user = await authApi.getCurrentUser();

// Déconnexion
await authApi.logout();
```

#### Gestion des utilisateurs
```typescript
// Enregistrer un utilisateur (admin uniquement)
const newUser = await authApi.register({
  email: 'new@example.com',
  password: 'password',
  full_name: 'Nom Complet'
});

// Mettre à jour un utilisateur
const updatedUser = await authApi.updateUser(userId, { full_name: 'Nouveau nom' });
```

### 🎬 Gestion des Médias (`mediaApi`)

#### Descriptions de média
```typescript
import { mediaApi } from 'share';

// Récupérer toutes les descriptions avec filtres
const mediaList = await mediaApi.getMediaDescriptions({
  skip: 0,
  limit: 20,
  media_type: 'video',
  is_featured: true
});

// Récupérer une description spécifique
const media = await mediaApi.getMediaDescription(mediaId);

// Créer une nouvelle description
const newMedia = await mediaApi.createMediaDescription({
  file_number: 1,
  episode_title: 'Episode 1',
  media_type: 'video',
  description: 'Description...'
});

// Mettre à jour
const updatedMedia = await mediaApi.updateMediaDescription(mediaId, {
  episode_title: 'Nouveau titre'
});
```

#### Fichiers vidéo
```typescript
// Récupérer les fichiers vidéo
const videoFiles = await mediaApi.getVideoFiles({ limit: 10 });

// Upload d'un fichier
const result = await mediaApi.uploadVideoFile(file);

// Créer avec URL existante
const videoFile = await mediaApi.createVideoFileWithExistingUrl({
  file_name: 'video.mp4',
  external_url: 'https://example.com/video.mp4',
  media_description_id: mediaId
});

// Test de lecture
const playbackResult = await mediaApi.testVideoFilePlayback(fileId);
```

#### Médias populaires
```typescript
// Récupérer les médias mis en avant
const featured = await mediaApi.getFeaturedMedia(0, 10);

// Récupérer les médias tendances
const trending = await mediaApi.getTrendingMedia(0, 10);

// Interactions utilisateur
await mediaApi.likeMedia(mediaId);
await mediaApi.shareMedia(mediaId);
```

### 📚 Structure de Contenu

#### Programmes (`programsApi`)
```typescript
import { programsApi } from 'share';

// Récupérer tous les programmes
const programs = await programsApi.getAll({ skip: 0, limit: 20 });

// Créer un programme
const program = await programsApi.create({
  program_name: 'Nouveau Programme',
  general_media_description: 'Description...'
});

// Récupérer un programme par ID
const program = await programsApi.getById(programId);
```

#### Saisons (`seasonsApi`)
```typescript
import { seasonsApi } from 'share';

// Récupérer toutes les saisons d'un programme
const seasons = await seasonsApi.getAll({ program_id: programId });

// Créer une saison
const season = await seasonsApi.create({
  program_id: programId,
  season_number: 1
});
```

### 🌍 Données de Référence

#### Pays, Territoires, Langues
```typescript
import { countriesApi, territoriesApi, languagesApi } from 'share';

// Pays
const countries = await countriesApi.getAll({ limit: 100 });
const country = await countriesApi.create({ name: 'France' });

// Territoires
const territories = await territoriesApi.getAll({ country_id: countryId });

// Langues
const languages = await languagesApi.getAll({ limit: 50 });
const language = await languagesApi.create({ 
  name: 'Français', 
  sigle: 'FR' 
});
```

#### Images (`picturesApi`)
```typescript
import { picturesApi } from 'share';

const pictures = await picturesApi.getAll({ limit: 20 });
const picture = await picturesApi.create({
  photo_url: 'https://example.com/image.jpg',
  alt_text: 'Description de l\'image'
});
```

#### Personnalités (`personsApi`)
```typescript
import { personsApi } from 'share';

// Récupérer toutes les personnalités
const persons = await personsApi.getPublicPersons({ skip: 0, limit: 20 });

// Créer une personnalité
const person = await personsApi.createPublicPerson({
  stage_name_roman: 'John Doe',
  profession_list: ['actor', 'director']
});

// Recherche par nom
const results = await personsApi.searchPublicPersonsByName('John');
```

### 📋 Listes et Organisation

#### Listes de Catégories (`categoryListsApi`)
```typescript
import { categoryListsApi } from 'share';

// Récupérer toutes les listes de catégories
const lists = await categoryListsApi.getCategoryLists({ active_only: true });

// Créer une liste de catégorie
const list = await categoryListsApi.createCategoryList({
  name: 'films_populaires',
  title: 'Films Populaires',
  description: 'Les films les plus regardés'
});

// Ajouter un élément à la liste
const item = await categoryListsApi.createCategoryListItem(listId, {
  title: 'Film 1',
  media_description_id: mediaId,
  display_order: 1
});

// Récupérer le JSON d'une liste (pour l'affichage client)
const listJSON = await categoryListsApi.getCategoryListJSON(listName);
```

#### Listes de Contenu (`contentListsApi`)
```typescript
import { getContentLists, createContentList } from 'share';

// Récupérer les listes de contenu
const contentLists = await getContentLists({ is_active: true });

// Créer une liste de contenu
const contentList = await createContentList({
  title: 'Recommandations',
  thumbnail_format: 'medium_portrait',
  is_active: true,
  display_order: 1
});
```

### 📊 Rapports

#### Rapports de Fichiers Vidéo (`videoFileReportsApi`)
```typescript
import { videoFileReportsApi } from 'share';

// Récupérer tous les rapports
const reports = await videoFileReportsApi.getReports({ 
  skip: 0, 
  limit: 20,
  event: 'upload' 
});

// Rapports pour un fichier spécifique
const fileReports = await videoFileReportsApi.getReportsByVideoFile(videoFileId);
```

---

## 🎣 Hooks React

Le package propose **5 hooks personnalisés** pour simplifier l'intégration dans les composants React.

### 🔐 `useAuth` - Authentification

Hook principal pour la gestion de l'authentification.

```typescript
import { useAuth } from 'share';

function LoginComponent() {
  const { 
    user,           // Utilisateur connecté ou null
    isAuthenticated, // Boolean d'authentification
    isLoadingUser,   // Chargement des données utilisateur
    isLoggingIn,     // Connexion en cours
    login,           // Fonction de connexion
    logout,          // Fonction de déconnexion
    loginError       // Erreur de connexion
  } = useAuth();

  const handleLogin = async () => {
    try {
      await login({ email: 'user@example.com', password: 'password' });
    } catch (error) {
      console.error('Erreur de connexion:', loginError);
    }
  };

  if (isLoadingUser) return <div>Chargement...</div>;
  
  return (
    <div>
      {isAuthenticated ? (
        <div>
          Bonjour {user?.full_name}!
          <button onClick={logout}>Déconnexion</button>
        </div>
      ) : (
        <button onClick={handleLogin} disabled={isLoggingIn}>
          {isLoggingIn ? 'Connexion...' : 'Se connecter'}
        </button>
      )}
    </div>
  );
}
```

### 📁 `useBulkDescriptions` - Import Excel

Hook pour gérer l'import en masse de descriptions depuis des fichiers Excel.

```typescript
import { useBulkDescriptions } from 'share';

function BulkUploadComponent() {
  const {
    parseExcelFile,        // Parser un fichier Excel
    createBulkDescriptions, // Créer les descriptions en masse
    generateTemplate,       // Générer un template Excel
    loading,               // État de chargement
    error,                 // Erreur éventuelle
    lastResult             // Résultat de la dernière opération
  } = useBulkDescriptions();

  const handleFileUpload = async (file: File) => {
    try {
      // 1. Parser le fichier
      const parseResult = await parseExcelFile(file);
      
      if (parseResult.errors.length > 0) {
        console.warn('Erreurs de parsing:', parseResult.errors);
      }

      // 2. Créer les descriptions
      const bulkResult = await createBulkDescriptions(parseResult.data);
      
      console.log(`${bulkResult.created_count} descriptions créées`);
    } catch (err) {
      console.error('Erreur:', error);
    }
  };

  const downloadTemplate = () => {
    const template = generateTemplate();
    const url = URL.createObjectURL(template);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_media_descriptions.xlsx';
    link.click();
  };

  return (
    <div>
      <button onClick={downloadTemplate}>
        Télécharger Template Excel
      </button>
      
      <input 
        type="file" 
        accept=".xlsx,.xls,.csv"
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
      />
      
      {loading && <p>Traitement en cours...</p>}
      {error && <p>Erreur: {error}</p>}
      
      {lastResult && (
        <div>
          <p>✅ {lastResult.created_count} créées</p>
          <p>❌ {lastResult.failed_count} échouées</p>
        </div>
      )}
    </div>
  );
}
```

### 📊 `useDescriptionReports` - Rapports avec Pagination

Hook pour gérer les rapports avec pagination automatique et auto-refresh.

```typescript
import { useDescriptionReports } from 'share';

function ReportsComponent() {
  const {
    reports,     // Liste des rapports
    loading,     // État de chargement
    error,       // Erreur éventuelle
    pagination,  // Informations de pagination
    refresh,     // Fonction de rafraîchissement
    loadPage     // Charger une page spécifique
  } = useDescriptionReports({
    limit: 10,
    autoRefresh: true,
    refreshInterval: 30000 // Rafraîchit toutes les 30 secondes
  });

  return (
    <div>
      <button onClick={refresh}>Actualiser</button>
      
      {loading && <p>Chargement...</p>}
      {error && <p>Erreur: {error}</p>}
      
      <div>
        {reports.map(report => (
          <div key={report.id}>
            <h3>{report.title}</h3>
            <p>Succès: {report.success_associated_file ? '✅' : '❌'}</p>
            <small>{report.timestamp}</small>
          </div>
        ))}
      </div>
      
      <div>
        Page {pagination.page} sur {pagination.total_pages}
        <button 
          onClick={() => loadPage(pagination.page - 1)}
          disabled={pagination.page <= 1}
        >
          Précédent
        </button>
        <button 
          onClick={() => loadPage(pagination.page + 1)}
          disabled={pagination.page >= pagination.total_pages}
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
```

### 🎥 `useVideoUpload` - Upload Vidéo

Hook pour gérer l'upload de fichiers vidéo avec suivi de progression.

```typescript
import { useVideoUpload } from 'share';

function VideoUploadComponent() {
  const {
    state,    // État complet { isUploading, progress, error, videoFile }
    upload,   // Fonction d'upload
    reset     // Reset de l'état
  } = useVideoUpload();

  const handleUpload = async (file: File, mediaId?: string) => {
    await upload({
      file,
      media_description_id: mediaId,
      upload_method: 'new_upload'
    });
  };

  return (
    <div>
      <input 
        type="file" 
        accept="video/*"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        disabled={state.isUploading}
      />
      
      {state.isUploading && (
        <div>
          <p>Upload en cours... {Math.round(state.progress)}%</p>
          <progress value={state.progress} max={100} />
        </div>
      )}
      
      {state.error && (
        <p style={{color: 'red'}}>Erreur: {state.error}</p>
      )}
      
      {state.videoFile && (
        <p style={{color: 'green'}}>
          ✅ Fichier uploadé: {state.videoFile.file_name}
        </p>
      )}
      
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

### 📺 `useVideoPlayback` - Test de Lecture

Hook pour tester la lecture de fichiers vidéo.

```typescript
import { useVideoPlayback } from 'share';

function VideoTestComponent({ videoFileId }: { videoFileId: string }) {
  const {
    state,         // État { isLoading, result, error }
    testPlayback,  // Fonction de test
    reset          // Reset de l'état
  } = useVideoPlayback();

  return (
    <div>
      <button 
        onClick={() => testPlayback(videoFileId)}
        disabled={state.isLoading}
      >
        {state.isLoading ? 'Test en cours...' : 'Tester la lecture'}
      </button>
      
      {state.result && (
        <div>
          {state.result.success ? (
            <div>
              ✅ Lecture possible
              {state.result.playback_url && (
                <a href={state.result.playback_url} target="_blank">
                  Voir la vidéo
                </a>
              )}
            </div>
          ) : (
            <p>❌ Échec: {state.result.error_message}</p>
          )}
        </div>
      )}
      
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

---

## 🛠️ Utilitaires

### 📊 ExcelParser - Parsing de Fichiers

Classe utilitaire pour parser des fichiers Excel/CSV et les convertir en données structurées.

```typescript
import { ExcelParser } from 'share';

// Parser un fichier
const result = await ExcelParser.parseFile(file);

if (result.errors.length > 0) {
  console.log('Erreurs trouvées:', result.errors);
}

console.log('Données parsées:', result.data); // MediaDescriptionCreate[]

// Générer un template
const template = ExcelParser.generateTemplate();
// Télécharge un fichier template.xlsx avec les bonnes colonnes
```

**Colonnes supportées:**
- file_number, episode_title, media_type
- program_name, season_number, episode_number  
- description, synopsis, production_year
- duration_seconds, original_language
- Et bien d'autres selon le schéma MediaDescription

### 💾 Storage - Abstraction de Stockage

Système d'abstraction pour le stockage cross-platform (localStorage/AsyncStorage).

```typescript
import { initStorage, tokenStorage } from 'share';

// Configuration (React Native)
import AsyncStorage from '@react-native-async-storage/async-storage';
initStorage(AsyncStorage);

// Utilisation des tokens
await tokenStorage.setToken('mon_token');
const token = await tokenStorage.getToken();
await tokenStorage.removeToken();

// Stockage générique
import { getStorage } from 'share';
const storage = getStorage();
await storage.setItem('key', 'value');
const value = await storage.getItem('key');
```

### ✅ Validation - Schémas Zod

Système de validation robuste avec Zod pour tous les types de données.

```typescript
import { 
  validateEmail, 
  validatePassword, 
  validateVideoFile,
  getValidationErrors,
  mediaDescriptionSchema 
} from 'share';

// Validation simple
const isValidEmail = validateEmail('test@example.com'); // true
const isValidPassword = validatePassword('123456'); // false (trop court)

// Validation de fichier vidéo
const fileValidation = validateVideoFile(file);
if (!fileValidation.isValid) {
  console.error(fileValidation.error);
}

// Validation avec schéma complet
const errors = getValidationErrors(mediaDescriptionSchema, {
  file_number: 'invalid', // Should be number
  episode_title: '', // Required
  media_type: 'invalid' // Should be 'video' | 'webtoon' etc.
});

console.log(errors);
// { file_number: 'Expected number', episode_title: 'Required', ... }
```

**Schémas disponibles:**
- `emailSchema`, `passwordSchema`
- `loginSchema`, `registerSchema`
- `mediaDescriptionSchema`, `videoFileSchema`
- Et plus encore...

### 🎬 VideoUpload - Gestion Upload Complexe

Classe avancée pour gérer tous les aspects de l'upload vidéo.

```typescript
import { VideoUploadManager, formatFileSize, formatDuration } from 'share';

// Créer un gestionnaire avec callback de progression
const uploadManager = new VideoUploadManager((progress) => {
  console.log(`Progression: ${progress.percentage}%`);
  console.log(`Vitesse: ${formatFileSize(progress.bytesPerSecond)}/s`);
});

// Upload d'un nouveau fichier
const videoFile = await uploadManager.upload({
  file: file,
  media_description_id: 'media-123',
  upload_method: 'new_upload'
});

// Upload avec URL existante
const videoFile2 = await uploadManager.uploadWithExistingUrl({
  file_name: 'video.mp4',
  external_url: 'https://example.com/video.mp4',
  media_description_id: 'media-456'
});

// Utilitaires de formatage
console.log(formatFileSize(1024 * 1024)); // "1.00 MB"
console.log(formatDuration(3661)); // "1h 1m 1s"
```

---

## 📝 Types TypeScript

Le package exporte plus de **50 interfaces TypeScript** couvrant tous les aspects de l'API.

### Principales Interfaces

```typescript
// Utilisateurs
interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

// Descriptions de média
interface MediaDescription {
  id: string;
  creation_date_utc: string;
  file_number: number;
  episode_title: string;
  media_type: 'video' | 'webtoon' | 'trailer' | 'teaser' | 'excerpt';
  program_id?: string;
  season_id?: string;
  episode_number?: number;
  descriptive_summary_text?: string;
  synopsis_text?: string;
  duration_seconds?: number;
  // ... et bien plus de champs
}

// Fichiers vidéo
interface VideoFile {
  id: string;
  media_description_id?: string;
  file_name?: string;
  file_url?: string;
  upload_method: 'new_upload' | 'existing_url';
  upload_status: 'metadata_only' | 'file_uploading' | 'upload_completed' | 'upload_failed';
  encoding_status: string;
  // ... champs techniques, Mux, etc.
}

// Programmes et saisons
interface Program {
  id: string;
  creation_date_utc: string;
  program_name: string;
  general_media_description?: string;
}

interface Season {
  id: string;
  creation_date_utc: string;
  program_id: string;
  season_number: number;
}
```

### Types de Filtrage et Pagination

```typescript
interface MediaFilters {
  skip?: number;
  limit?: number;
  media_type?: string;
  category_id?: string;
  status?: string;
  is_featured?: boolean;
  is_premium?: boolean;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface MediaDescriptionListResponse {
  data: MediaDescription[];
  pagination: PaginationInfo;
}
```

---

## 🔧 Exemples d'Intégration

### Application React.js

```typescript
// App.tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initApiClient } from 'share';

// Configuration
initApiClient({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  onAuthError: () => {
    window.location.href = '/login';
  }
});

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
}

// Composant avec hooks
function MainApp() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const { parseExcelFile } = useBulkDescriptions();
  
  return (
    <div>
      {isAuthenticated ? (
        <Dashboard user={user} onLogout={logout} />
      ) : (
        <LoginForm onLogin={login} />
      )}
    </div>
  );
}
```

### Application React Native

```typescript
// App.tsx
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initApiClient, initStorage } from 'share';

// Configuration pour React Native
initApiClient({
  baseURL: 'https://api.kyool.com',
  onAuthError: () => {
    // Navigation vers écran de login
  }
});

initStorage(AsyncStorage); // Important pour React Native

// Le reste est identique à React.js
```

### Backend Integration

Le package est conçu pour communiquer avec l'API backend FastAPI. Voici comment les endpoints sont mappés:

```
Package Share          →    Backend FastAPI
─────────────────────────────────────────────
authApi.login()        →    POST /api/v1/auth/login
mediaApi.getMedia()    →    GET  /api/v1/media-descriptions
programsApi.create()   →    POST /api/v1/programs
...                    →    ...
```

---

## ⚠️ Notes Importantes

### Dépendances Peer
Le package nécessite ces dépendances dans l'application cliente:
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "@tanstack/react-query": "^5.0.0"
}
```

### Gestion d'Erreurs
Toutes les fonctions API peuvent lever des erreurs. Il est recommandé d'utiliser des try/catch:

```typescript
try {
  const user = await authApi.getCurrentUser();
} catch (error) {
  if (error.response?.status === 401) {
    // Non authentifié
  } else if (error.response?.status === 403) {
    // Non autorisé
  } else {
    // Erreur réseau ou serveur
  }
}
```

### Performance
- React Query cache automatiquement les requêtes
- Utilisez la pagination pour les grandes listes
- Les hooks gèrent automatiquement la déduplication des requêtes

### Sécurité
- Tous les tokens sont stockés de manière sécurisée
- Les intercepteurs gèrent automatiquement l'expiration
- Validation côté client ET serveur

---

## 🚧 Évolutions Futures

### Composants UI Partagés
La structure `src/components/` est prête pour recevoir des composants UI réutilisables:
- Button, Input, Modal
- VideoPlayer, ImageUploader
- DataTable, Pagination

### Hooks Additionnels
Hooks prévus ou possibles:
- `useInfiniteScroll` - Pagination infinie
- `useVideoStream` - Streaming vidéo
- `useOfflineSync` - Synchronisation hors ligne

### Cache et Offline
- Cache persistant avec React Query
- Support hors ligne pour mobile
- Synchronisation différée

---

## 📚 Références Rapides

### Import Principal
```typescript
import { 
  // API
  authApi, mediaApi, programsApi, usersApi,
  
  // Hooks
  useAuth, useVideoUpload, useBulkDescriptions,
  
  // Utilitaires  
  ExcelParser, validateEmail, formatFileSize,
  
  // Types
  User, MediaDescription, VideoFile,
  
  // Configuration
  initApiClient, initStorage 
} from 'share';
```

### Scripts Utiles
```bash
# Build du package
npm run build

# Tests
npm run test

# Développement avec watch
npm run dev

# Vérification des types
npm run type-check
```

Ce package constitue le **cœur technique** de la plateforme KYOOL Media, centralisant toute la logique de communication avec le serveur et fournissant une API cohérente et typée pour tous les frontends de l'écosystème.

