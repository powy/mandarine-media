/**
 * Log Viewer Component (Block D)
 * Real-time log streaming for selected task
 */

import { useEffect, useRef } from 'react';
import { useTaskLog } from '../hooks/useTasks';

export default function LogViewer({ taskId }) {
  const { log, loading, error, isPaused, togglePause, clearLog } = useTaskLog(taskId);
  const logContainerRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);

  // Auto-scroll to bottom when new log content arrives
  useEffect(() => {
    if (logContainerRef.current && shouldAutoScrollRef.current && !isPaused) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log, isPaused]);

  // Check if user has scrolled away from bottom
  const handleScroll = () => {
    if (!logContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    shouldAutoScrollRef.current = isAtBottom;
  };

  const scrollToBottom = () => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      shouldAutoScrollRef.current = true;
    }
  };

  // Highlight log lines based on severity
  const formatLog = (logText) => {
    if (!logText) return '';

    return logText.split('\n').map((line, index) => {
      let className = '';
      if (line.includes('[ERROR]')) className = 'log-error';
      else if (line.includes('[WARN]')) className = 'log-warn';
      else if (line.includes('[INFO]')) className = 'log-info';
      else if (line.includes('[DEBUG]')) className = 'log-debug';

      return (
        <div key={index} className={className}>
          {line}
        </div>
      );
    });
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">D. JOURNAL (Logs)</h2>

        <div className="flex gap-2">
          {taskId && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={togglePause}
                title={isPaused ? 'Reprendre la mise à jour auto' : 'Mettre en pause la mise à jour auto'}
              >
                {isPaused ? '▶️ Reprendre' : '⏸️ Pause'}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={scrollToBottom}
                title="Défiler vers le bas"
              >
                ⬇️ Bas
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={clearLog}
                title="Effacer l'affichage (ne supprime pas le fichier de log)"
              >
                🗑️ Effacer
              </button>
            </>
          )}
        </div>
      </div>

      <div
        ref={logContainerRef}
        className="log-viewer bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto"
        style={{ height: '400px', maxHeight: '400px' }}
        onScroll={handleScroll}
      >
        {!taskId ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">Aucune tâche sélectionnée</p>
              <p className="text-sm">Sélectionnez une tâche depuis la section Tâches ci-dessus pour voir ses logs</p>
            </div>
          </div>
        ) : loading && !log ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-4 border-gray-600 border-t-white rounded-full animate-spin mb-2" />
              <p className="text-sm text-gray-400">Chargement des logs...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-red-400">
            <p className="font-semibold">Erreur lors du chargement des logs :</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : log ? (
          <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
            {formatLog(log)}
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">
            <p>Aucun log disponible pour le moment</p>
            <p className="text-xs mt-2">Les logs apparaîtront quand la tâche commencera le traitement</p>
          </div>
        )}
      </div>

      {/* Status bar */}
      {taskId && (
        <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span>ID de Tâche : {taskId}</span>
            {isPaused && (
              <span className="text-yellow-600 font-semibold">
                ⏸️ En pause
              </span>
            )}
            {!shouldAutoScrollRef.current && !isPaused && (
              <span className="text-blue-600">
                📌 Défilement auto désactivé (défiler vers le bas pour réactiver)
              </span>
            )}
          </div>
          <div>
            {log && <span>{log.split('\n').length} lignes</span>}
          </div>
        </div>
      )}
    </div>
  );
}
