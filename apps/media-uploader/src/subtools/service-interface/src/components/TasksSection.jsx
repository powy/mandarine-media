/**
 * Tasks Section Component (Block C)
 * Displays running and finished tasks
 */

import { useState } from 'react';

const STATUS_LABELS = {
  queued: 'En file d\'attente',
  processing: 'Traitement en cours',
  success: 'Réussi',
  failed: 'Échoué',
  canceled: 'Annulé',
  partial: 'Partiel'
};

const TASK_TYPE_LABELS = {
  'prepare-excel-single': 'Prépare Excel',
  'upload-media-single': 'Téléversement Média',
  'upload-picture-single': 'Téléversement Image',
  'upload-subtitle-single': 'Téléversement Sous-titre',
  'reload-subtitles-single': 'Rechargement Sous-titres',
  'prepare-excel-batch': 'Prépare Excels (Par lot (saison))',
  'upload-media-batch': 'Téléversement Médias (Par lot (saison))',
  'upload-picture-batch': 'Téléversement Image (Par lot (saison))',
  'reload-subtitles-batch': 'Rechargement Sous-titres (Par lot (saison))',
  'upload-picture-with-ini': 'Téléversement Image (INI + ID)',
  'upload-picture-with-format-detection': 'Téléversement Image (Format Auto)',
  'upload-pictures-in-folder-with-ini': 'Téléversement Images (Dossier)'
};

function formatTime(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(Number(timestamp));
  return date.toLocaleString('fr-FR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatDuration(start, end) {
  if (!start) return '0s';
  const startTime = new Date(Number(start));
  const endTime = end ? new Date(Number(end)) : new Date();
  const duration = Math.floor((endTime - startTime) / 1000);

  // Prevent negative durations
  if (duration < 0) return '0s';
  if (duration < 60) return `${duration}s`;
  if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
  return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
}

function TaskRow({ task, onSelect, onStop, isSelected, showStop = false }) {
  const handleStop = (e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to stop task ${task.id}?`)) {
      onStop(task.id);
    }
  };

  return (
    <tr
      className={`cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
      onClick={() => onSelect(task.id)}
    >
      <td className="px-4 py-2 border">{task.id}</td>
      <td className="px-4 py-2 border">
        <span className="text-xs">
          {TASK_TYPE_LABELS[task.type] || task.type}
        </span>
      </td>
      <td className="px-4 py-2 border">
        <span className={`status-badge status-${task.status}`}>
          {STATUS_LABELS[task.status] || task.status}
        </span>
      </td>
      <td className="px-4 py-2 border text-xs">
        {task.started_at ? formatTime(task.started_at) : (
          <span className="text-gray-400 italic">En file d'attente</span>
        )}
      </td>
      <td className="px-4 py-2 border text-xs">
        {task.started_at ? formatDuration(task.started_at, task.completed_at) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      {showStop && (
        <td className="px-4 py-2 border text-center">
          <button
            className="btn btn-danger btn-sm"
            onClick={handleStop}
            title="Arrêter la tâche"
          >
            ✕
          </button>
        </td>
      )}
    </tr>
  );
}

export default function TasksSection({ runningTasks, finishedTasks, selectedTaskId, onSelectTask, onStopTask }) {
  // Defensive: Ensure props are always arrays
  const safeRunningTasks = Array.isArray(runningTasks) ? runningTasks : [];
  const safeFinishedTasks = Array.isArray(finishedTasks) ? finishedTasks : [];

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">C. TÂCHES</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Running Tasks */}
        <div>
          <h3 className="text-lg font-semibold mb-2 text-blue-700">
            Tâches en Cours ({safeRunningTasks.length})
          </h3>
          <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
            {safeRunningTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>Aucune tâche en cours</p>
                <p className="text-sm mt-2">Les tâches apparaîtront ici une fois créées</p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-96 border-2 border-gray-200 rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-2 border text-left">ID</th>
                      <th className="px-4 py-2 border text-left">Type</th>
                      <th className="px-4 py-2 border text-left">Statut</th>
                      <th className="px-4 py-2 border text-left">Heure</th>
                      <th className="px-4 py-2 border text-left">Durée</th>
                      <th className="px-4 py-2 border text-center">Arrêter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeRunningTasks.map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onSelect={onSelectTask}
                        onStop={onStopTask}
                        isSelected={selectedTaskId === task.id}
                        showStop={true}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Finished Tasks */}
        <div>
          <h3 className="text-lg font-semibold mb-2 text-green-700">
            Tâches Terminées ({safeFinishedTasks.length > 500 ? `Affichage de 500 sur ${safeFinishedTasks.length}` : safeFinishedTasks.length})
          </h3>
          <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
            {safeFinishedTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>Aucune tâche terminée</p>
                <p className="text-sm mt-2">Les tâches terminées apparaîtront ici</p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-96 border-2 border-gray-200 rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-2 border text-left">ID</th>
                      <th className="px-4 py-2 border text-left">Type</th>
                      <th className="px-4 py-2 border text-left">Statut</th>
                      <th className="px-4 py-2 border text-left">Heure</th>
                      <th className="px-4 py-2 border text-left">Durée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeFinishedTasks.slice(0, 500).map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onSelect={onSelectTask}
                        onStop={onStopTask}
                        isSelected={selectedTaskId === task.id}
                        showStop={false}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {safeFinishedTasks.length > 50 && (
            <p className="text-xs text-gray-500 mt-2 flex items-center justify-center gap-1">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
              Affichage des 50 tâches les plus récentes (faites défiler pour tout voir)
            </p>
          )}
        </div>
      </div>

      {/* Info message */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-700">
          💡 Cliquez sur une tâche pour voir ses logs dans la section Journal ci-dessous
        </p>
      </div>
    </div>
  );
}
