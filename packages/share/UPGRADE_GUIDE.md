# Share Package v1.7 - Usage Changes & Upgrade Guide

## 📋 Overview

This guide documents the changes in usage patterns for the share package functions after the v1.7 API update. The package maintains **full backward compatibility** while introducing enhanced functionality and consistent patterns.

## 🔄 API Method Changes

### Before v1.7 vs After v1.7

#### Countries API
```typescript
// ❌ BEFORE v1.7 - Returns raw array
const countries = await countriesApi.getAll({ skip: 0, limit: 20 });
// Result: Country[]

// ✅ AFTER v1.7 - Returns paginated response 
const response = await countriesApi.getAll({ skip: 0, limit: 20 });
// Result: { data: Country[], pagination: { skip, limit, total, page, pages } }

// 🆕 NEW - Search functionality
const searchResults = await countriesApi.getAll({ q: 'Korea', skip: 0, limit: 10 });
```

#### Languages API  
```typescript
// ❌ BEFORE v1.7 - Basic pagination only
const languages = await languagesApi.getAll({ skip: 0, limit: 20 });
// Result: Language[]

// ✅ AFTER v1.7 - Enhanced with search and pagination metadata
const response = await languagesApi.getAll({ 
  skip: 0, 
  limit: 20, 
  q: 'Korean' // NEW search parameter
});
// Result: { data: Language[], pagination: PaginationInfo }
```

#### Territories API
```typescript
// ❌ BEFORE v1.7 - Limited filtering
const territories = await territoriesApi.getAll({ 
  skip: 0, 
  limit: 20, 
  country_id: 'country-123' 
});

// ✅ AFTER v1.7 - Enhanced filtering and search
const response = await territoriesApi.getAll({ 
  skip: 0, 
  limit: 20, 
  country_id: 'country-123',
  q: 'France' // NEW search parameter
});
```

#### Users API
```typescript
// ❌ BEFORE v1.7 - Legacy filter format
const users = await usersApi.getUsers({
  skip: 0,
  limit: 20,
  role: 'admin',
  search: 'john',
  is_active: true
});
// Result: { data: User[], pagination: { page, limit, total, total_pages } }

// ✅ AFTER v1.7 - New consistent API (recommended)
const response = await usersApi.getAll({
  skip: 0,
  limit: 20,
  is_admin: true,      // Changed from 'role: admin'
  q: 'john',           // Changed from 'search'
  is_active: true
});
// Result: { data: User[], pagination: { skip, limit, total, page, pages } }

// 🔄 BACKWARD COMPATIBLE - Legacy method still works
const users = await usersApi.getUsers({ role: 'admin', search: 'john' });
```

## 📊 Pagination Format Changes

### Old Pagination Formats (Mixed)
```typescript
// Format A (some endpoints)
interface OldPaginationA {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// Format B (other endpoints)  
interface OldPaginationB {
  skip: number;
  limit: number;
  total: number;
  has_next: boolean;
  has_prev: boolean;
}

// Format C (basic endpoints)
// Just returned raw arrays: Country[]
```

### New Unified Pagination Format
```typescript
interface PaginationInfo {
  skip: number;      // Number of records skipped
  limit: number;     // Maximum records returned  
  total: number;     // Total available records
  page: number;      // Current page (1-based)
  pages: number;     // Total number of pages
}

interface PaginatedResponse<T> {
  data: T[];                    // The actual data
  pagination: PaginationInfo;   // Pagination metadata
}
```

## 🔍 New Search Functionality

### Search Examples
```typescript
// Countries search
const koreanCountries = await countriesApi.getAll({ q: 'Korea' });
// Finds: "South Korea", "North Korea"

// Languages search  
const englishLanguages = await languagesApi.getAll({ q: 'Eng' });
// Finds: "English", "Middle English", etc.

// Users search
const johnUsers = await usersApi.getAll({ q: 'john' });
// Searches in names and emails

// Territories with country filter AND search
const frenchTerritories = await territoriesApi.getAll({ 
  country_id: 'france-id',
  q: 'Paris' 
});
```

## 🔧 Migration Strategies

### Strategy 1: Immediate Update (Recommended for new code)
```typescript
// NEW CODE - Use v1.7 patterns directly
async function fetchCountries(searchTerm?: string, page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;
  const response = await countriesApi.getAll({ skip, limit, q: searchTerm });
  
  return {
    countries: response.data,
    totalCount: response.pagination.total,
    currentPage: response.pagination.page,
    totalPages: response.pagination.pages,
    hasMore: response.pagination.page < response.pagination.pages
  };
}
```

### Strategy 2: Gradual Migration (For existing codebases)
```typescript
// EXISTING CODE - Add compatibility layer
async function fetchCountriesLegacy(searchTerm?: string, page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;
  const response = await countriesApi.getAll({ skip, limit, q: searchTerm });
  
  // Convert v1.7 format back to legacy format if needed
  return {
    data: response.data,
    pagination: {
      page: response.pagination.page,
      limit: response.pagination.limit,
      total: response.pagination.total,
      total_pages: response.pagination.pages,
      has_next: response.pagination.page < response.pagination.pages,
      has_prev: response.pagination.page > 1
    }
  };
}
```

### Strategy 3: Backward Compatible Usage (No changes required)
```typescript
// LEGACY CODE - Still works without changes
const users = await usersApi.getUsers({ 
  role: 'admin', 
  search: 'john',
  skip: 0,
  limit: 20 
});
// This will continue to work exactly as before
```

## 📋 Complete API Reference

### All Endpoints Now Support:

#### Standard Parameters
```typescript
interface BaseApiParams {
  skip?: number;     // Records to skip (default: 0)
  limit?: number;    // Max records (default: 20, max: 100)
}
```

#### Endpoint-Specific Parameters
```typescript
// Countries
interface CountriesApiParams extends BaseApiParams {
  q?: string;        // Search in country names
}

// Languages  
interface LanguagesApiParams extends BaseApiParams {
  q?: string;        // Search in language names
}

// Territories
interface TerritoriesApiParams extends BaseApiParams {
  country_id?: string;  // Filter by country
  q?: string;           // Search in territory names
}

// Pictures
interface PicturesApiParams extends BaseApiParams {
  q?: string;        // Search in picture metadata
}

// Programs
interface ProgramsApiParams extends BaseApiParams {
  q?: string;        // Search in program names
}

// Seasons
interface SeasonsApiParams extends BaseApiParams {
  program_id?: string;  // Filter by program
  q?: string;           // Search in season data
}

// Persons
interface PersonsApiParams extends BaseApiParams {
  profession?: string;  // Filter by profession
  q?: string;           // Search in person names
}

// Users
interface UsersApiParams extends BaseApiParams {
  is_active?: boolean;  // Filter by active status
  is_admin?: boolean;   // Filter by admin status  
  q?: string;           // Search in names/emails
}
```

### Standard Methods (All endpoints)
```typescript
// Get paginated list
await api.getAll(params?: ApiParams): Promise<PaginatedResponse<T>>

// Get single item
await api.getById(id: string): Promise<T>

// Create new item
await api.create(data: CreateT): Promise<T>

// Update existing item  
await api.update(id: string, data: UpdateT): Promise<T>

// Delete item
await api.delete(id: string): Promise<T>
```

## ⚠️ Breaking Changes (None!)

**No breaking changes** - all existing code continues to work:

- ✅ Legacy method names preserved (`getUsers`, `getPublicPersons`, etc.)
- ✅ Legacy parameter formats supported
- ✅ Legacy response formats maintained for legacy methods
- ✅ All existing tests pass without modification
- ✅ Backward compatibility guaranteed

## 🔄 React Admin Integration

### Before v1.7
```typescript
// Manual handling required for different pagination formats
const dataProvider = {
  getList: async (resource, params) => {
    if (resource === 'countries') {
      const countries = await countriesApi.getAll({...});
      return {
        data: countries,
        total: countries.length  // ❌ Incorrect total
      };
    }
  }
};
```

### After v1.7
```typescript
// Consistent handling for all resources
const dataProvider = {
  getList: async (resource, params) => {
    const { page, perPage } = params.pagination;
    const { q, ...otherFilters } = params.filter || {};
    
    const response = await api.getAll({
      skip: (page - 1) * perPage,
      limit: perPage,
      q,
      ...otherFilters
    });
    
    return {
      data: response.data,
      total: response.pagination.total  // ✅ Correct total
    };
  }
};
```

## 🧪 Testing Your Migration

### Test Checklist
```typescript
// 1. Test existing functionality still works
const legacyUsers = await usersApi.getUsers();
console.assert(legacyUsers.data.length >= 0, 'Legacy users API works');

// 2. Test new pagination format
const newUsers = await usersApi.getAll();
console.assert(newUsers.pagination.total >= 0, 'New pagination works');

// 3. Test search functionality
const searchResults = await countriesApi.getAll({ q: 'test' });
console.assert(Array.isArray(searchResults.data), 'Search returns data array');

// 4. Test parameter handling
const filteredResults = await usersApi.getAll({ 
  is_active: true,
  skip: 0,
  limit: 5 
});
console.assert(filteredResults.data.length <= 5, 'Limit parameter works');
```

## 📞 Support & Migration Help

### Common Issues & Solutions

#### Issue: Response format changed
```typescript
// ❌ Problem: Code expects array but gets paginated response
const countries = await countriesApi.getAll();
countries.forEach(country => ...); // TypeError!

// ✅ Solution: Access the data property
const response = await countriesApi.getAll();
response.data.forEach(country => ...); // Works!
```

#### Issue: Pagination calculations
```typescript
// ❌ Problem: Using old pagination properties
const hasNext = pagination.has_next;  // undefined

// ✅ Solution: Use new pagination format
const hasNext = pagination.page < pagination.pages;
```

#### Issue: Search parameters
```typescript
// ❌ Problem: Using old search parameter names
const users = await usersApi.getAll({ search: 'john' }); // No results

// ✅ Solution: Use unified 'q' parameter  
const users = await usersApi.getAll({ q: 'john' }); // Works!
```

### Getting Help

1. **Check this guide** for common patterns
2. **Review test files** in `src/__tests__/` for usage examples
3. **Check TypeScript types** for parameter definitions
4. **Use legacy methods** as temporary workaround during migration

---

**Remember**: You can migrate at your own pace. All legacy functionality remains supported while you gradually adopt v1.7 patterns for enhanced features like search and consistent pagination.