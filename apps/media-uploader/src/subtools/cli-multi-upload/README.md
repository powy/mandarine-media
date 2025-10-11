# CLI Multi-Upload Tool

Upload multiple folders with subprocess-based parallel execution and staggered starts.

## Features

- **Subprocess Isolation**: Each upload runs in a separate Node.js process for complete isolation
- **Staggered Starts**: Configurable delay (default 10s) between starting each upload
- **Multiple Input Methods**:
  - Explicit folder list (comma-separated)
  - Text file with folder paths
  - Auto-detect subfolders from parent folder
- **Progress Tracking**: Real-time progress updates for each upload
- **Concurrency Control**: Optional limit on maximum concurrent uploads
- **Detailed Reporting**: Optional summary report with results for all uploads

## Usage

### Via Main CLI

```bash
# Upload all subfolders in a parent folder
media-uploader cli-multi-upload --config config.ini --parent-folder /path/to/season

# Upload specific folders (comma-separated)
media-uploader cli-multi-upload --config config.ini --folders "/path/folder1,/path/folder2,/path/folder3"

# Upload folders from text file
media-uploader cli-multi-upload --config config.ini --folders-file folders.txt

# Custom delay and max concurrent uploads
media-uploader cli-multi-upload --config config.ini --parent-folder /path/to/season -d 15 --max-concurrent 3

# Verbose mode with detailed report
media-uploader cli-multi-upload --config config.ini --parent-folder /path/to/season -v --report
```

### Programmatic Usage

```javascript
import {
  cliMultiUpload,
  cliMultiUploadFromParent,
  cliMultiUploadFromFile,
  cliMultiUploadFromString
} from './subtools/cli-multi-upload/wrapper.js';

// Upload from array of folders
const result = await cliMultiUpload({
  config: './config.ini',
  folders: ['/path/folder1', '/path/folder2', '/path/folder3'],
  delay: 10,
  verbose: true
});

// Upload from parent folder (auto-detect subfolders)
const result = await cliMultiUploadFromParent({
  config: './config.ini',
  parentFolder: '/path/to/season',
  delay: 10,
  maxConcurrent: 5
});

// Upload from text file
const result = await cliMultiUploadFromFile({
  config: './config.ini',
  foldersFile: './folders.txt',
  delay: 15
});

// Upload from comma-separated string
const result = await cliMultiUploadFromString({
  config: './config.ini',
  foldersString: '/path/folder1,/path/folder2',
  delay: 10
});
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --config <path>` | Path to INI configuration file (required) | - |
| `-f, --folders <list>` | Comma-separated list of folder paths | - |
| `--folders-file <path>` | Text file with folder paths (one per line) | - |
| `-p, --parent-folder <path>` | Parent folder to scan for subfolders | - |
| `-d, --delay <seconds>` | Delay between starting each upload | 10 |
| `--max-concurrent <number>` | Maximum concurrent uploads | unlimited |
| `-v, --verbose` | Verbose logging | false |
| `--report` | Generate detailed summary report | false |

## Folders File Format

Create a text file (e.g., `folders.txt`) with one folder path per line:

```
/path/to/folder1
/path/to/folder2
/path/to/folder3
# Comments start with #
/path/to/folder4
```

## Architecture

### Process Flow

1. **Input Validation**: Validates config file and folder paths
2. **Subprocess Creation**: For each folder, forks a new Node.js process
3. **Staggered Execution**: Waits specified delay (default 10s) between each process start
4. **Upload Execution**: Each process runs `singleUploadFromIni()` independently
5. **Result Collection**: Parent process collects results from all subprocesses
6. **Summary Report**: Generates final report with all results

### Subprocess Isolation

Each upload runs in a completely separate Node.js process using `child_process.fork()`:
- **Independence**: One failure doesn't affect other uploads
- **Resource Isolation**: Each process has its own memory space
- **Better Debugging**: Each upload can be monitored independently

### Staggered Starts

By default, each upload process starts 10 seconds after the previous one:
- **Resource Management**: Prevents overwhelming system resources
- **Sequential Initialization**: Reduces contention during upload initialization
- **Predictable Load**: Makes it easier to monitor system load

### Concurrency Control

Optional `--max-concurrent` parameter limits simultaneous uploads:
- Processes wait if limit is reached
- New processes start as others complete
- Combines well with staggered starts for fine-grained control

## Differences from Existing Batch Upload

| Feature | `cli-multi-upload` | `batchUploadFromIni` |
|---------|-------------------|---------------------|
| Execution Model | Subprocess-based | Worker pool |
| Start Timing | Fixed delay (10s default) | Start as workers available |
| Input Method | Flexible (list/file/parent) | Parent folder only |
| Process Isolation | Complete (separate processes) | Shared memory (threads) |
| Use Case | CLI with explicit folder control | Programmatic batch processing |

## Examples

### Example 1: Upload Season with Episodes

```bash
# Parent folder structure:
# /series/season-01/
#   ├── 0_desc.xlsx (season)
#   ├── episode-01/
#   ├── episode-02/
#   └── episode-03/

media-uploader cli-multi-upload \
  --config config.ini \
  --parent-folder /series/season-01 \
  --delay 10 \
  --verbose
```

### Example 2: Upload Specific Folders

```bash
media-uploader cli-multi-upload \
  --config config.ini \
  --folders "/path/ep1,/path/ep2,/path/ep3" \
  --delay 15 \
  --max-concurrent 2
```

### Example 3: Upload from File

```bash
# Create folders.txt with:
# /path/to/episode-01
# /path/to/episode-02
# /path/to/episode-03

media-uploader cli-multi-upload \
  --config config.ini \
  --folders-file folders.txt \
  --delay 10 \
  --report
```

## Result Object

The upload functions return a result object with the following structure:

```javascript
{
  success: true,                    // Overall success status
  totalFolders: 3,                  // Total folders processed
  successCount: 2,                  // Number of successful uploads
  failedCount: 1,                   // Number of failed uploads
  skippedCount: 0,                  // Number of skipped folders
  results: [                        // Detailed results for each folder
    {
      folder: '/path/to/folder1',
      folderName: 'folder1',
      success: true,
      result: { /* upload result */ },
      duration: '45.2',             // Duration in seconds
      index: 0
    },
    // ...
  ],
  invalidFolders: [                 // Invalid/skipped folders
    {
      path: '/invalid/path',
      reason: 'Path does not exist'
    }
  ]
}
```

## Error Handling

- **Process Failures**: If a subprocess crashes, it's logged but doesn't stop other uploads
- **Upload Errors**: Failed uploads are tracked and reported in the final summary
- **Invalid Paths**: Invalid folder paths are skipped with warnings
- **Config Errors**: Configuration errors stop execution immediately

## Integration with Existing Tools

The CLI Multi-Upload tool leverages existing infrastructure:

- **Upload Logic**: Uses `singleUploadFromIni()` from `iniInterface.js`
- **Config Handling**: Compatible with existing `.ini` configuration files
- **Excel Processing**: Uses same Excel workflow as single uploads
- **Backend API**: Same API endpoints as other upload tools

## Contributing

When extending this tool:

1. **Maintain subprocess isolation**: Keep each upload in separate process
2. **Preserve staggered starts**: Critical for resource management
3. **Follow existing patterns**: Use similar structure to other subtools
4. **Update tests**: Add tests for new functionality

## License

MIT
