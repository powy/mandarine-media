/**
 * Enhanced Retry Handler with exponential backoff and circuit breaker
 * Based on proven implementation from mux-test
 */
export class EnhancedRetryHandler {
  constructor(logger) {
    this.logger = logger;
    this.retryableCodes = [408, 429, 500, 502, 503, 504];
    this.networkErrorCodes = ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE'];
  }

  async executeWithRetry(operation, options = {}) {
    const {
      maxAttempts = 5,
      baseDelayMs = 1000,
      maxDelayMs = 30000,
      backoffMultiplier = 2,
      context = 'operation',
      jitter = true
    } = options;

    let lastError;
    let consecutiveFailures = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();

        // Reset failure count on success
        if (consecutiveFailures > 0) {
          this.logger.info(`${context} succeeded after ${consecutiveFailures} failures`);
          consecutiveFailures = 0;
        }

        return result;

      } catch (error) {
        lastError = error;
        consecutiveFailures++;

        // Don't retry on final attempt
        if (attempt === maxAttempts) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryable(error)) {
          this.logger.error(`Non-retryable error in ${context}`, {
            error: error.message,
            code: error.code,
            status: error.response?.status
          });
          throw error;
        }

        // Calculate delay with exponential backoff and jitter
        let delay = Math.min(
          baseDelayMs * Math.pow(backoffMultiplier, attempt - 1),
          maxDelayMs
        );

        // Add jitter to prevent thundering herd
        if (jitter) {
          delay = delay * (0.5 + Math.random() * 0.5);
        }

        this.logger.warn(`${context} failed, retrying`, {
          attempt: `${attempt}/${maxAttempts}`,
          error: error.message,
          code: error.code,
          status: error.response?.status,
          retryAfter: `${Math.round(delay)}ms`,
          consecutiveFailures
        });

        // Circuit breaker: if too many consecutive failures, increase delay
        if (consecutiveFailures >= 3) {
          delay *= 2;
          this.logger.warn(`Circuit breaker activated, increased delay`, {
            consecutiveFailures,
            newDelay: `${Math.round(delay)}ms`
          });
        }

        await this.sleep(delay);
      }
    }

    // All attempts failed
    this.logger.error(`${context} failed after ${maxAttempts} attempts`, {
      totalFailures: consecutiveFailures,
      finalError: lastError.message,
      errorCode: lastError.code,
      httpStatus: lastError.response?.status
    });

    // Enhance error with retry context
    const enhancedError = new Error(`${context} failed after ${maxAttempts} attempts: ${lastError.message}`);
    enhancedError.originalError = lastError;
    enhancedError.attempts = maxAttempts;
    enhancedError.consecutiveFailures = consecutiveFailures;

    throw enhancedError;
  }

  isRetryable(error) {
    // Network errors (connection issues)
    if (error.code && this.networkErrorCodes.includes(error.code)) {
      return true;
    }

    // HTTP errors (server-side issues)
    if (error.response && this.retryableCodes.includes(error.response.status)) {
      return true;
    }

    // Timeout errors
    if (error.message && error.message.toLowerCase().includes('timeout')) {
      return true;
    }

    // DNS resolution errors
    if (error.code === 'ENOTFOUND') {
      return true;
    }

    // SSL/TLS errors (may be temporary)
    if (error.code && error.code.startsWith('SSL')) {
      return true;
    }

    // Socket hang up (connection dropped)
    if (error.code === 'ECONNRESET' || error.message.includes('socket hang up')) {
      return true;
    }

    return false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if we should activate circuit breaker based on error pattern
   */
  shouldActivateCircuitBreaker(consecutiveFailures, error) {
    // Activate circuit breaker for persistent network issues
    if (consecutiveFailures >= 3) {
      return true;
    }

    // Activate for specific high-severity errors
    if (error.response?.status === 503 || error.response?.status === 502) {
      return consecutiveFailures >= 2;
    }

    return false;
  }

  /**
   * Enhanced retry for chunk uploads with adaptive timing
   */
  async retryChunkUpload(uploadFunction, chunkInfo, options = {}) {
    const enhancedOptions = {
      ...options,
      context: `chunk ${chunkInfo.number} upload`,
      // Adaptive retry based on chunk size
      maxAttempts: chunkInfo.size > 10 * 1024 * 1024 ? 3 : 5, // Fewer retries for large chunks
      baseDelayMs: Math.min(1000 + (chunkInfo.size / (1024 * 1024)) * 100, 5000) // Scale delay with chunk size
    };

    return this.executeWithRetry(uploadFunction, enhancedOptions);
  }
}

export default EnhancedRetryHandler;