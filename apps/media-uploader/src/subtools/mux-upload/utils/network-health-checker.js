/**
 * Network Health Checker
 * Performs pre-upload network diagnostics to detect potential issues early
 */
import dns from 'dns/promises';
import axios from 'axios';

export class NetworkHealthChecker {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Perform comprehensive network health check
   * @param {Object} options - Health check options
   * @returns {Object} Health status with diagnostics
   */
  async checkHealth(options = {}) {
    const {
      timeout = 10000,
      checkDns = true,
      checkConnectivity = true,
      endpoints = ['api.mux.com']
    } = options;

    const results = {
      healthy: true,
      checks: {},
      issues: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Check 1: DNS Resolution
      if (checkDns) {
        this.logger.info('🔍 Checking DNS resolution...');
        results.checks.dns = await this.checkDnsResolution(endpoints, timeout);

        if (!results.checks.dns.success) {
          results.healthy = false;
          results.issues.push({
            type: 'DNS_RESOLUTION_FAILED',
            message: 'Unable to resolve DNS hostnames',
            details: results.checks.dns.errors
          });
        }
      }

      // Check 2: Network Connectivity
      if (checkConnectivity) {
        this.logger.info('🔍 Checking network connectivity...');
        results.checks.connectivity = await this.checkConnectivity(endpoints, timeout);

        if (!results.checks.connectivity.success) {
          results.healthy = false;
          results.issues.push({
            type: 'CONNECTIVITY_FAILED',
            message: 'Unable to establish network connection',
            details: results.checks.connectivity.errors
          });
        }
      }

      // Summary
      if (results.healthy) {
        this.logger.info('✅ Network health check passed');
      } else {
        this.logger.warn('⚠️  Network health check detected issues', {
          issueCount: results.issues.length,
          issues: results.issues.map(i => i.type)
        });
      }

      return results;

    } catch (error) {
      this.logger.error('Network health check failed', {
        error: error.message
      });

      return {
        healthy: false,
        checks: results.checks,
        issues: [{
          type: 'HEALTH_CHECK_ERROR',
          message: 'Health check encountered an error',
          details: error.message
        }],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check DNS resolution for given endpoints
   */
  async checkDnsResolution(endpoints, timeout) {
    const results = {
      success: true,
      resolved: [],
      errors: []
    };

    for (const endpoint of endpoints) {
      try {
        this.logger.debug(`Resolving DNS for ${endpoint}...`);

        // Set timeout for DNS lookup
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const addresses = await dns.resolve4(endpoint);
          clearTimeout(timeoutId);

          results.resolved.push({
            hostname: endpoint,
            addresses: addresses,
            status: 'success'
          });

          this.logger.debug(`✓ DNS resolved: ${endpoint} -> ${addresses.join(', ')}`);

        } catch (dnsError) {
          clearTimeout(timeoutId);
          throw dnsError;
        }

      } catch (error) {
        results.success = false;
        results.errors.push({
          hostname: endpoint,
          error: error.message,
          code: error.code
        });

        this.logger.warn(`✗ DNS resolution failed for ${endpoint}:`, {
          error: error.message,
          code: error.code
        });
      }
    }

    return results;
  }

  /**
   * Check network connectivity to given endpoints
   */
  async checkConnectivity(endpoints, timeout) {
    const results = {
      success: true,
      connected: [],
      errors: []
    };

    for (const endpoint of endpoints) {
      try {
        this.logger.debug(`Testing connectivity to ${endpoint}...`);

        // HEAD request to check connectivity (lightweight)
        const response = await axios.head(`https://${endpoint}`, {
          timeout: timeout,
          validateStatus: () => true // Accept any status (just checking connectivity)
        });

        results.connected.push({
          hostname: endpoint,
          status: response.status,
          responseTime: response.headers['x-response-time'] || 'unknown'
        });

        this.logger.debug(`✓ Connected to ${endpoint} (status: ${response.status})`);

      } catch (error) {
        // Connection failed
        if (error.code === 'ENOTFOUND') {
          // DNS issue detected
          results.success = false;
          results.errors.push({
            hostname: endpoint,
            error: 'DNS resolution failed',
            code: error.code
          });
        } else if (error.code === 'ETIMEDOUT') {
          // Timeout issue
          results.success = false;
          results.errors.push({
            hostname: endpoint,
            error: 'Connection timeout',
            code: error.code
          });
        } else {
          // Other network errors
          results.success = false;
          results.errors.push({
            hostname: endpoint,
            error: error.message,
            code: error.code
          });
        }

        this.logger.warn(`✗ Connectivity check failed for ${endpoint}:`, {
          error: error.message,
          code: error.code
        });
      }
    }

    return results;
  }

  /**
   * Get diagnostic recommendations based on health check results
   */
  getRecommendations(healthResults) {
    const recommendations = [];

    if (!healthResults.healthy) {
      for (const issue of healthResults.issues) {
        switch (issue.type) {
          case 'DNS_RESOLUTION_FAILED':
            recommendations.push({
              issue: 'DNS Resolution Failure',
              actions: [
                'Check your internet connection',
                'Verify DNS server settings',
                'Try using public DNS servers (8.8.8.8, 1.1.1.1)',
                'Check if firewall is blocking DNS queries',
                'Wait a moment and retry (transient DNS issues are common)'
              ]
            });
            break;

          case 'CONNECTIVITY_FAILED':
            recommendations.push({
              issue: 'Network Connectivity Failure',
              actions: [
                'Check your internet connection',
                'Verify firewall settings',
                'Check if proxy is configured correctly',
                'Ensure no VPN is interfering with connections',
                'Try again in a few moments'
              ]
            });
            break;

          case 'HEALTH_CHECK_ERROR':
            recommendations.push({
              issue: 'Health Check Error',
              actions: [
                'Check system network configuration',
                'Verify Node.js has network permissions',
                'Check if antivirus is blocking network access'
              ]
            });
            break;
        }
      }
    }

    return recommendations;
  }
}

export default NetworkHealthChecker;
