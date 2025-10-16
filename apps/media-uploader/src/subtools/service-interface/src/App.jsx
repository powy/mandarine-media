/**
 * Main Application Component
 * Model Uploader Interface
 */

import { useState } from 'react';
import { useTasks, useCreateTask, useStopTask, useHealth } from './hooks/useTasks';
import InputSection from './components/InputSection';
import ActionsSection from './components/ActionsSection';
import TasksSection from './components/TasksSection';
import LogViewer from './components/LogViewer';

function App() {
  // State for inputs
  const [inputs, setInputs] = useState({
    configFile: '',
    folder: '',
    parentFolder: '',
    picture: '',
    resolution: '',
    subtitle: '',
    language: ''
  });

  // State for validation errors
  const [errors, setErrors] = useState({});

  // State for selected task
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Hooks
  const { runningTasks, finishedTasks, loading: tasksLoading, error: tasksError } = useTasks(2000);
  const { createTask, creating, error: createError } = useCreateTask();
  const { stopTask } = useStopTask();
  const { health, isHealthy } = useHealth(30000);

  // Handle task creation
  const handleCreateTask = async (taskType, parameters) => {
    try {
      setErrors({});
      const result = await createTask(taskType, parameters);

      if (result.success) {
        // Select the newly created task
        setSelectedTaskId(result.task.id);

        // Show success notification
        console.log('Task created:', result.task);
      }
    } catch (err) {
      console.error('Failed to create task:', err);
      setErrors({ general: err.message });
    }
  };

  // Handle task selection
  const handleSelectTask = (taskId) => {
    setSelectedTaskId(taskId);
  };

  // Handle task stop
  const handleStopTask = async (taskId) => {
    try {
      await stopTask(taskId);
      console.log('Task stopped:', taskId);
    } catch (err) {
      console.error('Failed to stop task:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">MEDIA UPLOADER</h1>
              <p className="text-blue-100 text-sm mt-1">Model Uploader Service Interface</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Health Status */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isHealthy ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
                <span className="text-sm">
                  {isHealthy ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {/* Version */}
              <span className="text-sm text-blue-200">v1.0.0</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Error Messages */}
        {tasksError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-semibold">Error loading tasks:</p>
            <p className="text-red-700 text-sm mt-1">{tasksError}</p>
          </div>
        )}

        {createError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-semibold">Error creating task:</p>
            <p className="text-red-700 text-sm mt-1">{createError}</p>
          </div>
        )}

        {errors.general && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-semibold">Error:</p>
            <p className="text-red-700 text-sm mt-1">{errors.general}</p>
          </div>
        )}

        {/* Top Section: Inputs and Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <InputSection
            inputs={inputs}
            onChange={setInputs}
            errors={errors}
          />
          <ActionsSection
            inputs={inputs}
            onCreateTask={handleCreateTask}
            creating={creating}
          />
        </div>

        {/* Tasks Section */}
        <div className="mb-6">
          <TasksSection
            runningTasks={runningTasks}
            finishedTasks={finishedTasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={handleSelectTask}
            onStopTask={handleStopTask}
          />
        </div>

        {/* Log Viewer */}
        <div>
          <LogViewer taskId={selectedTaskId} />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <p>Model Uploader Service Interface</p>
              <p className="text-xs text-gray-500 mt-1">
                Server: {health?.status === 'healthy' ? `http://localhost:${health?.system?.port || 3011}` : 'Not connected'}
              </p>
            </div>
            <div className="text-right">
              <p>Tasks: {runningTasks.length} running, {finishedTasks.length} finished</p>
              {health?.uptime && (
                <p className="text-xs text-gray-500 mt-1">
                  Uptime: {Math.floor(health.uptime / 60)}m {health.uptime % 60}s
                </p>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
