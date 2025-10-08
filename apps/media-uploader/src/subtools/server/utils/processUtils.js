/**
 * Process utilities
 * Helper functions for executing external processes
 */

import { execFile, spawn } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Execute a file with arguments and return a promise
 */
export async function execFilePromise(command, args = [], options = {}) {
  try {
    const result = await execFileAsync(command, args, options);
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0
    };
  } catch (error) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.code || 1,
      error: error.message
    };
  }
}

/**
 * Execute a command and stream output in real-time
 */
export function execFileStreaming(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;

      if (options.onStdout) {
        options.onStdout(chunk);
      }
    });

    child.stderr?.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;

      if (options.onStderr) {
        options.onStderr(chunk);
      }
    });

    child.on('error', (error) => {
      reject(new Error(`Process error: ${error.message}`));
    });

    child.on('exit', (code, signal) => {
      const result = {
        stdout,
        stderr,
        exitCode: code,
        signal
      };

      if (code === 0) {
        resolve(result);
      } else {
        const error = new Error(`Process exited with code ${code}`);
        error.result = result;
        reject(error);
      }
    });

    // Handle timeout if specified
    if (options.timeout) {
      setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Process timed out after ${options.timeout}ms`));
      }, options.timeout);
    }
  });
}

/**
 * Kill a process gracefully
 */
export function killProcess(pid, signal = 'SIGTERM', timeout = 5000) {
  return new Promise((resolve) => {
    try {
      process.kill(pid, signal);

      // Wait for graceful shutdown
      setTimeout(() => {
        try {
          // Check if process is still running
          process.kill(pid, 0);
          // If we get here, process is still running, force kill
          process.kill(pid, 'SIGKILL');
          resolve({ killed: true, forced: true });
        } catch (error) {
          // Process is gone
          resolve({ killed: true, forced: false });
        }
      }, timeout);

    } catch (error) {
      // Process might not exist
      resolve({ killed: false, error: error.message });
    }
  });
}

export default {
  execFilePromise,
  execFileStreaming,
  killProcess
};