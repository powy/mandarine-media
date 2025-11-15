/**
 * Input Section Component (Block A)
 * Handles all input fields and validation
 */

const RESOLUTIONS = {
  '1920x1080': 'Full HD Paysage',
  '1920x720': 'HD Paysage',
  '1080x1080': 'Carré',
  '810x1080': 'Portrait',
  '1080x1920': 'Portrait Complet'
};

const LANGUAGES = {
  'fr': 'Français',
  'en': 'English',
  'ko': '한국어'
};

export default function InputSection({ inputs, onChange, errors }) {
  const handleChange = (field, value) => {
    onChange({ ...inputs, [field]: value });
  };

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">A. ENTRÉES (Inputs)</h2>

      <div className="space-y-4">
        {/* Config File */}
        <div>
          <label className="label">Chemin du Fichier de Configuration *</label>
          <input
            type="text"
            className={`input w-full ${errors.configFile ? 'border-red-500' : ''}`}
            value={inputs.configFile || ''}
            onChange={(e) => handleChange('configFile', e.target.value)}
            placeholder="Saisissez ou collez le chemin complet vers le fichier .ini (ex: C:\chemin\vers\config.ini)"
            title="Collez le chemin complet du fichier ici"
          />
          {errors.configFile && <p className="error-text">{errors.configFile}</p>}
          <p className="text-xs text-gray-500 mt-1">Astuce : Copiez le chemin complet depuis l'Explorateur de fichiers et collez-le ici</p>
        </div>

        {/* Treated Folder */}
        <div>
          <label className="label">Chemin du Dossier Traité (traitement d'un dossier seul)</label>
          <input
            type="text"
            className={`input w-full ${errors.folder ? 'border-red-500' : ''}`}
            value={inputs.folder || ''}
            onChange={(e) => handleChange('folder', e.target.value)}
            placeholder="Saisissez ou collez le chemin complet vers le dossier média (ex: C:\chemin\vers\dossier)"
            title="Collez le chemin complet du dossier ici"
          />
          {errors.folder && <p className="error-text">{errors.folder}</p>}
          <p className="text-xs text-gray-500 mt-1">Astuce : Copiez le chemin complet depuis l'Explorateur de fichiers et collez-le ici</p>
        </div>

        {/* Parent Folder (for batch operations) */}
        <div>
          <label className="label">Chemin du Dossier Parent (pour opérations par lot (saison))</label>
          <input
            type="text"
            className={`input w-full ${errors.parentFolder ? 'border-red-500' : ''}`}
            value={inputs.parentFolder || ''}
            onChange={(e) => handleChange('parentFolder', e.target.value)}
            placeholder="Saisissez ou collez le chemin complet vers le dossier parent (ex: C:\chemin\vers\parent)"
            title="Collez le chemin complet du dossier ici"
          />
          {errors.parentFolder && <p className="error-text">{errors.parentFolder}</p>}
          <p className="text-xs text-gray-500 mt-1">Astuce : Copiez le chemin complet depuis l'Explorateur de fichiers et collez-le ici</p>
        </div>

        {/* Picture Path */}
        <div>
          <label className="label">Chemin de l'Image</label>
          <input
            type="text"
            className={`input w-full ${errors.picture ? 'border-red-500' : ''}`}
            value={inputs.picture || ''}
            onChange={(e) => handleChange('picture', e.target.value)}
            placeholder="Saisissez ou collez le chemin complet vers le fichier image (ex: C:\chemin\vers\image.jpg)"
            title="Collez le chemin complet du fichier ici"
          />
          {errors.picture && <p className="error-text">{errors.picture}</p>}
        </div>

        {/* Resolution */}
        <div>
          <label className="label">Résolution {inputs.picture && '*'}</label>
          <select
            className={`select w-full ${errors.resolution ? 'border-red-500' : ''}`}
            value={inputs.resolution || ''}
            onChange={(e) => handleChange('resolution', e.target.value)}
            disabled={!inputs.picture}
          >
            <option value="">Sélectionner une résolution...</option>
            {Object.entries(RESOLUTIONS).map(([value, label]) => (
              <option key={value} value={value}>
                {value} - {label}
              </option>
            ))}
          </select>
          {errors.resolution && <p className="error-text">{errors.resolution}</p>}
        </div>

        {/* Subtitle Path */}
        <div>
          <label className="label">Chemin des Sous-titres</label>
          <input
            type="text"
            className={`input w-full ${errors.subtitle ? 'border-red-500' : ''}`}
            value={inputs.subtitle || ''}
            onChange={(e) => handleChange('subtitle', e.target.value)}
            placeholder="Saisissez ou collez le chemin complet vers le fichier de sous-titres (ex: C:\chemin\vers\soustitres.vtt)"
            title="Collez le chemin complet du fichier ici"
          />
          {errors.subtitle && <p className="error-text">{errors.subtitle}</p>}
        </div>

        {/* Language */}
        <div>
          <label className="label">Langue {inputs.subtitle && '*'}</label>
          <select
            className={`select w-full ${errors.language ? 'border-red-500' : ''}`}
            value={inputs.language || ''}
            onChange={(e) => handleChange('language', e.target.value)}
            disabled={!inputs.subtitle}
          >
            <option value="">Sélectionner une langue...</option>
            {Object.entries(LANGUAGES).map(([value, label]) => (
              <option key={value} value={value}>
                {label} ({value})
              </option>
            ))}
          </select>
          {errors.language && <p className="error-text">{errors.language}</p>}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-300 my-4"></div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Upload par ID (optionnel)</p>

        {/* Media Description ID */}
        <div>
          <label className="label">Media Description ID</label>
          <input
            type="text"
            className={`input w-full ${errors.mediaDescriptionId ? 'border-red-500' : ''}`}
            value={inputs.mediaDescriptionId || ''}
            onChange={(e) => handleChange('mediaDescriptionId', e.target.value)}
            placeholder="ex: a1b2c3d4-e5f6-7890-abcd-ef1234567890"
            title="UUID depuis la media-description du backend"
          />
          {errors.mediaDescriptionId && <p className="error-text">{errors.mediaDescriptionId}</p>}
          <p className="text-xs text-gray-500 mt-1">UUID de l'API backend (entité media-description) - Pour la propagation</p>
        </div>

        {/* Season Entity ID */}
        <div>
          <label className="label">Season Entity ID</label>
          <input
            type="text"
            className={`input w-full ${errors.seasonEntityId ? 'border-red-500' : ''}`}
            value={inputs.seasonEntityId || ''}
            onChange={(e) => handleChange('seasonEntityId', e.target.value)}
            placeholder="ex: xyz789-abc123-def456-ghi789"
            title="UUID depuis l'entité saison du backend"
          />
          {errors.seasonEntityId && <p className="error-text">{errors.seasonEntityId}</p>}
          <p className="text-xs text-gray-500 mt-1">UUID de l'API backend (entité saison) - Pour la propagation</p>
        </div>

        {/* Mux Asset ID */}
        <div>
          <label className="label">Mux Asset ID</label>
          <input
            type="text"
            className={`input w-full ${errors.muxAssetId ? 'border-red-500' : ''}`}
            value={inputs.muxAssetId || ''}
            onChange={(e) => handleChange('muxAssetId', e.target.value)}
            placeholder="ex: abc123xyz456def789"
            title="ID d'asset depuis la plateforme Mux"
          />
          {errors.muxAssetId && <p className="error-text">{errors.muxAssetId}</p>}
          <p className="text-xs text-gray-500 mt-1">ID d'asset direct depuis le tableau de bord Mux</p>
        </div>
      </div>

      {/* Section E: Excel Edition */}
      <div className="border-t border-gray-300 my-6"></div>
      <p className="text-sm font-semibold text-gray-700 mb-3">E. Edition Excel</p>

      <div className="space-y-4">
        {/* Excel Description Field (Champ) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Champ (Description Colonne A)
            <span className="text-red-500 ml-1">*</span>
          </label>
          <select
            className={`select select-bordered w-full ${errors.excelDescriptionField ? 'border-red-500' : ''}`}
            value={inputs.excelDescriptionField || ''}
            onChange={(e) => handleChange('excelDescriptionField', e.target.value)}
          >
            <option value="">-- Sélectionner un champ --</option>
            <option value="Sécurité (public, drm, signed)">Sécurité (public, drm, signed)</option>
            <option value="Type (video, season, program)">Type (video, season, program)</option>
            <option value="Titre du programme">Titre du programme</option>
            <option value="Titre de la saison">Titre de la saison</option>
            <option value="Catégories">Catégories</option>
            <option value="Themes">Themes</option>
            <option value="Description courte">Description courte</option>
            <option value="Synopsis">Synopsis</option>
            <option value="nom pour le lien direct">nom pour le lien direct</option>
            <option value="Année de production">Année de production</option>
            <option value="Date de diffusion originale">Date de diffusion originale</option>
            <option value="Détenteur des droits">Détenteur des droits</option>
            <option value="Propriétaire des droits d'auteur">Propriétaire des droits d'auteur</option>
            <option value="Langue originale">Langue originale</option>
            <option value="Liste des acteurs">Liste des acteurs</option>
            <option value="Liste des réalisateurs">Liste des réalisateurs</option>
            <option value="Liste des producteurs">Liste des producteurs</option>
            <option value="Liste des auteurs">Liste des auteurs</option>
            <option value="Pays disponibles">Pays disponibles</option>
            <option value="Catégories de public">Catégories de public</option>
            <option value="Hashtags">Hashtags</option>
            <option value="Mots-clés">Mots-clés</option>
          </select>
          {errors.excelDescriptionField && (
            <p className="text-red-500 text-xs mt-1">{errors.excelDescriptionField}</p>
          )}
          <p className="text-gray-500 text-xs mt-1">
            Ce champ correspond à la colonne A du fichier Excel
          </p>
        </div>

        {/* Excel New Value (Nouvelle Valeur) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nouvelle Valeur
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            className={`input input-bordered w-full ${errors.excelNewValue ? 'border-red-500' : ''}`}
            value={inputs.excelNewValue || ''}
            onChange={(e) => handleChange('excelNewValue', e.target.value)}
            placeholder="Entrez la nouvelle valeur pour la colonne C"
          />
          {errors.excelNewValue && (
            <p className="text-red-500 text-xs mt-1">{errors.excelNewValue}</p>
          )}
          <p className="text-gray-500 text-xs mt-1">
            💡 Astuce: Utilisez <code className="bg-gray-100 px-1 rounded">{'{{'} folder_name {'}}'}</code> pour insérer le nom du dossier dynamiquement
          </p>
        </div>
      </div>
    </div>
  );
}
