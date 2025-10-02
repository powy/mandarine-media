import { MediaDescription } from '../types';

// Authorized countries list - hardcoded for Phase 1
const AUTHORIZED_COUNTRIES = [
  'FR', // France
  'GP', // Guadeloupe (French territory)
  'MQ', // Martinique (French territory)
  'RE', // Réunion (French territory)
  'GF', // French Guiana (French territory)
  'YT', // Mayotte (French territory)
  'NC', // New Caledonia (French territory)
  'PF', // French Polynesia (French territory)
  'BE', // Belgium
  'CH', // Switzerland
  'LU', // Luxembourg
  'CA'  // Canada
];

// Cache key for session storage
const COUNTRY_CACHE_KEY = 'user_country_code';

// Interfaces for API responses
interface IPApiResponse {
  status: string;
  country: string;
  countryCode: string;
}

interface IPGeolocationResponse {
  country_code2: string;
  country_name: string;
}

interface RegionAccessResult {
  isAuthorized: boolean;
  error?: 'network_error' | 'verification_failed' | 'region_blocked';
  countryCode?: string;
}

/**
 * Gets user's country code from cache (session storage)
 */
function getCachedCountry(): string | null {
  try {
    return sessionStorage.getItem(COUNTRY_CACHE_KEY);
  } catch (error) {
    console.warn('Failed to access sessionStorage for country cache:', error);
    return null;
  }
}

/**
 * Caches user's country code in session storage
 */
function setCachedCountry(countryCode: string): void {
  try {
    sessionStorage.setItem(COUNTRY_CACHE_KEY, countryCode);
  } catch (error) {
    console.warn('Failed to cache country code in sessionStorage:', error);
  }
}

/**
 * Detects if we're running in a development environment
 */
function isDevelopmentEnvironment(): boolean {
  return (
    typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' || 
     window.location.hostname.includes('dev') ||
     process.env.NODE_ENV === 'development')
  );
}

/**
 * Fetches user's country from IP-API.com (development only)
 * Note: IP-API.com only supports HTTP, which causes mixed content issues in production
 */
async function fetchCountryFromIPApi(): Promise<string | null> {
  // Skip IP-API.com in production to avoid HTTP/HTTPS mixed content blocking
  if (!isDevelopmentEnvironment()) {
    console.warn('Skipping IP-API.com in production due to HTTP/HTTPS mixed content issues');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const protocol = 'http'; // IP-API.com only supports HTTP (development only)

    const response = await fetch(
      `${protocol}://ip-api.com/json/?fields=status,country,countryCode`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: IPApiResponse = await response.json();

    console.log('IP-API.com response:', data);

    if (data.status === 'success' && data.countryCode) {
      console.log('IP-API.com detected country:', data.countryCode, data.country);
      return data.countryCode;
    }

    throw new Error(`Invalid response status: ${data.status}`);
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('IP-API.com failed:', error);

    // Log more details about the error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn('Network error - possibly CORS or mixed content issue');
    }

    return null;
  }
}

/**
 * Fetches user's country from IPGeolocation.io (fallback service)
 */
async function fetchCountryFromIPGeolocation(): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(
      'https://api.ipgeolocation.io/ipgeo?apiKey=free',
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: IPGeolocationResponse = await response.json();
    
    if (data.country_code2) {
      console.log('IPGeolocation.io detected country:', data.country_code2, data.country_name);
      return data.country_code2;
    }

    throw new Error('Invalid response: missing country_code2');
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('IPGeolocation.io failed:', error);
    return null;
  }
}

/**
 * Attempts to get country from Cloudflare headers (if available)
 */
function getCountryFromCloudflare(): string | null {
  try {
    // This would be available if the app is behind Cloudflare
    // The header would be injected by Cloudflare and made available to JS
    // For now, this is a placeholder for future implementation
    return null;
  } catch (error) {
    console.warn('Cloudflare country detection failed:', error);
    return null;
  }
}

/**
 * Gets user's country code using multiple fallback methods
 */
export async function getUserCountry(): Promise<string | null> {
  // Check cache first
  const cachedCountry = getCachedCountry();
  if (cachedCountry) {
    console.log('Using cached country:', cachedCountry);
    return cachedCountry;
  }

  // Development environment fallback for testing
  if (isDevelopmentEnvironment()) {
    console.log('Development environment detected - checking geolocation services...');

    // Try the services, but if they all fail, use a default country for testing
    let countryCode = await fetchCountryFromIPApi();
    if (countryCode) {
      setCachedCountry(countryCode);
      return countryCode;
    }

    countryCode = await fetchCountryFromIPGeolocation();
    if (countryCode) {
      setCachedCountry(countryCode);
      return countryCode;
    }

    // All services failed in development - use France as default for testing
    console.warn('All geolocation services failed in development. Using FR for testing.');
    const devCountry = 'FR'; // France - authorized country for testing
    setCachedCountry(devCountry);
    return devCountry;
  }

  // Production environment - prioritize HTTPS services first
  console.log('Production environment: trying HTTPS geolocation services...');

  // Try HTTPS service first: IPGeolocation.io
  let countryCode = await fetchCountryFromIPGeolocation();
  if (countryCode) {
    setCachedCountry(countryCode);
    return countryCode;
  }

  // Try Cloudflare headers (future implementation)
  countryCode = getCountryFromCloudflare();
  if (countryCode) {
    setCachedCountry(countryCode);
    return countryCode;
  }

  // Try HTTP service (will be skipped in production, but kept for completeness)
  countryCode = await fetchCountryFromIPApi();
  if (countryCode) {
    setCachedCountry(countryCode);
    return countryCode;
  }

  // All methods failed in production
  console.error('All geolocation methods failed in production');
  console.error('User will be blocked from accessing content due to geolocation verification failure');
  return null;
}

/**
 * Checks if a country code is in the authorized list
 */
export function isCountryAuthorized(countryCode: string): boolean {
  return AUTHORIZED_COUNTRIES.includes(countryCode.toUpperCase());
}

/**
 * Checks if user is in an authorized region for the given media
 * For Phase 1: ignores mediaDescription.available_countries_list and uses hardcoded list
 * Future: will prioritize mediaDescription.available_countries_list when available
 */
export async function checkRegionAccess(_mediaDescription: MediaDescription): Promise<RegionAccessResult> {
  try {
    const countryCode = await getUserCountry();
    
    if (!countryCode) {
      // All geolocation services failed - default to BLOCK with verification failed error
      return {
        isAuthorized: false,
        error: 'verification_failed'
      };
    }

    // Phase 1: Use hardcoded authorized countries list
    // Future: Check mediaDescription.available_countries_list first, then fallback to hardcoded
    const isAuthorized = isCountryAuthorized(countryCode);
    
    if (!isAuthorized) {
      return {
        isAuthorized: false,
        error: 'region_blocked',
        countryCode
      };
    }

    return {
      isAuthorized: true,
      countryCode
    };

  } catch (error) {
    console.error('Region access check failed:', error);
    return {
      isAuthorized: false,
      error: 'network_error'
    };
  }
}

/**
 * Clears cached country data (useful for testing or manual refresh)
 */
export function clearCountryCache(): void {
  try {
    sessionStorage.removeItem(COUNTRY_CACHE_KEY);
    console.log('Country cache cleared');
  } catch (error) {
    console.warn('Failed to clear country cache:', error);
  }
}

/**
 * Gets the list of authorized countries (for debugging/admin purposes)
 */
export function getAuthorizedCountries(): string[] {
  return [...AUTHORIZED_COUNTRIES];
}

/**
 * Development utility: Set a country code for testing purposes
 * This will override the geolocation detection in development environment only
 */
export function setTestCountry(countryCode: string): void {
  if (isDevelopmentEnvironment()) {
    setCachedCountry(countryCode.toUpperCase());
    console.log('Test country set to:', countryCode.toUpperCase());
  } else {
    console.warn('setTestCountry only works in development environment');
  }
}

/**
 * Development utility: Test with different countries
 * Usage in browser console:
 * - setTestCountry('FR') // Authorized - should allow
 * - setTestCountry('US') // Not authorized - should block
 * - clearCountryCache() // Reset and re-detect
 */
export function testRegionAccess(countryCode: string): void {
  if (isDevelopmentEnvironment()) {
    setTestCountry(countryCode);
    const isAuth = isCountryAuthorized(countryCode);
    console.log(`Testing ${countryCode}: ${isAuth ? 'AUTHORIZED' : 'BLOCKED'}`);
  } else {
    console.warn('testRegionAccess only works in development environment');
  }
}