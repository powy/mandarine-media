/**
 * Actions Section Component (Block B)
 * Handles action buttons for single and batch operations
 */

import { useState } from 'react';

export default function ActionsSection({ inputs, onCreateTask, creating }) {
  const [selectedAction, setSelectedAction] = useState(null);

  // Helper function to create enriched tooltips
  const createTooltip = (requiredFields, description) => {
    const fieldLabels = {
      folder: 'Dossier traité',
      parentFolder: 'Dossier parent',
      picture: 'Chemin de l\'image',
      resolution: 'Résolution',
      subtitle: 'Chemin des sous-titres',
      language: 'Langue',
      mediaDescriptionId: 'Media Description ID',
      seasonEntityId: 'Season Entity ID',
      muxAssetId: 'Mux Asset ID',
      excelDescriptionField: 'Champ (description colonne A)',
      excelNewValue: 'Nouvelle valeur'
    };

    const inputs = requiredFields
      .filter(field => field !== 'configFile')
      .map(field => `• ${fieldLabels[field] || field}`)
      .join('\n');

    return inputs ? `Inputs requis :\n${inputs}\n\n${description}` : description;
  };

  const handleAction = async (taskType, requiredFields) => {
    setSelectedAction(taskType);

    // Build parameters from inputs
    const parameters = {};

    if (inputs.configFile) parameters.config = inputs.configFile;
    if (inputs.folder) {
      parameters.folder = inputs.folder;
      parameters.folderPath = inputs.folder; // Map folder → folderPath for ID-based functions
    }
    if (inputs.parentFolder) {
      parameters.parentFolder = inputs.parentFolder;
      parameters.folderPath = inputs.parentFolder; // Map parentFolder → folderPath for batch functions
    }
    if (inputs.picture) parameters.picture = inputs.picture;
    if (inputs.resolution) {
      parameters.resolution = inputs.resolution;
      parameters.format = inputs.resolution.replace('x', '_'); // Convert 1920x1080 → 1920_1080
    }
    if (inputs.subtitle) parameters.subtitle = inputs.subtitle;
    if (inputs.language) parameters.language = inputs.language;
    if (inputs.mediaDescriptionId) parameters.mediaDescriptionId = inputs.mediaDescriptionId;
    if (inputs.seasonEntityId) parameters.seasonEntityId = inputs.seasonEntityId;
    if (inputs.muxAssetId) parameters.muxAssetId = inputs.muxAssetId;
    if (inputs.excelDescriptionField) parameters.descriptionText = inputs.excelDescriptionField;
    if (inputs.excelNewValue !== undefined && inputs.excelNewValue !== null) parameters.newValue = inputs.excelNewValue;

    try {
      await onCreateTask(taskType, parameters);
    } finally {
      setSelectedAction(null);
    }
  };

  const isDisabled = (requiredFields) => {
    return creating || requiredFields.some(field => !inputs[field]);
  };

  const ActionButton = ({ taskType, label, requiredFields, description }) => (
    <button
      className={`btn btn-primary w-full text-left justify-start ${
        isDisabled(requiredFields) ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      onClick={() => handleAction(taskType, requiredFields)}
      disabled={isDisabled(requiredFields)}
      title={createTooltip(requiredFields, description)}
    >
      {creating && selectedAction === taskType && (
        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
      )}
      {label}
    </button>
  );

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">B. ACTIONS</h2>

      <div className="space-y-8">
        {/* Category 1: UPLOAD */}
        <div>
          <h2 className="text-lg font-bold mb-4 text-purple-800 border-b-2 border-purple-300 pb-2">
            1. TÉLÉVERSEMENT
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1.A - À l'unité */}
            <div>
              <h3 className="text-md font-semibold mb-3 text-blue-700">A) À l'unité</h3>
              <div className="space-y-2">
                <ActionButton
                  taskType="prepare-excel-single"
                  label="Prépare un Excel"
                  requiredFields={['configFile', 'folder']}
                  description="Prépare le fichier Excel avec modèle et remplit automatiquement la feuille Fichiers"
                />
                <ActionButton
                  taskType="upload-media-single"
                  label="Upload un Media"
                  requiredFields={['configFile', 'folder']}
                  description="Flux complet de téléversement de média (vidéo, images, sous-titres)"
                />
              </div>
            </div>

            {/* 1.B - Par lot */}
            <div>
              <h3 className="text-md font-semibold mb-3 text-green-700">B) Par lot</h3>
              <div className="space-y-2">
                <ActionButton
                  taskType="prepare-excel-batch"
                  label="Prépare des Excels"
                  requiredFields={['configFile', 'parentFolder']}
                  description="Prépare les fichiers Excel pour tous les sous-dossiers"
                />
                <ActionButton
                  taskType="upload-media-batch"
                  label="Upload des Medias"
                  requiredFields={['configFile', 'parentFolder']}
                  description="Téléverse plusieurs médias depuis le dossier parent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Category 2: MISE À JOUR DEPUIS EXCEL */}
        <div>
          <h2 className="text-lg font-bold mb-4 text-purple-800 border-b-2 border-purple-300 pb-2">
            2. MISE À JOUR DEPUIS EXCEL
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 2.A - À l'unité */}
            <div>
              <h3 className="text-md font-semibold mb-3 text-blue-700">A) À l'unité</h3>
              <div className="space-y-2">
                <ActionButton
                  taskType="upload-picture-single"
                  label="Charge une Image"
                  requiredFields={['configFile', 'folder', 'picture', 'resolution']}
                  description="Téléverse une image pour un seul média"
                />
                <ActionButton
                  taskType="upload-subtitle-single"
                  label="Charge un Sous-titre"
                  requiredFields={['configFile', 'folder', 'subtitle', 'language']}
                  description="Téléverse un sous-titre spécifique pour un seul média"
                />
                <ActionButton
                  taskType="reload-subtitles-single"
                  label="Recharge les Sous-titres"
                  requiredFields={['configFile', 'folder']}
                  description="Recharge tous les sous-titres pour un seul média"
                />
              </div>
            </div>

            {/* 2.B - Par lot */}
            <div>
              <h3 className="text-md font-semibold mb-3 text-green-700">B) Par lot</h3>
              <div className="space-y-2">
                <ActionButton
                  taskType="upload-picture-batch"
                  label="Upload une Photo sur Tous"
                  requiredFields={['configFile', 'parentFolder', 'picture', 'resolution']}
                  description="Téléverse une image sur tous les médias du dossier parent"
                />
                <ActionButton
                  taskType="reload-subtitles-batch"
                  label="Tous les Sous-titres pour Tous les Medias"
                  requiredFields={['configFile', 'parentFolder']}
                  description="Recharge les sous-titres pour tous les médias du dossier parent"
                />
                <ActionButton
                  taskType="propagate-season-data-batch"
                  label="Propager Données de Saison"
                  requiredFields={['configFile', 'parentFolder']}
                  description="Propage les données de SAISON vers les épisodes depuis le fichier Excel du dossier parent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Category 3: MISE À JOUR PAR ID */}
        <div>
          <h2 className="text-lg font-bold mb-4 text-purple-800 border-b-2 border-purple-300 pb-2">
            3. MISE À JOUR PAR ID
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 3.A - À l'unité */}
            <div>
              <h3 className="text-md font-semibold mb-3 text-blue-700">A) À l'unité</h3>
              <div className="space-y-2">
                <ActionButton
                  taskType="upload-subtitle-by-media-desc-id"
                  label="Sous-titre par Media Description ID"
                  requiredFields={['configFile', 'mediaDescriptionId', 'subtitle', 'language']}
                  description="Téléverse un sous-titre en utilisant l'UUID de description média du backend"
                />
                <ActionButton
                  taskType="upload-subtitle-by-mux-asset-id"
                  label="Sous-titre par Mux Asset ID"
                  requiredFields={['configFile', 'muxAssetId', 'subtitle', 'language']}
                  description="Téléverse un sous-titre directement vers l'asset Mux"
                />
                <ActionButton
                  taskType="upload-picture-with-ini"
                  label="Image par ID (format connu)"
                  requiredFields={['configFile', 'picture', 'resolution', 'mediaDescriptionId']}
                  description="Téléverse une image avec format connu et ID de description média"
                />
                <ActionButton
                  taskType="upload-picture-with-format-detection"
                  label="Image par ID (auto format)"
                  requiredFields={['configFile', 'picture', 'mediaDescriptionId']}
                  description="Téléverse une image avec détection automatique du format depuis les dimensions"
                />
                <ActionButton
                  taskType="upload-pictures-in-folder-with-ini"
                  label="Images Dossier par ID"
                  requiredFields={['configFile', 'folder', 'mediaDescriptionId']}
                  description="Téléversement par lot (saison) de toutes les images du dossier avec détection auto du format"
                />
                <ActionButton
                  taskType="delete-subtitle-by-media-desc-id"
                  label="Supprimer Sous-titre par ID"
                  requiredFields={['configFile', 'mediaDescriptionId', 'language']}
                  description="Supprime la piste de sous-titres de l'asset Mux en utilisant l'ID de description média"
                />
                <ActionButton
                  taskType="upload-subtitles-by-id-and-folder"
                  label="Charge sous-titre avec ID et dossier"
                  requiredFields={['configFile', 'mediaDescriptionId', 'folder']}
                  description="Scanne automatiquement le dossier pour trouver les sous-titres, les associe à la vidéo principale et les téléverse vers l'ID de description média"
                />
              </div>
            </div>

            {/* 3.B - Par lot */}
            <div>
              <h3 className="text-md font-semibold mb-3 text-green-700">B) Par lot</h3>
              <div className="space-y-2">
                <ActionButton
                  taskType="upload-subtitles-by-season-folder"
                  label="Sous-titres Saison (dossiers numérotés)"
                  requiredFields={['configFile', 'mediaDescriptionId', 'parentFolder']}
                  description="Charge les sous-titres pour tous les épisodes d'une saison depuis des dossiers numérotés (01/, 02/, etc.)"
                />
                <ActionButton
                  taskType="propagate-by-media-description-id"
                  label="Propager Saison par Media Desc ID"
                  requiredFields={['configFile', 'mediaDescriptionId']}
                  description="Propage les données de saison vers les épisodes en utilisant l'ID de description média avec config INI"
                />
                <ActionButton
                  taskType="propagate-by-season-entity-id"
                  label="Propager Saison par Season Entity ID"
                  requiredFields={['configFile', 'seasonEntityId']}
                  description="Propage les données de saison vers les épisodes en utilisant l'ID d'entité saison avec config INI"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Category 4: EDITION EXCELS */}
        <div>
          <h2 className="text-lg font-bold mb-4 text-purple-800 border-b-2 border-purple-300 pb-2">
            4. EDITION EXCELS
          </h2>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-purple-800">
              📝 Modifier des champs dans les fichiers Excel en cherchant par description (colonne A).
              Les champs <strong>Champ</strong> et <strong>Nouvelle Valeur</strong> sont dans la section E (Entrées ci-dessus).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 4.A - À l'unité */}
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h3 className="text-md font-semibold mb-3 text-blue-700 flex items-center">
                <span className="mr-2">📄</span> A) À l'unité
              </h3>
              <div className="space-y-2">
                <ActionButton
                  taskType="edit-excel-single-by-desc"
                  label="Modifier Excel"
                  requiredFields={['configFile', 'folder', 'excelDescriptionField', 'excelNewValue']}
                  description="Modifie le fichier 0_desc*.xlsx dans le dossier traité"
                />
              </div>
              <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-3 rounded">
                <p className="font-semibold mb-1">Champs requis:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Fichier de configuration</li>
                  <li>Dossier traité (folder)</li>
                  <li>Champ (description colonne A)</li>
                  <li>Nouvelle valeur</li>
                </ul>
              </div>
            </div>

            {/* 4.B - Par lot */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <h3 className="text-md font-semibold mb-3 text-green-700 flex items-center">
                <span className="mr-2">📁</span> B) Par lot
              </h3>
              <div className="space-y-2">
                <ActionButton
                  taskType="edit-excel-batch-by-desc"
                  label="Modifier Tous les Excels des Sous Dossier"
                  requiredFields={['configFile', 'parentFolder', 'excelDescriptionField', 'excelNewValue']}
                  description="Modifie tous les 0_desc*.xlsx dans le dossier parent ET tous les sous-dossiers récursivement"
                />
                <ActionButton
                  taskType="regenerate-episode-names"
                  label="Régénérer les noms d'épisode"
                  requiredFields={['configFile', 'parentFolder']}
                  description="Régénère automatiquement les titres d'épisodes à partir du nom de la saison (format: 'Saison - Episode XX')"
                />
              </div>
              <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-3 rounded">
                <p className="font-semibold mb-1">Modifier Tous les Excels:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Fichier de configuration</li>
                  <li>Dossier parent (parent folder)</li>
                  <li>Champ (description colonne A)</li>
                  <li>Nouvelle valeur</li>
                </ul>
                <p className="mt-2 text-amber-700 font-medium">
                  ⚠️ Attention: Modifie TOUS les Excels récursivement
                </p>
              </div>
              <div className="mt-3 text-xs text-gray-600 bg-blue-50 p-3 rounded">
                <p className="font-semibold mb-1">📝 Régénérer les noms d'épisode:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Lit le nom de la saison dans l'Excel parent</li>
                  <li>Génère "{'{season_name}'} - Episode {'{folder_name}'}"</li>
                  <li>Met à jour "Titre de la vidéo" dans chaque sous-dossier</li>
                </ul>
                <p className="mt-1 text-gray-600">
                  <strong>Champs requis:</strong> Config + Dossier parent
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info message */}
      {creating && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Création de la tâche... La tâche apparaîtra dans la section Tâches en Cours ci-dessous.
          </p>
        </div>
      )}
    </div>
  );
}
