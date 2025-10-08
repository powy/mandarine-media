/**
 * Mock Data and Test Fixtures
 * Provides consistent test data across all test files
 */

import { TASK_TYPES, TASK_STATES } from '../../taskManager.js';

export const mockConfigs = {
  basic: {
    configPath: '/test/config.ini',
    environment: 'test'
  },

  withMux: {
    configPath: '/test/mux-config.ini',
    muxSettings: {
      playbackPolicy: 'public',
      encoding: 'standard',
      webhookUrl: 'https://example.com/webhook'
    }
  },

  withS3: {
    configPath: '/test/s3-config.ini',
    s3Settings: {
      bucket: 'test-media-bucket',
      region: 'us-east-1',
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      prefix: 'uploads/'
    }
  },

  withSubtitles: {
    configPath: '/test/subtitle-config.ini',
    subtitleSettings: {
      languages: ['en', 'fr', 'es'],
      format: 'srt',
      autoGenerate: false,
      webhookUrl: 'https://example.com/subtitle-webhook'
    }
  },

  workflow: {
    configPath: '/test/workflow-config.ini',
    workflow: {
      steps: [
        'analyze',
        'upload-mux',
        'upload-pictures',
        'upload-subtitles',
        'generate-excel'
      ],
      parallel: false,
      continueOnError: false
    }
  }
};

export const mockRequests = {
  mediaAnalyzer: {
    basic: {
      folderPath: '/test/media/basic',
      config: mockConfigs.basic,
      options: {
        includeMetadata: true,
        generateThumbnails: false,
        timeout: 300000
      }
    },

    withThumbnails: {
      folderPath: '/test/media/thumbnails',
      config: mockConfigs.basic,
      options: {
        includeMetadata: true,
        generateThumbnails: true,
        thumbnailSize: '320x240',
        thumbnailFormat: 'jpg'
      }
    },

    largeDataset: {
      folderPath: '/test/media/large',
      config: mockConfigs.basic,
      options: {
        includeMetadata: true,
        recursive: true,
        maxFiles: 1000,
        timeout: 1800000 // 30 minutes
      }
    }
  },

  uploads: {
    mux: {
      folderPath: '/test/uploads/mux',
      config: mockConfigs.withMux,
      options: {
        skipExisting: false,
        webhookOnComplete: true,
        priority: 'normal'
      }
    },

    picture: {
      folderPath: '/test/uploads/pictures',
      config: mockConfigs.withS3,
      options: {
        imageFormats: ['jpg', 'png', 'webp'],
        resizeOptions: {
          width: 1920,
          height: 1080,
          quality: 85,
          format: 'jpg'
        },
        generateThumbnails: true
      }
    },

    subtitle: {
      folderPath: '/test/uploads/subtitles',
      config: mockConfigs.withSubtitles,
      options: {
        validateSrt: true,
        encodingOptions: {
          charset: 'utf-8',
          lineEndings: 'crlf'
        }
      }
    },

    single: {
      folderPath: '/test/uploads/single',
      config: mockConfigs.workflow,
      options: {
        skipAnalysis: false,
        overwriteExisting: true,
        generateReports: true
      }
    },

    batch: {
      batchFolders: [
        '/test/batch/folder1',
        '/test/batch/folder2',
        '/test/batch/folder3'
      ],
      config: mockConfigs.workflow,
      options: {
        sequential: true,
        continueOnError: false,
        maxRetries: 3,
        progressInterval: 5000
      }
    },

    parallel: {
      batchFolders: [
        '/test/parallel/folder1',
        '/test/parallel/folder2',
        '/test/parallel/folder3',
        '/test/parallel/folder4'
      ],
      config: mockConfigs.workflow,
      options: {
        maxConcurrent: 3,
        priority: 'high',
        resourceLimits: {
          maxMemory: '4GB',
          maxCpu: 80,
          maxDiskSpace: '10GB'
        }
      }
    }
  },

  excel: {
    prepare: {
      excelPath: '/test/excel/input.xlsx',
      outputPath: '/test/excel/output/',
      config: mockConfigs.basic,
      options: {
        sheetName: 'MediaList',
        includeMetadata: true,
        generateThumbnails: false
      }
    },

    bulkEdit: {
      excelPath: '/test/excel/bulk-edit.xlsx',
      outputPath: '/test/excel/bulk-output/',
      config: mockConfigs.basic,
      options: {
        sheetName: 'MediaList',
        operations: [
          {
            column: 'Title',
            operation: 'replace',
            find: 'old-title',
            replace: 'new-title'
          },
          {
            column: 'Tags',
            operation: 'append',
            value: 'processed'
          }
        ]
      }
    }
  }
};

export const mockResults = {
  mediaAnalyzer: {
    success: {
      filesProcessed: 15,
      videoFiles: 8,
      imageFiles: 12,
      subtitleFiles: 6,
      totalSize: '2.5GB',
      duration: '01:23:45',
      metadata: {
        avgBitrate: '5.2 Mbps',
        avgResolution: '1920x1080',
        avgFrameRate: '24 fps',
        codecs: ['H.264', 'AAC']
      },
      thumbnails: {
        generated: 8,
        totalSize: '15.2MB',
        format: 'jpg'
      }
    },

    partial: {
      filesProcessed: 8,
      videoFiles: 5,
      imageFiles: 3,
      errors: [
        'Corrupted file: video_003.mp4',
        'Unsupported format: image_007.tiff'
      ],
      warnings: [
        'Low resolution detected: video_001.mp4',
        'Missing metadata: video_004.mp4'
      ]
    }
  },

  uploads: {
    mux: {
      success: {
        videosUploaded: 8,
        totalSize: '1.8GB',
        processingTime: '00:45:23',
        assets: [
          {
            assetId: 'mux_asset_001',
            playbackId: 'playback_001',
            status: 'ready'
          },
          {
            assetId: 'mux_asset_002',
            playbackId: 'playback_002',
            status: 'ready'
          }
        ]
      }
    },

    picture: {
      success: {
        imagesUploaded: 12,
        totalSize: '45.6MB',
        resized: 12,
        thumbnailsGenerated: 12,
        s3Objects: [
          's3://test-bucket/uploads/image_001.jpg',
          's3://test-bucket/uploads/image_002.jpg'
        ]
      }
    },

    subtitle: {
      success: {
        subtitlesUploaded: 6,
        languages: ['en', 'fr', 'es'],
        totalDuration: '02:15:30',
        validated: true,
        encoding: 'utf-8'
      }
    }
  }
};

export const mockErrors = {
  validation: {
    missingFolderPath: {
      field: 'folderPath',
      message: 'folderPath is required'
    },

    invalidConfig: {
      field: 'config.configPath',
      message: 'configPath must be a valid file path'
    },

    invalidTimeout: {
      field: 'options.timeout',
      message: 'timeout must be a positive number'
    },

    invalidBatchSize: {
      field: 'batchFolders',
      message: 'batchFolders cannot exceed 100 items'
    }
  },

  processing: {
    fileNotFound: 'Folder not found: /nonexistent/path',

    permissionDenied: 'Permission denied accessing: /restricted/folder',

    corruptedFile: 'Corrupted or unreadable file: video_corrupted.mp4',

    unsupportedFormat: 'Unsupported file format: .unknown',

    diskSpaceFull: 'Insufficient disk space for operation',

    networkTimeout: 'Network timeout during upload operation',

    configError: 'Invalid configuration file: missing required settings'
  },

  worker: {
    spawnFailed: 'Failed to spawn worker process: ENOENT',

    processKilled: 'Worker process was killed unexpectedly',

    memoryExceeded: 'Worker process exceeded memory limit',

    timeout: 'Worker process timed out after 600000ms',

    ipcError: 'IPC communication error with worker process'
  }
};

export const mockTaskStates = {
  pending: {
    id: 'task-pending-001',
    type: TASK_TYPES.MEDIA_ANALYZER,
    status: TASK_STATES.PENDING,
    progress: 0,
    message: null,
    createdAt: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
    updatedAt: new Date(Date.now() - 30000).toISOString()
  },

  running: {
    id: 'task-running-001',
    type: TASK_TYPES.MUX_UPLOAD,
    status: TASK_STATES.RUNNING,
    progress: 45,
    message: 'Uploading video files...',
    createdAt: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
    updatedAt: new Date(Date.now() - 5000).toISOString(),   // 5 seconds ago
    startedAt: new Date(Date.now() - 90000).toISOString()   // 1.5 minutes ago
  },

  completed: {
    id: 'task-completed-001',
    type: TASK_TYPES.PICTURE_UPLOAD,
    status: TASK_STATES.COMPLETED,
    progress: 100,
    message: 'All images uploaded successfully',
    result: mockResults.uploads.picture.success,
    createdAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    updatedAt: new Date(Date.now() - 60000).toISOString(),  // 1 minute ago
    startedAt: new Date(Date.now() - 280000).toISOString(), // 4.5 minutes ago
    completedAt: new Date(Date.now() - 60000).toISOString() // 1 minute ago
  },

  failed: {
    id: 'task-failed-001',
    type: TASK_TYPES.SINGLE_UPLOAD,
    status: TASK_STATES.FAILED,
    progress: 25,
    message: 'Failed during video processing',
    error: mockErrors.processing.corruptedFile,
    createdAt: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
    updatedAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    startedAt: new Date(Date.now() - 580000).toISOString(), // 9.5 minutes ago
    completedAt: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
  },

  cancelled: {
    id: 'task-cancelled-001',
    type: TASK_TYPES.BATCH_UPLOAD,
    status: TASK_STATES.CANCELLED,
    progress: 60,
    message: 'Task cancelled by user',
    createdAt: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
    updatedAt: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
    startedAt: new Date(Date.now() - 870000).toISOString(), // 14.5 minutes ago
    completedAt: new Date(Date.now() - 600000).toISOString() // 10 minutes ago
  }
};

export const mockWorkerMessages = {
  start: {
    type: 'START',
    taskId: 'test-task-123',
    taskData: mockRequests.mediaAnalyzer.basic
  },

  progress: {
    type: 'PROGRESS',
    taskId: 'test-task-123',
    progress: 50,
    message: 'Processing video files...'
  },

  success: {
    type: 'SUCCESS',
    taskId: 'test-task-123',
    result: mockResults.mediaAnalyzer.success
  },

  error: {
    type: 'ERROR',
    taskId: 'test-task-123',
    error: mockErrors.processing.corruptedFile,
    stack: 'Error: Corrupted file\n    at processFile (worker.js:123:45)'
  },

  log: {
    type: 'LOG',
    level: 'info',
    message: 'Starting file analysis',
    data: {
      folder: '/test/media',
      fileCount: 15
    },
    timestamp: new Date().toISOString()
  },

  cancel: {
    type: 'CANCEL',
    taskId: 'test-task-123'
  }
};

export const createMockTask = (overrides = {}) => ({
  ...mockTaskStates.pending,
  id: `mock-task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  request: mockRequests.mediaAnalyzer.basic,
  ...overrides
});

export const createMockWorkerProcess = () => {
  const EventEmitter = require('events');
  const mockProcess = new EventEmitter();

  mockProcess.pid = Math.floor(Math.random() * 10000) + 1000;
  mockProcess.kill = jest.fn(() => true);
  mockProcess.send = jest.fn();
  mockProcess.stdout = new EventEmitter();
  mockProcess.stderr = new EventEmitter();
  mockProcess.killed = false;
  mockProcess.exitCode = null;

  // Helper methods for testing
  mockProcess.simulateMessage = (message) => {
    mockProcess.emit('message', message);
  };

  mockProcess.simulateExit = (code = 0, signal = null) => {
    mockProcess.exitCode = code;
    mockProcess.killed = signal !== null;
    mockProcess.emit('exit', code, signal);
  };

  mockProcess.simulateError = (error) => {
    mockProcess.emit('error', error);
  };

  mockProcess.simulateOutput = (data, isError = false) => {
    const stream = isError ? mockProcess.stderr : mockProcess.stdout;
    stream.emit('data', data);
  };

  return mockProcess;
};

export const createTestDataset = (count = 10) => {
  const tasks = [];
  const types = Object.values(TASK_TYPES);
  const states = Object.values(TASK_STATES);

  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const state = states[i % states.length];

    const task = createMockTask({
      type,
      status: state,
      progress: state === TASK_STATES.COMPLETED ? 100 : Math.floor(Math.random() * 100),
      createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString(), // Random time in last 24 hours
      message: state === TASK_STATES.RUNNING ? `Processing ${type}...` : null
    });

    if (state === TASK_STATES.COMPLETED) {
      task.result = mockResults.mediaAnalyzer.success;
    } else if (state === TASK_STATES.FAILED) {
      task.error = mockErrors.processing.fileNotFound;
    }

    tasks.push(task);
  }

  return tasks;
};

export default {
  mockConfigs,
  mockRequests,
  mockResults,
  mockErrors,
  mockTaskStates,
  mockWorkerMessages,
  createMockTask,
  createMockWorkerProcess,
  createTestDataset
};