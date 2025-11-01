/**
 * Actions Section Component (Block B)
 * Handles action buttons for single and batch operations
 */

import { useState } from 'react';

export default function ActionsSection({ inputs, onCreateTask, creating }) {
  const [selectedAction, setSelectedAction] = useState(null);

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
      title={description}
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
            1. UPLOAD
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
                  description="Prepare Excel file with template and auto-fill Files sheet"
                />
                <ActionButton
                  taskType="upload-media-single"
                  label="Upload un Media"
                  requiredFields={['configFile', 'folder']}
                  description="Complete media upload workflow (video, images, subtitles)"
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
                  description="Prepare Excel files for all subfolders"
                />
                <ActionButton
                  taskType="upload-media-batch"
                  label="Upload des Medias"
                  requiredFields={['configFile', 'parentFolder']}
                  description="Upload multiple media from parent folder"
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
                  description="Upload a picture for single media"
                />
                <ActionButton
                  taskType="upload-subtitle-single"
                  label="Charge un Sous-titre"
                  requiredFields={['configFile', 'folder', 'subtitle', 'language']}
                  description="Upload specific subtitle for single media"
                />
                <ActionButton
                  taskType="reload-subtitles-single"
                  label="Recharge les Sous-titres"
                  requiredFields={['configFile', 'folder']}
                  description="Reload all subtitles for single media"
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
                  description="Upload picture to all media in parent folder"
                />
                <ActionButton
                  taskType="reload-subtitles-batch"
                  label="Tous les Sous-titres pour Tous les Medias"
                  requiredFields={['configFile', 'parentFolder']}
                  description="Reload subtitles for all media in parent folder"
                />
                <ActionButton
                  taskType="propagate-season-data-batch"
                  label="Propager Données de Saison"
                  requiredFields={['configFile', 'parentFolder']}
                  description="Propagate SEASON data to episodes from parent folder Excel file"
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
                  description="Upload subtitle using backend media description UUID"
                />
                <ActionButton
                  taskType="upload-subtitle-by-mux-asset-id"
                  label="Sous-titre par Mux Asset ID"
                  requiredFields={['configFile', 'muxAssetId', 'subtitle', 'language']}
                  description="Upload subtitle directly to Mux asset"
                />
                <ActionButton
                  taskType="upload-picture-with-ini"
                  label="Image par ID (format connu)"
                  requiredFields={['configFile', 'picture', 'resolution', 'mediaDescriptionId']}
                  description="Upload picture with known format and media description ID"
                />
                <ActionButton
                  taskType="upload-picture-with-format-detection"
                  label="Image par ID (auto format)"
                  requiredFields={['configFile', 'picture', 'mediaDescriptionId']}
                  description="Upload picture with automatic format detection from dimensions"
                />
                <ActionButton
                  taskType="upload-pictures-in-folder-with-ini"
                  label="Images Dossier par ID"
                  requiredFields={['configFile', 'folder', 'mediaDescriptionId']}
                  description="Batch upload all images in folder with auto-format detection"
                />
                <ActionButton
                  taskType="delete-subtitle-by-media-desc-id"
                  label="Supprimer Sous-titre par ID"
                  requiredFields={['configFile', 'mediaDescriptionId', 'language']}
                  description="Delete subtitle track from Mux asset using media description ID"
                />
              </div>
            </div>

            {/* 3.B - Par lot */}
            <div>
              <h3 className="text-md font-semibold mb-3 text-green-700">B) Par lot</h3>
              <div className="space-y-2">
                <ActionButton
                  taskType="propagate-by-media-description-id"
                  label="Propager Saison par Media Desc ID"
                  requiredFields={['configFile', 'mediaDescriptionId']}
                  description="Propagate season data to episodes using media description ID with INI config"
                />
                <ActionButton
                  taskType="propagate-by-season-entity-id"
                  label="Propager Saison par Season Entity ID"
                  requiredFields={['configFile', 'seasonEntityId']}
                  description="Propagate season data to episodes using season entity ID with INI config"
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
            Creating task... The task will appear in the Running Tasks section below.
          </p>
        </div>
      )}
    </div>
  );
}
