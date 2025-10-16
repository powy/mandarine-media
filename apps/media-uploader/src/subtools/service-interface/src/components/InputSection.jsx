/**
 * Input Section Component (Block A)
 * Handles all input fields and validation
 */

const RESOLUTIONS = {
  '1920x1080': 'Full HD Landscape',
  '1920x720': 'HD Landscape',
  '1080x1080': 'Square',
  '810x1080': 'Portrait',
  '1080x1920': 'Full Portrait'
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
          <label className="label">Config File Path *</label>
          <input
            type="text"
            className={`input w-full ${errors.configFile ? 'border-red-500' : ''}`}
            value={inputs.configFile || ''}
            onChange={(e) => handleChange('configFile', e.target.value)}
            placeholder="Type or paste full path to .ini config file (e.g., C:\path\to\config.ini)"
            title="Paste the full file path here"
          />
          {errors.configFile && <p className="error-text">{errors.configFile}</p>}
          <p className="text-xs text-gray-500 mt-1">Tip: Copy the full file path from File Explorer and paste it here</p>
        </div>

        {/* Treated Folder */}
        <div>
          <label className="label">Treated Folder Path</label>
          <input
            type="text"
            className={`input w-full ${errors.folder ? 'border-red-500' : ''}`}
            value={inputs.folder || ''}
            onChange={(e) => handleChange('folder', e.target.value)}
            placeholder="Type or paste full path to media folder (e.g., C:\path\to\folder)"
            title="Paste the full folder path here"
          />
          {errors.folder && <p className="error-text">{errors.folder}</p>}
          <p className="text-xs text-gray-500 mt-1">Tip: Copy the full folder path from File Explorer and paste it here</p>
        </div>

        {/* Parent Folder (for batch operations) */}
        <div>
          <label className="label">Parent Folder Path (for batch operations)</label>
          <input
            type="text"
            className={`input w-full ${errors.parentFolder ? 'border-red-500' : ''}`}
            value={inputs.parentFolder || ''}
            onChange={(e) => handleChange('parentFolder', e.target.value)}
            placeholder="Type or paste full path to parent folder (e.g., C:\path\to\parent)"
            title="Paste the full folder path here"
          />
          {errors.parentFolder && <p className="error-text">{errors.parentFolder}</p>}
          <p className="text-xs text-gray-500 mt-1">Tip: Copy the full folder path from File Explorer and paste it here</p>
        </div>

        {/* Picture Path */}
        <div>
          <label className="label">Picture Path</label>
          <input
            type="text"
            className={`input w-full ${errors.picture ? 'border-red-500' : ''}`}
            value={inputs.picture || ''}
            onChange={(e) => handleChange('picture', e.target.value)}
            placeholder="Type or paste full path to image file (e.g., C:\path\to\image.jpg)"
            title="Paste the full file path here"
          />
          {errors.picture && <p className="error-text">{errors.picture}</p>}
        </div>

        {/* Resolution */}
        <div>
          <label className="label">Resolution {inputs.picture && '*'}</label>
          <select
            className={`select w-full ${errors.resolution ? 'border-red-500' : ''}`}
            value={inputs.resolution || ''}
            onChange={(e) => handleChange('resolution', e.target.value)}
            disabled={!inputs.picture}
          >
            <option value="">Select resolution...</option>
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
          <label className="label">Subtitle Path</label>
          <input
            type="text"
            className={`input w-full ${errors.subtitle ? 'border-red-500' : ''}`}
            value={inputs.subtitle || ''}
            onChange={(e) => handleChange('subtitle', e.target.value)}
            placeholder="Type or paste full path to subtitle file (e.g., C:\path\to\subtitle.vtt)"
            title="Paste the full file path here"
          />
          {errors.subtitle && <p className="error-text">{errors.subtitle}</p>}
        </div>

        {/* Language */}
        <div>
          <label className="label">Language {inputs.subtitle && '*'}</label>
          <select
            className={`select w-full ${errors.language ? 'border-red-500' : ''}`}
            value={inputs.language || ''}
            onChange={(e) => handleChange('language', e.target.value)}
            disabled={!inputs.subtitle}
          >
            <option value="">Select language...</option>
            {Object.entries(LANGUAGES).map(([value, label]) => (
              <option key={value} value={value}>
                {label} ({value})
              </option>
            ))}
          </select>
          {errors.language && <p className="error-text">{errors.language}</p>}
        </div>
      </div>
    </div>
  );
}
