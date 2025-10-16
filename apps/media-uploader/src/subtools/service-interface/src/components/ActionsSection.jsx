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
    if (inputs.folder) parameters.folder = inputs.folder;
    if (inputs.parentFolder) parameters.parentFolder = inputs.parentFolder;
    if (inputs.picture) parameters.picture = inputs.picture;
    if (inputs.resolution) parameters.resolution = inputs.resolution;
    if (inputs.subtitle) parameters.subtitle = inputs.subtitle;
    if (inputs.language) parameters.language = inputs.language;

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* B.a - Media Seul (Single Media) */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-blue-700">B.a Media Seul</h3>
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

        {/* B.b - Groupe de Media (Batch Operations) */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-green-700">B.b Groupe de Media</h3>
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
