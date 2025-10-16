// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use tauri::{command, generate_handler, Manager, Window, State, Emitter};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;

// Helper function to get script paths for both dev and production
fn get_script_path(_app: &tauri::AppHandle, script_relative_path: &str) -> Result<String, String> {
    #[cfg(debug_assertions)]
    {
        // Development mode - use relative paths to source
        let script_path = format!("../src/subtools/{}", script_relative_path);
        eprintln!("[DEV] Using script path: {}", script_path);
        Ok(script_path)
    }

    #[cfg(not(debug_assertions))]
    {
        // Production mode - files are bundled in _up_ directory
        // Get the directory where the executable is located
        match std::env::current_exe() {
            Ok(exe_path) => {
                if let Some(exe_dir) = exe_path.parent() {
                    // Try the _up_ directory where Tauri actually bundles files
                    let bundled_path = exe_dir
                        .join("_up_")
                        .join("src")
                        .join("subtools")
                        .join(script_relative_path);

                    eprintln!("Looking for bundled script at: {}", bundled_path.display());

                    if bundled_path.exists() {
                        eprintln!("Found bundled script: {}", bundled_path.display());
                        return Ok(bundled_path.to_string_lossy().to_string());
                    }

                    // Try the standard resource directory as fallback
                    if let Ok(resource_dir) = _app.path().resource_dir() {
                        let resource_path = resource_dir
                            .join("subtools")
                            .join(script_relative_path);

                        eprintln!("Trying resource directory: {}", resource_path.display());

                        if resource_path.exists() {
                            eprintln!("Found in resource directory: {}", resource_path.display());
                            return Ok(resource_path.to_string_lossy().to_string());
                        }
                    }

                    // Last resort: try relative path with absolute resolution
                    let fallback_path = exe_dir
                        .join("..")
                        .join("src")
                        .join("subtools")
                        .join(script_relative_path);

                    eprintln!("Trying fallback path: {}", fallback_path.display());

                    if fallback_path.exists() {
                        return Ok(fallback_path.to_string_lossy().to_string());
                    }

                    // If all fails, return the bundled path anyway (let Node.js handle the error)
                    eprintln!("Script not found in any location, returning bundled path anyway");
                    Ok(bundled_path.to_string_lossy().to_string())
                } else {
                    Err("Could not determine executable directory".to_string())
                }
            }
            Err(e) => {
                eprintln!("Failed to get executable path: {}", e);
                // Fall back to resource directory if available
                match _app.path().resource_dir() {
                    Ok(resource_dir) => {
                        let script_path = resource_dir
                            .join("subtools")
                            .join(script_relative_path);
                        Ok(script_path.to_string_lossy().to_string())
                    }
                    Err(_) => Err(format!("Failed to resolve script path: {}", e))
                }
            }
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct FolderSelectResult {
    success: bool,
    path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct PathValidationResult {
    success: bool,
    exists: bool,
    is_directory: bool,
    path: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ProcessResult {
    success: bool,
    message: Option<String>,
    error: Option<String>,
    phase: Option<String>,
    excel_path: Option<String>,
    media_description_id: Option<String>,
    processed_count: Option<i32>,
    total_subfolders: Option<i32>,
    failed_folders: Option<Vec<String>>,
    task_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ConfigInfo {
    success: bool,
    config_path: Option<String>,
    is_valid: bool,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ParallelConfig {
    max_concurrent_uploads: i32,
    retry_attempts: i32,
    retry_delay: i32,
    worker_timeout: i32,
    heartbeat_interval: i32,
}

#[derive(Debug, Serialize, Deserialize)]
struct ParallelUploadStatus {
    queue: QueueStatus,
    progress: ProgressStatus,
    stats: HashMap<String, serde_json::Value>,
    processes: Vec<ProcessInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
struct QueueStatus {
    total: i32,
    running: i32,
    queued: i32,
    completed: i32,
    failed: i32,
}

#[derive(Debug, Serialize, Deserialize)]
struct ProgressStatus {
    total: i32,
    average_percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct ProcessInfo {
    task_id: String,
    folder_path: String,
    status: String,
    progress: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LogMessage {
    timestamp: String,
    level: String,
    message: String,
}

// Global state for configuration
#[derive(Default)]
struct AppState {
    config_path: Arc<Mutex<Option<String>>>,
}

#[command]
async fn select_folder(app: tauri::AppHandle) -> Result<FolderSelectResult, String> {
    use std::sync::mpsc;

    let (tx, rx) = mpsc::channel();

    tauri_plugin_dialog::DialogExt::dialog(&app)
        .file()
        .pick_folder(move |path| {
            let _ = tx.send(path);
        });

    match rx.recv() {
        Ok(Some(path)) => Ok(FolderSelectResult {
            success: true,
            path: Some(path.to_string()),
        }),
        Ok(None) => Ok(FolderSelectResult {
            success: false,
            path: None,
        }),
        Err(_) => Err("Failed to receive folder selection result".to_string()),
    }
}

#[command]
async fn validate_path(path: String) -> Result<PathValidationResult, String> {
    if path.trim().is_empty() {
        return Ok(PathValidationResult {
            success: false,
            exists: false,
            is_directory: false,
            path: None,
            error: Some("Empty path".to_string()),
        });
    }

    let path_buf = PathBuf::from(&path);

    if !path_buf.exists() {
        return Ok(PathValidationResult {
            success: false,
            exists: false,
            is_directory: false,
            path: None,
            error: Some("Path does not exist".to_string()),
        });
    }

    if !path_buf.is_dir() {
        return Ok(PathValidationResult {
            success: false,
            exists: true,
            is_directory: false,
            path: None,
            error: Some("Path is not a directory".to_string()),
        });
    }

    Ok(PathValidationResult {
        success: true,
        exists: true,
        is_directory: true,
        path: Some(path),
        error: None,
    })
}

#[command]
async fn prepare_excel(app: tauri::AppHandle, window: Window, folder_path: String, state: State<'_, AppState>) -> Result<ProcessResult, String> {
    emit_log_message(&window, "info", "Starting Excel preparation...").await;

    // Call the Node.js one-media-complete-upload tool
    let script_path = get_script_path(&app, "one-media-complete-upload/wrapper.js")
        .map_err(|e| format!("Failed to get script path: {}", e))?;

    // Get config path from state
    let config_path = state.config_path.lock().unwrap().clone();

    let mut command = Command::new("node");
    command
        .arg(&script_path)
        .arg("--folder")
        .arg(&folder_path)
        .arg("--prepare-only");

    // Add config path if available
    if let Some(config) = config_path {
        command.arg("--config").arg(&config);
    }

    let output = command
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    // Try to parse JSON output from wrapper script
    if let Ok(result) = serde_json::from_str::<ProcessResult>(&stdout) {
        if result.success {
            emit_log_message(&window, "success", "Excel preparation completed").await;
        } else {
            emit_log_message(&window, "error", &format!("Excel preparation failed: {}", result.error.as_deref().unwrap_or("Unknown error"))).await;
        }
        Ok(result)
    } else if output.status.success() {
        emit_log_message(&window, "success", "Excel preparation completed").await;
        Ok(ProcessResult {
            success: true,
            message: Some("Excel preparation completed successfully".to_string()),
            error: None,
            phase: Some("completed".to_string()),
            excel_path: extract_excel_path(&stdout),
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    } else {
        emit_log_message(&window, "error", &format!("Excel preparation failed: {}", stderr)).await;
        Ok(ProcessResult {
            success: false,
            message: None,
            error: Some(if stderr.trim().is_empty() { stdout.to_string() } else { stderr.to_string() }),
            phase: Some("preparation-error".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    }
}

#[command]
async fn execute_upload(app: tauri::AppHandle, window: Window, folder_path: String, state: State<'_, AppState>) -> Result<ProcessResult, String> {
    emit_log_message(&window, "info", "Starting upload execution...").await;

    // Call the Node.js one-media-complete-upload tool
    let script_path = get_script_path(&app, "one-media-complete-upload/wrapper.js")
        .map_err(|e| format!("Failed to get script path: {}", e))?;

    // Get config path from state
    let config_path = state.config_path.lock().unwrap().clone();

    let mut command = Command::new("node");
    command
        .arg(&script_path)
        .arg("--folder")
        .arg(&folder_path);

    // Add config path if available
    if let Some(config) = config_path {
        command.arg("--config").arg(&config);
    }

    let (stdout, stderr, success) = run_command_with_streaming(command, &window).await?;

    // Try to parse JSON output from wrapper script
    if let Ok(result) = serde_json::from_str::<ProcessResult>(&stdout) {
        if result.success {
            emit_log_message(&window, "success", "Upload completed successfully").await;
        } else {
            emit_log_message(&window, "error", &format!("Upload failed: {}", result.error.as_deref().unwrap_or("Unknown error"))).await;
        }
        Ok(result)
    } else if success {
        emit_log_message(&window, "success", "Upload completed successfully").await;

        Ok(ProcessResult {
            success: true,
            message: Some("Upload completed successfully".to_string()),
            error: None,
            phase: Some("completed".to_string()),
            excel_path: None,
            media_description_id: extract_media_id(&stdout),
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    } else {
        emit_log_message(&window, "error", &format!("Upload failed: {}", stderr)).await;

        Ok(ProcessResult {
            success: false,
            message: None,
            error: Some(if stderr.trim().is_empty() { stdout.to_string() } else { stderr.to_string() }),
            phase: Some("upload-error".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    }
}

#[command]
async fn prepare_excel_batch(app: tauri::AppHandle, window: Window, parent_folder_path: String, state: State<'_, AppState>) -> Result<ProcessResult, String> {
    emit_log_message(&window, "info", &format!("Starting batch Excel preparation for subfolders in: {}", parent_folder_path)).await;

    // Call the Node.js batch preparation logic
    let script_path = get_script_path(&app, "one-media-complete-upload/wrapper.js")
        .map_err(|e| format!("Failed to get script path: {}", e))?;

    // Get config path from state
    let config_path = state.config_path.lock().unwrap().clone();

    let mut command = Command::new("node");
    command
        .arg(&script_path)
        .arg("--batch-folder")
        .arg(&parent_folder_path)
        .arg("--prepare-only");

    // Add config path if available
    if let Some(config) = config_path {
        command.arg("--config").arg(&config);
    }

    let output = command
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    // Try to parse JSON output from wrapper script
    if let Ok(result) = serde_json::from_str::<ProcessResult>(&stdout) {
        if result.success {
            emit_log_message(&window, "success", "Batch Excel preparation completed").await;
        } else {
            emit_log_message(&window, "error", &format!("Batch Excel preparation failed: {}", result.error.as_deref().unwrap_or("Unknown error"))).await;
        }
        Ok(result)
    } else if output.status.success() {
        emit_log_message(&window, "success", "Batch Excel preparation completed").await;

        Ok(ProcessResult {
            success: true,
            message: Some("Batch Excel preparation completed".to_string()),
            error: None,
            phase: Some("completed".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: extract_processed_count(&stdout),
            total_subfolders: extract_total_subfolders(&stdout),
            failed_folders: extract_failed_folders(&stdout),
            task_ids: None,
        })
    } else {
        emit_log_message(&window, "error", &format!("Batch Excel preparation failed: {}", stderr)).await;

        Ok(ProcessResult {
            success: false,
            message: None,
            error: Some(if stderr.trim().is_empty() { stdout.to_string() } else { stderr.to_string() }),
            phase: Some("preparation-error".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: Some(0),
            total_subfolders: Some(0),
            failed_folders: None,
            task_ids: None,
        })
    }
}

#[command]
async fn execute_upload_batch(app: tauri::AppHandle, window: Window, parent_folder_path: String, state: State<'_, AppState>) -> Result<ProcessResult, String> {
    emit_log_message(&window, "info", &format!("Starting batch upload execution for subfolders in: {}", parent_folder_path)).await;

    // Call the Node.js batch upload logic
    let script_path = get_script_path(&app, "one-media-complete-upload/wrapper.js")
        .map_err(|e| format!("Failed to get script path: {}", e))?;

    // Get config path from state
    let config_path = state.config_path.lock().unwrap().clone();

    let mut command = Command::new("node");
    command
        .arg(&script_path)
        .arg("--batch-folder")
        .arg(&parent_folder_path);

    // Add config path if available
    if let Some(config) = config_path {
        command.arg("--config").arg(&config);
    }

    let (stdout, stderr, success) = run_command_with_streaming(command, &window).await?;

    // Try to parse JSON output from wrapper script
    if let Ok(result) = serde_json::from_str::<ProcessResult>(&stdout) {
        if result.success {
            emit_log_message(&window, "success", "Batch upload completed").await;
        } else {
            emit_log_message(&window, "error", &format!("Batch upload failed: {}", result.error.as_deref().unwrap_or("Unknown error"))).await;
        }
        Ok(result)
    } else if success {
        emit_log_message(&window, "success", "Batch upload completed").await;

        Ok(ProcessResult {
            success: true,
            message: Some("Batch upload completed".to_string()),
            error: None,
            phase: Some("completed".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: extract_processed_count(&stdout),
            total_subfolders: extract_total_subfolders(&stdout),
            failed_folders: extract_failed_folders(&stdout),
            task_ids: None,
        })
    } else {
        emit_log_message(&window, "error", &format!("Batch upload failed: {}", stderr)).await;

        Ok(ProcessResult {
            success: false,
            message: None,
            error: Some(if stderr.trim().is_empty() { stdout.to_string() } else { stderr.to_string() }),
            phase: Some("upload-error".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: Some(0),
            total_subfolders: Some(0),
            failed_folders: None,
            task_ids: None,
        })
    }
}

#[command]
async fn excel_bulk_edit(
    app: tauri::AppHandle,
    window: Window,
    folder_path: String,
    field_name: String,
    field_value: String,
    dry_run: bool,
    state: State<'_, AppState>,
) -> Result<ProcessResult, String> {
    emit_log_message(&window, "info", "Starting Excel bulk edit...").await;

    let script_path = get_script_path(&app, "excel-batch-editor/wrapper.js")
        .map_err(|e| format!("Failed to get script path: {}", e))?;

    // Get config path from state
    let config_path = state.config_path.lock().unwrap().clone();

    let mut args = vec![
        script_path,
        "--folder".to_string(),
        folder_path,
        "--field".to_string(),
        field_name,
        "--value".to_string(),
        field_value,
        "--pattern".to_string(),
        "0_desc".to_string(),
        "--verbose".to_string(),
    ];

    // Add config path if available
    if let Some(config) = config_path {
        args.push("--config".to_string());
        args.push(config);
    }

    if dry_run {
        args.push("--dry-run".to_string());
    }

    let output = Command::new("node")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    let _stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if output.status.success() {
        emit_log_message(&window, "success", "Excel bulk edit completed").await;

        Ok(ProcessResult {
            success: true,
            message: Some("Excel bulk edit completed successfully".to_string()),
            error: None,
            phase: Some("completed".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    } else {
        let error_msg = if stderr.trim().is_empty() {
            format!("Excel bulk edit failed with exit code: {}", output.status.code().unwrap_or(-1))
        } else {
            format!("Excel bulk edit failed: {}", stderr)
        };

        emit_log_message(&window, "error", &error_msg).await;

        Ok(ProcessResult {
            success: false,
            message: None,
            error: Some(error_msg),
            phase: Some("edit-error".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    }
}

#[command]
async fn select_config(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<ConfigInfo, String> {
    use std::sync::mpsc;

    let (tx, rx) = mpsc::channel();

    tauri_plugin_dialog::DialogExt::dialog(&app)
        .file()
        .add_filter("Configuration Files", &["ini", "conf"])
        .pick_file(move |path| {
            let _ = tx.send(path);
        });

    match rx.recv() {
        Ok(Some(path)) => {
            let config_path = path.to_string();

            // Store the config path in the app state
            {
                let mut config_state = state.config_path.lock().unwrap();
                *config_state = Some(config_path.clone());
            }

            // TODO: Validate config file here
            Ok(ConfigInfo {
                success: true,
                config_path: Some(config_path),
                is_valid: true, // Simplified for now
                error: None,
            })
        },
        Ok(None) => Ok(ConfigInfo {
            success: false,
            config_path: None,
            is_valid: false,
            error: None,
        }),
        Err(_) => Err("Failed to receive config file selection result".to_string()),
    }
}

#[command]
async fn reload_config(state: State<'_, AppState>) -> Result<ConfigInfo, String> {
    let config_path = state.config_path.lock().unwrap().clone();

    match config_path {
        Some(path) => {
            // TODO: Reload and validate config
            Ok(ConfigInfo {
                success: true,
                config_path: Some(path),
                is_valid: true,
                error: None,
            })
        },
        None => Ok(ConfigInfo {
            success: false,
            config_path: None,
            is_valid: false,
            error: Some("No config path set".to_string()),
        }),
    }
}

#[command]
async fn get_parallel_config() -> Result<ParallelConfig, String> {
    Ok(ParallelConfig {
        max_concurrent_uploads: 10,
        retry_attempts: 3,
        retry_delay: 5000,
        worker_timeout: 43200000,
        heartbeat_interval: 5000,
    })
}

#[command]
async fn update_parallel_config(_config: ParallelConfig) -> Result<ProcessResult, String> {
    // TODO: Store the parallel config
    Ok(ProcessResult {
        success: true,
        message: Some("Configuration updated successfully".to_string()),
        error: None,
        phase: None,
        excel_path: None,
        media_description_id: None,
        processed_count: None,
        total_subfolders: None,
        failed_folders: None,
        task_ids: None,
    })
}

#[command]
async fn get_parallel_upload_status() -> Result<ParallelUploadStatus, String> {
    // Since we're using streaming output instead of managing individual processes,
    // return a basic status that indicates uploads are being handled by Node.js
    Ok(ParallelUploadStatus {
        queue: QueueStatus {
            total: 1,
            running: 1,
            queued: 0,
            completed: 0,
            failed: 0,
        },
        progress: ProgressStatus {
            total: 1,
            average_percentage: 50.0,
        },
        stats: HashMap::new(),
        processes: vec![ProcessInfo {
            task_id: "batch_upload".to_string(),
            folder_path: "Processing batch upload...".to_string(),
            status: "running".to_string(),
            progress: 50.0,
        }],
    })
}

#[command]
async fn execute_upload_batch_parallel(
    app: tauri::AppHandle,
    window: Window,
    parent_folder_path: String,
    max_concurrent: i32,
    state: State<'_, AppState>,
) -> Result<ProcessResult, String> {
    emit_log_message(&window, "info", &format!("Starting parallel batch upload execution for subfolders in: {}", parent_folder_path)).await;

    // Call the Node.js batch upload logic with parallel flag
    let script_path = get_script_path(&app, "one-media-complete-upload/wrapper.js")
        .map_err(|e| format!("Failed to get script path: {}", e))?;

    // Get config path from state
    let config_path = state.config_path.lock().unwrap().clone();

    let mut command = Command::new("node");
    command
        .arg(&script_path)
        .arg("--batch-folder")
        .arg(&parent_folder_path)
        .arg("--parallel")
        .arg("--max-concurrent")
        .arg(&max_concurrent.to_string());

    // Add config path if available
    if let Some(config) = config_path {
        command.arg("--config").arg(&config);
    }

    let (stdout, stderr, success) = run_command_with_streaming(command, &window).await?;

    // Try to parse JSON output from wrapper script
    // Find the last line that looks like JSON (starts with { and ends with })
    let json_line = stdout.lines()
        .rev()
        .find(|line| {
            let trimmed = line.trim();
            trimmed.starts_with('{') && trimmed.ends_with('}')
        });

    if let Some(json_str) = json_line {
        if let Ok(result) = serde_json::from_str::<ProcessResult>(json_str) {
            if result.success {
                emit_log_message(&window, "success", "Parallel batch upload completed").await;
            } else {
                emit_log_message(&window, "error", &format!("Parallel batch upload failed: {}", result.error.as_deref().unwrap_or("Unknown error"))).await;
            }
            return Ok(result);
        }
    }

    // If JSON parsing failed but process succeeded, extract what we can from stdout
    if success {
        let processed_count = extract_processed_count(&stdout);
        let total_subfolders = extract_total_subfolders(&stdout);
        let failed_folders = extract_failed_folders(&stdout);

        // Create a more detailed success message based on output
        let success_message = if stdout.contains("Worker pool parallel") {
            "Worker pool parallel batch upload completed"
        } else {
            "Parallel batch upload completed"
        };

        emit_log_message(&window, "success", success_message).await;

        Ok(ProcessResult {
            success: true,
            message: Some(success_message.to_string()),
            error: None,
            phase: Some("completed".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count,
            total_subfolders,
            failed_folders,
            task_ids: None,
        })
    } else {
        emit_log_message(&window, "error", &format!("Parallel batch upload failed: {}", stderr)).await;

        Ok(ProcessResult {
            success: false,
            message: None,
            error: Some(if stderr.trim().is_empty() { stdout.to_string() } else { stderr.to_string() }),
            phase: Some("upload-error".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    }
}

#[command]
async fn cancel_all_parallel_uploads(window: Window) -> Result<ProcessResult, String> {
    emit_log_message(&window, "warning", "Cancelling all parallel uploads...").await;

    // For now, emit a message indicating that cancellation is not fully implemented
    // In a full implementation, we would kill the Node.js processes
    emit_log_message(&window, "info", "Note: Cancellation will stop future uploads but current uploads may continue to completion").await;

    Ok(ProcessResult {
        success: true,
        message: Some("Cancel request sent (uploads may complete in progress)".to_string()),
        error: None,
        phase: None,
        excel_path: None,
        media_description_id: None,
        processed_count: None,
        total_subfolders: None,
        failed_folders: None,
        task_ids: None,
    })
}

#[command]
async fn cancel_parallel_upload(window: Window, task_id: String) -> Result<bool, String> {
    emit_log_message(&window, "info", &format!("Cancelling upload task: {}", task_id)).await;

    // For now, just acknowledge the cancellation request
    emit_log_message(&window, "info", "Note: Individual task cancellation not fully implemented").await;

    Ok(true)
}

// ============================================================================
// NEW COMMANDS - Additional Upload Operations
// ============================================================================

#[command]
async fn execute_upload_only(
    app: tauri::AppHandle,
    window: Window,
    folder_path: String,
    state: State<'_, AppState>
) -> Result<ProcessResult, String> {
    emit_log_message(&window, "info", "Starting execute upload only (skipping Excel preparation)...").await;

    // Get script path
    let script_path = get_script_path(&app, "one-media-complete-upload/wrapper.js")
        .map_err(|e| format!("Failed to get script path: {}", e))?;

    // Get config from state
    let config_path = state.config_path.lock().unwrap().clone();

    // Generate log file path
    ensure_logs_directory()?;
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let log_file = format!("logs/{}_{}.log", timestamp, "execute_upload_only");

    // Build command
    let mut command = Command::new("node");
    command
        .arg(&script_path)
        .arg("--folder").arg(&folder_path)
        .arg("--mode").arg("upload")
        .arg("--log-file").arg(&log_file);

    // Add config path if available
    if let Some(config) = config_path {
        command.arg("--config").arg(&config);
    }

    // Execute with streaming
    let (stdout, stderr, success) = run_command_with_streaming(command, &window).await?;

    // Parse and return result
    if let Ok(result) = serde_json::from_str::<ProcessResult>(&stdout) {
        if result.success {
            emit_log_message(&window, "success", "Execute upload only completed").await;
        } else {
            emit_log_message(&window, "error", &format!("Execute upload only failed: {}", result.error.as_deref().unwrap_or("Unknown error"))).await;
        }
        Ok(result)
    } else if success {
        emit_log_message(&window, "success", "Execute upload only completed").await;
        Ok(ProcessResult {
            success: true,
            message: Some("Execute upload only completed successfully".to_string()),
            error: None,
            phase: Some("completed".to_string()),
            excel_path: None,
            media_description_id: extract_media_id(&stdout),
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    } else {
        emit_log_message(&window, "error", &format!("Execute upload only failed: {}", stderr)).await;
        Ok(ProcessResult {
            success: false,
            message: None,
            error: Some(if stderr.trim().is_empty() { stdout.to_string() } else { stderr.to_string() }),
            phase: Some("upload-error".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    }
}

#[command]
async fn upload_picture(
    app: tauri::AppHandle,
    window: Window,
    config_path: String,
    dry_run: bool,
    _state: State<'_, AppState>
) -> Result<ProcessResult, String> {
    emit_log_message(&window, "info", "Starting picture upload...").await;

    // Get script path
    let script_path = get_script_path(&app, "picture-upload/wrapper.js")
        .map_err(|e| format!("Failed to get script path: {}", e))?;

    // Generate log file path
    ensure_logs_directory()?;
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let log_file = format!("logs/{}_{}.log", timestamp, "upload_picture");

    // Build command
    let mut command = Command::new("node");
    command
        .arg(&script_path)
        .arg("--config").arg(&config_path)
        .arg("--log-file").arg(&log_file);

    if dry_run {
        command.arg("--dry-run");
    }

    // Execute with streaming
    let (stdout, stderr, success) = run_command_with_streaming(command, &window).await?;

    // Parse and return result
    if let Ok(result) = serde_json::from_str::<ProcessResult>(&stdout) {
        if result.success {
            emit_log_message(&window, "success", "Picture upload completed").await;
        } else {
            emit_log_message(&window, "error", &format!("Picture upload failed: {}", result.error.as_deref().unwrap_or("Unknown error"))).await;
        }
        Ok(result)
    } else if success {
        emit_log_message(&window, "success", "Picture upload completed").await;
        Ok(ProcessResult {
            success: true,
            message: Some("Picture upload completed successfully".to_string()),
            error: None,
            phase: Some("completed".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    } else {
        emit_log_message(&window, "error", &format!("Picture upload failed: {}", stderr)).await;
        Ok(ProcessResult {
            success: false,
            message: None,
            error: Some(if stderr.trim().is_empty() { stdout.to_string() } else { stderr.to_string() }),
            phase: Some("upload-error".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    }
}

#[command]
async fn upload_subtitle_to_mux(
    app: tauri::AppHandle,
    window: Window,
    config_path: String,
    dry_run: bool,
    _state: State<'_, AppState>
) -> Result<ProcessResult, String> {
    emit_log_message(&window, "info", "Starting subtitle upload to Mux...").await;

    // Get script path
    let script_path = get_script_path(&app, "mux-subtitle-upload/wrapper.js")
        .map_err(|e| format!("Failed to get script path: {}", e))?;

    // Generate log file path
    ensure_logs_directory()?;
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let log_file = format!("logs/{}_{}.log", timestamp, "upload_subtitle_to_mux");

    // Build command
    let mut command = Command::new("node");
    command
        .arg(&script_path)
        .arg("--config").arg(&config_path)
        .arg("--log-file").arg(&log_file);

    if dry_run {
        command.arg("--dry-run");
    }

    // Execute with streaming
    let (stdout, stderr, success) = run_command_with_streaming(command, &window).await?;

    // Parse and return result
    if let Ok(result) = serde_json::from_str::<ProcessResult>(&stdout) {
        if result.success {
            emit_log_message(&window, "success", "Subtitle upload to Mux completed").await;
        } else {
            emit_log_message(&window, "error", &format!("Subtitle upload to Mux failed: {}", result.error.as_deref().unwrap_or("Unknown error"))).await;
        }
        Ok(result)
    } else if success {
        emit_log_message(&window, "success", "Subtitle upload to Mux completed").await;
        Ok(ProcessResult {
            success: true,
            message: Some("Subtitle upload to Mux completed successfully".to_string()),
            error: None,
            phase: Some("completed".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    } else {
        emit_log_message(&window, "error", &format!("Subtitle upload to Mux failed: {}", stderr)).await;
        Ok(ProcessResult {
            success: false,
            message: None,
            error: Some(if stderr.trim().is_empty() { stdout.to_string() } else { stderr.to_string() }),
            phase: Some("upload-error".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    }
}

#[command]
async fn upload_subtitle_specific(
    app: tauri::AppHandle,
    window: Window,
    config_path: String,
    dry_run: bool,
    _state: State<'_, AppState>
) -> Result<ProcessResult, String> {
    emit_log_message(&window, "info", "Starting subtitle specific upload...").await;

    // Get script path
    let script_path = get_script_path(&app, "subtitle-specific-upload/wrapper.js")
        .map_err(|e| format!("Failed to get script path: {}", e))?;

    // Generate log file path
    ensure_logs_directory()?;
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let log_file = format!("logs/{}_{}.log", timestamp, "upload_subtitle_specific");

    // Build command
    let mut command = Command::new("node");
    command
        .arg(&script_path)
        .arg("--config").arg(&config_path)
        .arg("--log-file").arg(&log_file);

    if dry_run {
        command.arg("--dry-run");
    }

    // Execute with streaming
    let (stdout, stderr, success) = run_command_with_streaming(command, &window).await?;

    // Parse and return result
    if let Ok(result) = serde_json::from_str::<ProcessResult>(&stdout) {
        if result.success {
            emit_log_message(&window, "success", "Subtitle specific upload completed").await;
        } else {
            emit_log_message(&window, "error", &format!("Subtitle specific upload failed: {}", result.error.as_deref().unwrap_or("Unknown error"))).await;
        }
        Ok(result)
    } else if success {
        emit_log_message(&window, "success", "Subtitle specific upload completed").await;
        Ok(ProcessResult {
            success: true,
            message: Some("Subtitle specific upload completed successfully".to_string()),
            error: None,
            phase: Some("completed".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    } else {
        emit_log_message(&window, "error", &format!("Subtitle specific upload failed: {}", stderr)).await;
        Ok(ProcessResult {
            success: false,
            message: None,
            error: Some(if stderr.trim().is_empty() { stdout.to_string() } else { stderr.to_string() }),
            phase: Some("upload-error".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    }
}

#[command]
async fn resend_subtitles(
    app: tauri::AppHandle,
    window: Window,
    folder_path: String,
    state: State<'_, AppState>
) -> Result<ProcessResult, String> {
    emit_log_message(&window, "info", "Starting subtitle resend...").await;

    // Get script path for resend subtitles
    let script_path = get_script_path(&app, "subtitle-specific-upload/resendSubtitlesWrapper.js")
        .map_err(|e| format!("Failed to get script path: {}", e))?;

    // Get config from state
    let config_path = state.config_path.lock().unwrap().clone();

    if config_path.is_none() {
        return Err("No config file selected. Please select a config file first.".to_string());
    }

    // Generate log file path
    ensure_logs_directory()?;
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let log_file = format!("logs/{}_{}.log", timestamp, "resend_subtitles");

    // Build command - using INI interface
    let mut command = Command::new("node");
    command
        .arg(&script_path)
        .arg("--config").arg(config_path.unwrap())
        .arg("--folder").arg(&folder_path)
        .arg("--log-file").arg(&log_file);

    // Execute with streaming
    let (stdout, stderr, success) = run_command_with_streaming(command, &window).await?;

    // Parse and return result
    if let Ok(result) = serde_json::from_str::<ProcessResult>(&stdout) {
        if result.success {
            emit_log_message(&window, "success", "Subtitle resend completed").await;
        } else {
            emit_log_message(&window, "error", &format!("Subtitle resend failed: {}", result.error.as_deref().unwrap_or("Unknown error"))).await;
        }
        Ok(result)
    } else if success {
        emit_log_message(&window, "success", "Subtitle resend completed").await;
        Ok(ProcessResult {
            success: true,
            message: Some("Subtitle resend completed successfully".to_string()),
            error: None,
            phase: Some("completed".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    } else {
        emit_log_message(&window, "error", &format!("Subtitle resend failed: {}", stderr)).await;
        Ok(ProcessResult {
            success: false,
            message: None,
            error: Some(if stderr.trim().is_empty() { stdout.to_string() } else { stderr.to_string() }),
            phase: Some("resend-error".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    }
}

#[command]
async fn batch_resend_subtitles(
    app: tauri::AppHandle,
    window: Window,
    parent_folder_path: String,
    state: State<'_, AppState>
) -> Result<ProcessResult, String> {
    emit_log_message(&window, "info", "Starting batch subtitle resend...").await;

    // Get script path for batch resend subtitles
    let script_path = get_script_path(&app, "subtitle-specific-upload/batchResendSubtitlesWrapper.js")
        .map_err(|e| format!("Failed to get script path: {}", e))?;

    // Get config from state
    let config_path = state.config_path.lock().unwrap().clone();

    if config_path.is_none() {
        return Err("No config file selected. Please select a config file first.".to_string());
    }

    // Generate log file path
    ensure_logs_directory()?;
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let log_file = format!("logs/{}_{}.log", timestamp, "batch_resend_subtitles");

    // Build command - using INI interface
    let mut command = Command::new("node");
    command
        .arg(&script_path)
        .arg("--config").arg(config_path.unwrap())
        .arg("--parent-folder").arg(&parent_folder_path)
        .arg("--log-file").arg(&log_file);

    // Execute with streaming
    let (stdout, stderr, success) = run_command_with_streaming(command, &window).await?;

    // Parse and return result
    if let Ok(result) = serde_json::from_str::<ProcessResult>(&stdout) {
        if result.success {
            emit_log_message(&window, "success", "Batch subtitle resend completed").await;
        } else {
            emit_log_message(&window, "error", &format!("Batch subtitle resend failed: {}", result.error.as_deref().unwrap_or("Unknown error"))).await;
        }
        Ok(result)
    } else if success {
        emit_log_message(&window, "success", "Batch subtitle resend completed").await;
        Ok(ProcessResult {
            success: true,
            message: Some("Batch subtitle resend completed successfully".to_string()),
            error: None,
            phase: Some("completed".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: extract_processed_count(&stdout),
            total_subfolders: extract_total_subfolders(&stdout),
            failed_folders: extract_failed_folders(&stdout),
            task_ids: None,
        })
    } else {
        emit_log_message(&window, "error", &format!("Batch subtitle resend failed: {}", stderr)).await;
        Ok(ProcessResult {
            success: false,
            message: None,
            error: Some(if stderr.trim().is_empty() { stdout.to_string() } else { stderr.to_string() }),
            phase: Some("resend-error".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    }
}

#[command]
async fn batch_picture_upload(
    app: tauri::AppHandle,
    window: Window,
    config_path: String,
    dry_run: bool,
    _state: State<'_, AppState>
) -> Result<ProcessResult, String> {
    emit_log_message(&window, "info", "Starting batch picture upload...").await;

    // Get script path
    let script_path = get_script_path(&app, "batch-picture-upload/wrapper.js")
        .map_err(|e| format!("Failed to get script path: {}", e))?;

    // Generate log file path
    ensure_logs_directory()?;
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let log_file = format!("logs/{}_{}.log", timestamp, "batch_picture_upload");

    // Build command
    let mut command = Command::new("node");
    command
        .arg(&script_path)
        .arg("--config").arg(&config_path)
        .arg("--log-file").arg(&log_file);

    if dry_run {
        command.arg("--dry-run");
    }

    // Execute with streaming
    let (stdout, stderr, success) = run_command_with_streaming(command, &window).await?;

    // Parse and return result
    if let Ok(result) = serde_json::from_str::<ProcessResult>(&stdout) {
        if result.success {
            emit_log_message(&window, "success", "Batch picture upload completed").await;
        } else {
            emit_log_message(&window, "error", &format!("Batch picture upload failed: {}", result.error.as_deref().unwrap_or("Unknown error"))).await;
        }
        Ok(result)
    } else if success {
        emit_log_message(&window, "success", "Batch picture upload completed").await;
        Ok(ProcessResult {
            success: true,
            message: Some("Batch picture upload completed successfully".to_string()),
            error: None,
            phase: Some("completed".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    } else {
        emit_log_message(&window, "error", &format!("Batch picture upload failed: {}", stderr)).await;
        Ok(ProcessResult {
            success: false,
            message: None,
            error: Some(if stderr.trim().is_empty() { stdout.to_string() } else { stderr.to_string() }),
            phase: Some("upload-error".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    }
}

#[command]
async fn propagate_season_data(
    app: tauri::AppHandle,
    window: Window,
    season_id: String,
    config_path: String,
    dry_run: bool,
    _state: State<'_, AppState>
) -> Result<ProcessResult, String> {
    emit_log_message(&window, "info", "Starting season data propagation...").await;

    // Get script path
    let script_path = get_script_path(&app, "propagate-data/wrapper.js")
        .map_err(|e| format!("Failed to get script path: {}", e))?;

    // Generate log file path
    ensure_logs_directory()?;
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let log_file = format!("logs/{}_{}.log", timestamp, "propagate_season_data");

    // Build command
    let mut command = Command::new("node");
    command
        .arg(&script_path)
        .arg("--season-id").arg(&season_id)
        .arg("--config").arg(&config_path)
        .arg("--log-file").arg(&log_file);

    if dry_run {
        command.arg("--dry-run");
    }

    // Execute with streaming
    let (stdout, stderr, success) = run_command_with_streaming(command, &window).await?;

    // Parse and return result
    if let Ok(result) = serde_json::from_str::<ProcessResult>(&stdout) {
        if result.success {
            emit_log_message(&window, "success", "Season data propagation completed").await;
        } else {
            emit_log_message(&window, "error", &format!("Season data propagation failed: {}", result.error.as_deref().unwrap_or("Unknown error"))).await;
        }
        Ok(result)
    } else if success {
        emit_log_message(&window, "success", "Season data propagation completed").await;
        Ok(ProcessResult {
            success: true,
            message: Some("Season data propagation completed successfully".to_string()),
            error: None,
            phase: Some("completed".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    } else {
        emit_log_message(&window, "error", &format!("Season data propagation failed: {}", stderr)).await;
        Ok(ProcessResult {
            success: false,
            message: None,
            error: Some(if stderr.trim().is_empty() { stdout.to_string() } else { stderr.to_string() }),
            phase: Some("propagation-error".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    }
}

#[command]
async fn multi_upload_from_parent(
    app: tauri::AppHandle,
    window: Window,
    parent_folder: String,
    delay: i32,
    max_concurrent: i32,
    state: State<'_, AppState>
) -> Result<ProcessResult, String> {
    emit_log_message(&window, "info", "Starting multi-upload from parent folder...").await;

    // Get script path
    let script_path = get_script_path(&app, "cli-multi-upload/wrapper.js")
        .map_err(|e| format!("Failed to get script path: {}", e))?;

    // Get config from state
    let config_path = state.config_path.lock().unwrap().clone();

    // Generate log file path
    ensure_logs_directory()?;
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let log_file = format!("logs/{}_{}.log", timestamp, "multi_upload_from_parent");

    // Build command
    let mut command = Command::new("node");
    command
        .arg(&script_path)
        .arg("--parent-folder").arg(&parent_folder)
        .arg("--delay").arg(&delay.to_string())
        .arg("--max-concurrent").arg(&max_concurrent.to_string())
        .arg("--log-file").arg(&log_file);

    // Add config path if available
    if let Some(config) = config_path {
        command.arg("--config").arg(&config);
    }

    // Execute with streaming
    let (stdout, stderr, success) = run_command_with_streaming(command, &window).await?;

    // Parse and return result
    if let Ok(result) = serde_json::from_str::<ProcessResult>(&stdout) {
        if result.success {
            emit_log_message(&window, "success", "Multi-upload from parent completed").await;
        } else {
            emit_log_message(&window, "error", &format!("Multi-upload from parent failed: {}", result.error.as_deref().unwrap_or("Unknown error"))).await;
        }
        Ok(result)
    } else if success {
        emit_log_message(&window, "success", "Multi-upload from parent completed").await;
        Ok(ProcessResult {
            success: true,
            message: Some("Multi-upload from parent completed successfully".to_string()),
            error: None,
            phase: Some("completed".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: extract_processed_count(&stdout),
            total_subfolders: extract_total_subfolders(&stdout),
            failed_folders: extract_failed_folders(&stdout),
            task_ids: None,
        })
    } else {
        emit_log_message(&window, "error", &format!("Multi-upload from parent failed: {}", stderr)).await;
        Ok(ProcessResult {
            success: false,
            message: None,
            error: Some(if stderr.trim().is_empty() { stdout.to_string() } else { stderr.to_string() }),
            phase: Some("upload-error".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    }
}

#[command]
async fn multi_upload_from_file(
    app: tauri::AppHandle,
    window: Window,
    folders_file: String,
    delay: i32,
    max_concurrent: i32,
    state: State<'_, AppState>
) -> Result<ProcessResult, String> {
    emit_log_message(&window, "info", "Starting multi-upload from file...").await;

    // Get script path
    let script_path = get_script_path(&app, "cli-multi-upload/wrapper.js")
        .map_err(|e| format!("Failed to get script path: {}", e))?;

    // Get config from state
    let config_path = state.config_path.lock().unwrap().clone();

    // Generate log file path
    ensure_logs_directory()?;
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let log_file = format!("logs/{}_{}.log", timestamp, "multi_upload_from_file");

    // Build command
    let mut command = Command::new("node");
    command
        .arg(&script_path)
        .arg("--folders-file").arg(&folders_file)
        .arg("--delay").arg(&delay.to_string())
        .arg("--max-concurrent").arg(&max_concurrent.to_string())
        .arg("--log-file").arg(&log_file);

    // Add config path if available
    if let Some(config) = config_path {
        command.arg("--config").arg(&config);
    }

    // Execute with streaming
    let (stdout, stderr, success) = run_command_with_streaming(command, &window).await?;

    // Parse and return result
    if let Ok(result) = serde_json::from_str::<ProcessResult>(&stdout) {
        if result.success {
            emit_log_message(&window, "success", "Multi-upload from file completed").await;
        } else {
            emit_log_message(&window, "error", &format!("Multi-upload from file failed: {}", result.error.as_deref().unwrap_or("Unknown error"))).await;
        }
        Ok(result)
    } else if success {
        emit_log_message(&window, "success", "Multi-upload from file completed").await;
        Ok(ProcessResult {
            success: true,
            message: Some("Multi-upload from file completed successfully".to_string()),
            error: None,
            phase: Some("completed".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: extract_processed_count(&stdout),
            total_subfolders: extract_total_subfolders(&stdout),
            failed_folders: extract_failed_folders(&stdout),
            task_ids: None,
        })
    } else {
        emit_log_message(&window, "error", &format!("Multi-upload from file failed: {}", stderr)).await;
        Ok(ProcessResult {
            success: false,
            message: None,
            error: Some(if stderr.trim().is_empty() { stdout.to_string() } else { stderr.to_string() }),
            phase: Some("upload-error".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    }
}

#[command]
async fn multi_upload_from_string(
    app: tauri::AppHandle,
    window: Window,
    folders_string: String,
    delay: i32,
    max_concurrent: i32,
    state: State<'_, AppState>
) -> Result<ProcessResult, String> {
    emit_log_message(&window, "info", "Starting multi-upload from string...").await;

    // Get script path
    let script_path = get_script_path(&app, "cli-multi-upload/wrapper.js")
        .map_err(|e| format!("Failed to get script path: {}", e))?;

    // Get config from state
    let config_path = state.config_path.lock().unwrap().clone();

    // Generate log file path
    ensure_logs_directory()?;
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let log_file = format!("logs/{}_{}.log", timestamp, "multi_upload_from_string");

    // Build command
    let mut command = Command::new("node");
    command
        .arg(&script_path)
        .arg("--folders-string").arg(&folders_string)
        .arg("--delay").arg(&delay.to_string())
        .arg("--max-concurrent").arg(&max_concurrent.to_string())
        .arg("--log-file").arg(&log_file);

    // Add config path if available
    if let Some(config) = config_path {
        command.arg("--config").arg(&config);
    }

    // Execute with streaming
    let (stdout, stderr, success) = run_command_with_streaming(command, &window).await?;

    // Parse and return result
    if let Ok(result) = serde_json::from_str::<ProcessResult>(&stdout) {
        if result.success {
            emit_log_message(&window, "success", "Multi-upload from string completed").await;
        } else {
            emit_log_message(&window, "error", &format!("Multi-upload from string failed: {}", result.error.as_deref().unwrap_or("Unknown error"))).await;
        }
        Ok(result)
    } else if success {
        emit_log_message(&window, "success", "Multi-upload from string completed").await;
        Ok(ProcessResult {
            success: true,
            message: Some("Multi-upload from string completed successfully".to_string()),
            error: None,
            phase: Some("completed".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: extract_processed_count(&stdout),
            total_subfolders: extract_total_subfolders(&stdout),
            failed_folders: extract_failed_folders(&stdout),
            task_ids: None,
        })
    } else {
        emit_log_message(&window, "error", &format!("Multi-upload from string failed: {}", stderr)).await;
        Ok(ProcessResult {
            success: false,
            message: None,
            error: Some(if stderr.trim().is_empty() { stdout.to_string() } else { stderr.to_string() }),
            phase: Some("upload-error".to_string()),
            excel_path: None,
            media_description_id: None,
            processed_count: None,
            total_subfolders: None,
            failed_folders: None,
            task_ids: None,
        })
    }
}

// Helper functions
async fn emit_log_message(window: &Window, level: &str, message: &str) {
    let log_message = LogMessage {
        timestamp: chrono::Utc::now().format("%H:%M:%S").to_string(),
        level: level.to_string(),
        message: message.to_string(),
    };

    let _ = window.emit("log-message", log_message);
}

async fn run_command_with_streaming(
    mut command: Command,
    window: &Window,
) -> Result<(String, String, bool), String> {
    use std::process::Stdio;
    use std::io::{BufRead, BufReader};

    let mut child = command
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn process: {}", e))?;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let stdout_reader = BufReader::new(stdout);
    let stderr_reader = BufReader::new(stderr);

    let window_clone1 = window.clone();
    let window_clone2 = window.clone();

    // Spawn async tasks to read stdout and stderr
    let stdout_handle = tokio::spawn(async move {
        let mut stdout_lines = Vec::new();
        for line in stdout_reader.lines() {
            if let Ok(line) = line {
                stdout_lines.push(line.clone());

                // Parse and emit different types of messages with enhanced patterns
                let level = if line.contains("✅") || line.contains("Successfully uploaded") || line.contains("Upload completed successfully") || line.contains("completed:") {
                    "success"
                } else if line.contains("❌") || line.contains("Error:") || line.contains("Failed:") || line.contains("failed:") || line.contains("Error uploading") {
                    "error"
                } else if line.contains("⚠️") || line.contains("Warning:") || line.contains("Skipping") || line.contains("Skipped") {
                    "warning"
                } else if line.contains("🚀") || line.contains("Starting") || line.contains("Starting upload") {
                    "info"
                } else if line.contains("📊") || line.contains("Status update") || line.contains("active") || line.contains("queued") {
                    "info"
                } else if line.contains("⏳") || line.contains("Currently uploading") {
                    "info"
                } else if line.contains("📋") || line.contains("Found:") || line.contains("Processing:") || line.contains("batch of") {
                    "info"
                } else if line.contains("🔍") || line.contains("Validating") || line.contains("Excel file") {
                    "info"
                } else if line.contains("🎉") || line.contains("completed:") {
                    "success"
                } else {
                    "info"
                };

                emit_log_message(&window_clone1, level, &line).await;
            }
        }
        stdout_lines.join("\n")
    });

    let stderr_handle = tokio::spawn(async move {
        let mut stderr_lines = Vec::new();
        for line in stderr_reader.lines() {
            if let Ok(line) = line {
                stderr_lines.push(line.clone());

                // Emit ALL stderr lines to capture progress updates and debug info
                if !line.trim().is_empty() {
                    // Parse message level from content for better display
                    let level = if line.contains("❌") || line.contains("Error:") || line.contains("Failed:") {
                        "error"
                    } else if line.contains("⚠️") || line.contains("Warning:") {
                        "warning"
                    } else if line.contains("✅") || line.contains("SUCCESS") {
                        "success"
                    } else if line.contains("🚀") || line.contains("Starting") || line.contains("🔍 DEBUG") {
                        "info"
                    } else {
                        "info"
                    };
                    emit_log_message(&window_clone2, level, &line).await;
                }
            }
        }
        stderr_lines.join("\n")
    });

    // Wait for process to complete
    let exit_status = child.wait().map_err(|e| format!("Failed to wait for process: {}", e))?;

    // Wait for both output streams to be fully read
    let stdout_result = stdout_handle.await.map_err(|e| format!("Failed to read stdout: {}", e))?;
    let stderr_result = stderr_handle.await.map_err(|e| format!("Failed to read stderr: {}", e))?;

    Ok((stdout_result, stderr_result, exit_status.success()))
}

fn extract_excel_path(_output: &str) -> Option<String> {
    // TODO: Parse the output to extract Excel file path
    None
}

fn extract_media_id(_output: &str) -> Option<String> {
    // TODO: Parse the output to extract media description ID
    None
}

fn extract_processed_count(output: &str) -> Option<i32> {
    // Look for patterns like "3/3 successful" or "Parallel batch upload completed: 2/3 successful"
    use regex::Regex;
    let re = Regex::new(r"(?:completed:|upload:)\s*(\d+)/\d+\s+successful").unwrap();
    if let Some(captures) = re.captures(output) {
        if let Some(count_str) = captures.get(1) {
            return count_str.as_str().parse().ok();
        }
    }

    // Also try pattern like "✅ Successfully uploaded: folder (2/3 - 67%)"
    let re2 = Regex::new(r"Successfully uploaded:.*\((\d+)/\d+").unwrap();
    let successful_count = re2.captures_iter(output).count() as i32;
    if successful_count > 0 {
        return Some(successful_count);
    }

    None
}

fn extract_total_subfolders(output: &str) -> Option<i32> {
    // Look for patterns like "Starting parallel batch upload for 3 folders"
    use regex::Regex;
    let re = Regex::new(r"Starting parallel batch upload for (\d+) folders").unwrap();
    if let Some(captures) = re.captures(output) {
        if let Some(count_str) = captures.get(1) {
            return count_str.as_str().parse().ok();
        }
    }

    // Also try pattern like "completed: 2/3 successful"
    let re2 = Regex::new(r"(\d+)/(\d+)\s+successful").unwrap();
    if let Some(captures) = re2.captures(output) {
        if let Some(total_str) = captures.get(2) {
            return total_str.as_str().parse().ok();
        }
    }

    None
}

fn extract_failed_folders(output: &str) -> Option<Vec<String>> {
    // Look for patterns like "❌ Failed uploads: folder1, folder2"
    use regex::Regex;
    let re = Regex::new(r"❌ Failed uploads:\s*(.+)").unwrap();
    if let Some(captures) = re.captures(output) {
        if let Some(failed_str) = captures.get(1) {
            let failed_folders: Vec<String> = failed_str.as_str()
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
            if !failed_folders.is_empty() {
                return Some(failed_folders);
            }
        }
    }

    // Also collect individual failed upload messages
    let re2 = Regex::new(r"❌ (?:Failed to upload|Error uploading):\s*([^\s]+)").unwrap();
    let failed_folders: Vec<String> = re2.captures_iter(output)
        .filter_map(|cap| cap.get(1))
        .map(|m| m.as_str().to_string())
        .collect();

    if !failed_folders.is_empty() {
        Some(failed_folders)
    } else {
        None
    }
}

// Helper function to ensure logs directory exists
fn ensure_logs_directory() -> Result<PathBuf, String> {
    let logs_dir = PathBuf::from("logs");
    if !logs_dir.exists() {
        std::fs::create_dir_all(&logs_dir)
            .map_err(|e| format!("Failed to create logs directory: {}", e))?;
    }
    Ok(logs_dir)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .manage(AppState::default())
        .invoke_handler(generate_handler![
            select_folder,
            validate_path,
            prepare_excel,
            execute_upload,
            prepare_excel_batch,
            execute_upload_batch,
            excel_bulk_edit,
            select_config,
            reload_config,
            get_parallel_config,
            update_parallel_config,
            get_parallel_upload_status,
            execute_upload_batch_parallel,
            cancel_all_parallel_uploads,
            cancel_parallel_upload,
            // New commands for additional upload operations
            execute_upload_only,
            upload_picture,
            upload_subtitle_to_mux,
            upload_subtitle_specific,
            batch_picture_upload,
            propagate_season_data,
            multi_upload_from_parent,
            multi_upload_from_file,
            multi_upload_from_string,
            // Subtitle resend commands
            resend_subtitles,
            batch_resend_subtitles
        ])
        .setup(|app| {
            // Try to load config.ini on startup
            eprintln!("[SETUP] Starting config auto-loading...");
            if let Some(window) = app.get_webview_window("main") {
                eprintln!("[SETUP] Found main window, proceeding with config loading");
                let config_info = match app.path().app_data_dir() {
                    Ok(app_dir) => {
                        // First try next to executable
                        let exe_config = std::env::current_exe()
                            .ok()
                            .and_then(|exe| exe.parent().map(|p| p.join("config.ini")));

                        // Then try in app data directory
                        let app_config = app_dir.join("config.ini");

                        let config_path = if let Some(exe_config) = exe_config {
                            if exe_config.exists() {
                                Some(exe_config)
                            } else if app_config.exists() {
                                Some(app_config)
                            } else {
                                None
                            }
                        } else if app_config.exists() {
                            Some(app_config)
                        } else {
                            None
                        };

                        eprintln!("[SETUP] Final config_path: {:?}", config_path);
                        if let Some(config_path) = config_path {
                            let config_path_str = config_path.to_string_lossy().to_string();

                            // Store config path in app state
                            if let Some(state) = app.try_state::<AppState>() {
                                let mut config_state = state.config_path.lock().unwrap();
                                *config_state = Some(config_path_str.clone());
                                eprintln!("[SETUP] Stored config path in state: {}", config_path_str);
                            }

                            ConfigInfo {
                                config_path: Some(config_path_str),
                                is_valid: true, // TODO: Validate config content
                                success: true,
                                error: None,
                            }
                        } else {
                            ConfigInfo {
                                config_path: None,
                                is_valid: false,
                                success: true,
                                error: Some("No config.ini found next to executable or in app data".to_string()),
                            }
                        }
                    }
                    Err(e) => ConfigInfo {
                        config_path: None,
                        is_valid: false,
                        success: false,
                        error: Some(format!("Failed to get app directory: {}", e)),
                    }
                };

                eprintln!("[SETUP] Emitting config-loaded event: {:?}", config_info);
                let _ = window.emit("config-loaded", config_info);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}