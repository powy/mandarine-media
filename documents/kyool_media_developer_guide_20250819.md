# Kyool Media Platform - Developer Guide

**Document Date:** August 19, 2025  
**Version:** 1.0.0  
**Target Audience:** Developers joining the Kyool Media team

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Architecture Deep Dive](#architecture-deep-dive)
4. [Development Workflows](#development-workflows)
5. [Adding New Features](#adding-new-features)
6. [Modifying Existing Features](#modifying-existing-features)
7. [Database Operations](#database-operations)
8. [API Development](#api-development)
9. [Frontend Development](#frontend-development)
10. [Testing Guidelines](#testing-guidelines)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)

---

## Overview

Kyool Media is a Korean media streaming platform built as a monorepo with multiple client applications sharing common functionality. The platform serves video content, webtoons, and other media through a modern web interface and mobile applications.

### Technology Stack

**Frontend:**
- **React 18** with TypeScript for all applications
- **Vite** for fast development and building
- **TanStack React Query** for server state management
- **Tailwind CSS** for styling (web app)
- **React Admin** for backoffice interface
- **React Native** for mobile applications

**Backend:**
- **FastAPI** (Python) for REST API
- **SQLAlchemy 2.0** for database ORM
- **PostgreSQL** (production) / SQLite (development)
- **Alembic** for database migrations
- **JWT** for authentication

**Development Tools:**
- **NX** for monorepo management
- **npm workspaces** for dependency management
- **Docker** for backend development
- **pytest/Vitest** for testing

---

## Getting Started

### Prerequisites

Ensure you have the following installed:

```bash
# Required versions
node >= 18.0.0
npm >= 8.0.0  
python >= 3.12
docker >= 20.0.0
docker-compose >= 2.0.0
```

### Initial Setup

1. **Clone and Install Dependencies:**

```bash
git clone <repository-url>
cd kyool-media

# Install all workspace dependencies
npm install

# Install backend dependencies
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Environment Configuration:**

```bash
# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Frontend environment (if needed)
cp apps/web/.env.example apps/web/.env
```

3. **Database Setup:**

```bash
cd backend

# Run database migrations
alembic upgrade head

# Create initial admin user
python scripts/create_admin.py

# Seed with sample data (optional)
python scripts/db_seeder.py --file data/test_seed_data.xlsx
```

4. **Start Development Servers:**

```bash
# From project root - starts all frontend apps
npm run dev

# In separate terminal - start backend
npm run start:backend
```

**Access Points:**
- Web App: http://localhost:3000
- Backoffice: http://localhost:3001
- Alpha App: Metro bundler will provide URLs
- API Documentation: http://localhost:8000/docs

---

## Architecture Deep Dive

### Monorepo Structure

```
kyool-media/
├── apps/                          # Frontend applications
│   ├── web/                      # Public web application
│   │   ├── src/
│   │   │   ├── components/       # Reusable UI components
│   │   │   ├── screens/          # Page-level components
│   │   │   ├── config/           # App configuration
│   │   │   └── mock-data/        # Development data
│   │   └── package.json
│   ├── backoffice/               # Admin interface
│   │   ├── src/
│   │   │   ├── components/resources/  # React Admin resources
│   │   │   ├── dataProvider/         # API integration
│   │   │   └── authProvider.ts       # Authentication logic
│   │   └── package.json
│   ├── alpha/                    # React Native app (primary mobile)
│   └── mobile/                   # React Native app (alternative)
├── packages/share/               # Shared utilities and API client
│   ├── src/
│   │   ├── api/                  # API client and methods
│   │   ├── types/                # TypeScript type definitions  
│   │   ├── hooks/                # Reusable React hooks
│   │   ├── utils/                # Utility functions
│   │   └── components/           # Shared components
│   └── package.json
├── backend/                      # Python FastAPI server
│   ├── app/
│   │   ├── api/v1/              # API endpoints
│   │   ├── core/                # Configuration and security
│   │   ├── crud/                # Database operations
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   └── services/            # Business logic
│   ├── tests/                   # Backend tests
│   ├── alembic/                 # Database migrations
│   └── scripts/                 # Utility scripts
└── tests/                       # E2E and integration tests
```

### Data Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend Apps │◄──►│  Shared Package  │◄──►│   Backend API   │
│                 │    │                  │    │                 │
│ • Web           │    │ • API Client     │    │ • FastAPI       │
│ • Backoffice    │    │ • Auth Logic     │    │ • Database      │
│ • Mobile Apps   │    │ • Type Defs      │    │ • File Storage  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Shared Package Architecture

The `packages/share` directory is the cornerstone of the monorepo, providing:

1. **API Client (`src/api/`):**
   - Centralized HTTP client with interceptors
   - Automatic token refresh logic
   - Type-safe API methods for all endpoints

2. **Authentication (`src/hooks/useAuth.ts`):**
   - Cross-platform auth state management
   - Token storage abstraction
   - Login/logout functionality

3. **Types (`src/types/`):**
   - Comprehensive TypeScript interfaces
   - API request/response types
   - Domain model definitions

4. **Utilities (`src/utils/`):**
   - Storage abstraction (web/mobile)
   - Excel parsing for data imports
   - Validation helpers

---

## Development Workflows

### Daily Development Process

1. **Start Development Environment:**
```bash
# Terminal 1: Frontend apps
npm run dev

# Terminal 2: Backend API
npm run start:backend

# Terminal 3: Available for commands
```

2. **Code Quality Checks:**
```bash
# Run linting across all projects
npm run lint

# Type checking
npm run type-check

# Run tests
npm run test
```

3. **Database Operations:**
```bash
cd backend

# Create new migration
alembic revision --autogenerate -m "Add new field"

# Apply migrations
alembic upgrade head

# Rollback if needed
alembic downgrade -1
```

### Branch Strategy

```
main                    # Production-ready code
├── develop            # Integration branch
├── feature/xxxx       # New features
├── bugfix/xxxx        # Bug fixes
└── hotfix/xxxx        # Critical production fixes
```

### Code Review Process

Before submitting PRs:

1. **Run Quality Checks:**
```bash
npm run lint
npm run type-check
npm run test
```

2. **Test Your Changes:**
   - Unit tests for new functions
   - Integration tests for API changes
   - Manual testing across affected apps

3. **Update Documentation:**
   - Update TypeScript interfaces
   - Add/update API documentation
   - Update README if needed

---

## Adding New Features

### 1. Adding a New API Endpoint

**Step 1: Create Database Model** (`backend/app/models/`)

```python
# backend/app/models/new_entity.py
from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
import uuid
from app.db.database import Base
from app.models.common import GUID

class NewEntity(Base):
    __tablename__ = "new_entities"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creation_date_utc = Column(DateTime(timezone=True), server_default=func.now())
    name = Column(String, nullable=False)
    description = Column(String)
```

**Step 2: Create Pydantic Schemas** (`backend/app/schemas/`)

```python
# backend/app/schemas/new_entity.py
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class NewEntityBase(BaseModel):
    name: str
    description: Optional[str] = None

class NewEntityCreate(NewEntityBase):
    pass

class NewEntityUpdate(NewEntityBase):
    name: Optional[str] = None

class NewEntity(NewEntityBase):
    id: str
    creation_date_utc: datetime

    model_config = {"from_attributes": True}
```

**Step 3: Create CRUD Operations** (`backend/app/crud/`)

```python
# backend/app/crud/new_entity.py
from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.new_entity import NewEntity
from app.schemas.new_entity import NewEntityCreate, NewEntityUpdate

class CRUDNewEntity(CRUDBase[NewEntity, NewEntityCreate, NewEntityUpdate]):
    def get_by_name(self, db: Session, *, name: str) -> Optional[NewEntity]:
        return db.query(NewEntity).filter(NewEntity.name == name).first()

new_entity = CRUDNewEntity(NewEntity)
```

**Step 4: Create API Endpoints** (`backend/app/api/v1/endpoints/`)

```python
# backend/app/api/v1/endpoints/new_entities.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud.new_entity import new_entity as crud_new_entity
from app.schemas.new_entity import NewEntity, NewEntityCreate, NewEntityUpdate
from app.db.database import get_db

router = APIRouter()

@router.get("/", response_model=List[NewEntity])
def read_new_entities(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    entities = crud_new_entity.get_multi(db, skip=skip, limit=limit)
    return entities

@router.post("/", response_model=NewEntity)
def create_new_entity(
    entity_in: NewEntityCreate,
    db: Session = Depends(get_db)
):
    return crud_new_entity.create(db, obj_in=entity_in)
```

**Step 5: Register Router** (`backend/app/api/v1/api.py`)

```python
from app.api.v1.endpoints import new_entities

api_router.include_router(
    new_entities.router, 
    prefix="/new-entities", 
    tags=["new-entities"]
)
```

**Step 6: Generate Migration**

```bash
cd backend
alembic revision --autogenerate -m "Add new_entities table"
alembic upgrade head
```

### 2. Adding Frontend API Integration

**Step 1: Add API Methods** (`packages/share/src/api/`)

```typescript
// packages/share/src/api/new-entities.ts
import { apiClient } from './client';
import { NewEntity, NewEntityCreate, NewEntityUpdate } from '../types';

export const newEntitiesApi = {
  getAll: async (): Promise<NewEntity[]> => {
    const response = await apiClient.get('/api/v1/new-entities/');
    return response.data;
  },

  create: async (entity: NewEntityCreate): Promise<NewEntity> => {
    const response = await apiClient.post('/api/v1/new-entities/', entity);
    return response.data;
  },

  update: async (id: string, entity: NewEntityUpdate): Promise<NewEntity> => {
    const response = await apiClient.put(`/api/v1/new-entities/${id}`, entity);
    return response.data;
  }
};
```

**Step 2: Add TypeScript Types** (`packages/share/src/types/`)

```typescript
// packages/share/src/types/index.ts
export interface NewEntity {
  id: string;
  creation_date_utc: string;
  name: string;
  description?: string;
}

export interface NewEntityCreate {
  name: string;
  description?: string;
}

export interface NewEntityUpdate {
  name?: string;
  description?: string;
}
```

**Step 3: Create React Hook** (`packages/share/src/hooks/`)

```typescript
// packages/share/src/hooks/useNewEntities.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newEntitiesApi } from '../api/new-entities';
import { NewEntity, NewEntityCreate, NewEntityUpdate } from '../types';

export const useNewEntities = () => {
  const queryClient = useQueryClient();

  const newEntitiesQuery = useQuery({
    queryKey: ['new-entities'],
    queryFn: newEntitiesApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: newEntitiesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['new-entities'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: NewEntityUpdate }) => 
      newEntitiesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['new-entities'] });
    },
  });

  return {
    entities: newEntitiesQuery.data || [],
    isLoading: newEntitiesQuery.isLoading,
    error: newEntitiesQuery.error,
    createEntity: createMutation.mutateAsync,
    updateEntity: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
};
```

**Step 4: Update Shared Package Exports**

```typescript
// packages/share/src/index.ts
export * from './api/new-entities';
export * from './hooks/useNewEntities';
```

### 3. Adding Backoffice Interface

**Step 1: Create Resource Component** (`apps/backoffice/src/components/resources/`)

```typescript
// apps/backoffice/src/components/resources/NewEntities.tsx
import React from 'react';
import {
  List, Datagrid, TextField, DateField,
  Create, SimpleForm, TextInput,
  Edit, Show, SimpleShowLayout,
  required
} from 'react-admin';

export const NewEntityList = () => (
  <List>
    <Datagrid rowClick="show">
      <TextField source="name" />
      <TextField source="description" />
      <DateField source="creation_date_utc" />
    </Datagrid>
  </List>
);

export const NewEntityCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="name" validate={[required()]} />
      <TextInput source="description" multiline rows={4} />
    </SimpleForm>
  </Create>
);

export const NewEntityEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="name" validate={[required()]} />
      <TextInput source="description" multiline rows={4} />
    </SimpleForm>
  </Edit>
);

export const NewEntityShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="name" />
      <TextField source="description" />
      <DateField source="creation_date_utc" />
    </SimpleShowLayout>
  </Show>
);
```

**Step 2: Register Resource** (`apps/backoffice/src/App.tsx`)

```typescript
import { NewEntityList, NewEntityCreate, NewEntityEdit, NewEntityShow } from './components/resources/NewEntities';

// Add to the Admin component
<Resource
  name="new-entities"
  list={NewEntityList}
  create={NewEntityCreate}
  edit={NewEntityEdit}
  show={NewEntityShow}
  options={{ label: 'New Entities' }}
/>
```

### 4. Adding Web App Interface

**Step 1: Create Component** (`apps/web/src/components/`)

```typescript
// apps/web/src/components/NewEntityList.tsx
import React from 'react';
import { useNewEntities } from 'share';

export const NewEntityList: React.FC = () => {
  const { entities, isLoading, error } = useNewEntities();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading entities</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {entities.map((entity) => (
        <div key={entity.id} className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">{entity.name}</h3>
          {entity.description && (
            <p className="text-gray-600 mt-2">{entity.description}</p>
          )}
        </div>
      ))}
    </div>
  );
};
```

**Step 2: Create Screen** (`apps/web/src/screens/`)

```typescript
// apps/web/src/screens/NewEntitiesScreen.tsx
import React from 'react';
import { NewEntityList } from '../components/NewEntityList';

export const NewEntitiesScreen: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">New Entities</h1>
      <NewEntityList />
    </div>
  );
};
```

**Step 3: Add Route** (`apps/web/src/App.tsx`)

```typescript
import { NewEntitiesScreen } from './screens/NewEntitiesScreen';

// Add to Routes
<Route path="/new-entities" element={<NewEntitiesScreen />} />
```

---

## Modifying Existing Features

### Updating Database Schema

1. **Modify Model:**
```python
# backend/app/models/existing_model.py
# Add new field
new_field = Column(String, nullable=True)
```

2. **Generate Migration:**
```bash
cd backend
alembic revision --autogenerate -m "Add new_field to existing_model"
alembic upgrade head
```

3. **Update Schemas:**
```python
# backend/app/schemas/existing_model.py
class ExistingModelBase(BaseModel):
    # ... existing fields
    new_field: Optional[str] = None
```

4. **Update Frontend Types:**
```typescript
// packages/share/src/types/index.ts
export interface ExistingModel {
  // ... existing fields
  new_field?: string;
}
```

### Modifying API Endpoints

1. **Update CRUD Operations:**
```python
# backend/app/crud/existing_model.py
# Add new methods or modify existing ones
def get_by_new_field(self, db: Session, *, new_field: str) -> Optional[ExistingModel]:
    return db.query(ExistingModel).filter(ExistingModel.new_field == new_field).first()
```

2. **Update API Endpoints:**
```python
# backend/app/api/v1/endpoints/existing_models.py
@router.get("/search")
def search_by_new_field(
    new_field: str,
    db: Session = Depends(get_db)
):
    return crud_existing_model.get_by_new_field(db, new_field=new_field)
```

3. **Update Frontend API Client:**
```typescript
// packages/share/src/api/existing-models.ts
export const existingModelsApi = {
  // ... existing methods
  searchByNewField: async (newField: string): Promise<ExistingModel[]> => {
    const response = await apiClient.get(`/api/v1/existing-models/search?new_field=${newField}`);
    return response.data;
  }
};
```

### Updating Frontend Components

1. **Update Shared Hook:**
```typescript
// packages/share/src/hooks/useExistingModels.ts
const searchQuery = useQuery({
  queryKey: ['existing-models', 'search', searchTerm],
  queryFn: () => existingModelsApi.searchByNewField(searchTerm),
  enabled: !!searchTerm,
});
```

2. **Update Component:**
```typescript
// apps/web/src/components/ExistingModelComponent.tsx
// Add new field display or input
<input 
  type="text" 
  value={model.new_field || ''} 
  onChange={(e) => updateModel({ new_field: e.target.value })}
/>
```

---

## Database Operations

### Common Migration Patterns

**Add New Table:**
```bash
alembic revision --autogenerate -m "Add new table"
```

**Add Column:**
```python
# In migration file
op.add_column('table_name', sa.Column('column_name', sa.String(), nullable=True))
```

**Add Index:**
```python
op.create_index(op.f('ix_table_column'), 'table', ['column'], unique=False)
```

**Data Migration:**
```python
# In migration file - for data changes
from alembic import op
import sqlalchemy as sa

def upgrade():
    connection = op.get_bind()
    connection.execute(
        sa.text("UPDATE table_name SET column_name = 'default_value'")
    )
```

### Seeding Data

**Using Excel Files:**
```bash
cd backend
python scripts/db_seeder.py --file data/your_data.xlsx
```

**Programmatic Seeding:**
```python
# scripts/seed_custom_data.py
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.crud.your_model import your_model
from app.schemas.your_model import YourModelCreate

def seed_data():
    db = SessionLocal()
    try:
        # Create sample data
        sample_data = YourModelCreate(
            name="Sample",
            description="Sample description"
        )
        your_model.create(db, obj_in=sample_data)
        db.commit()
    finally:
        db.close()
```

---

## API Development

### Authentication Middleware

All API endpoints automatically receive authentication via the shared middleware. To require authentication:

```python
from app.api.deps import get_current_active_user

@router.get("/protected-endpoint")
def protected_endpoint(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # User is authenticated and active
    return {"user_id": current_user.id}
```

### Admin-Only Endpoints

```python
from app.api.deps import get_current_admin_user

@router.delete("/{id}")
def delete_item(
    id: str,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    # Only admin users can access this endpoint
    return crud_item.remove(db, id=id)
```

### File Upload Endpoints

```python
from fastapi import UploadFile, File
from app.services.upload_service import MediaUploadService

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    media_type: str = "video"  # video, webtoon, etc.
):
    upload_service = MediaUploadService()
    result = await upload_service.upload_file(file, media_type)
    return {"file_url": result.file_url, "file_id": result.file_id}
```

### Error Handling

```python
from fastapi import HTTPException, status

@router.get("/{id}")
def get_item(id: str, db: Session = Depends(get_db)):
    item = crud_item.get(db, id=id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    return item
```

---

## Frontend Development

### Component Structure

**Recommended Component Structure:**
```typescript
// Component with proper TypeScript and error handling
import React, { useState } from 'react';
import { useItems } from 'share';

interface ItemListProps {
  categoryId?: string;
  limit?: number;
}

export const ItemList: React.FC<ItemListProps> = ({ 
  categoryId, 
  limit = 10 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { items, isLoading, error } = useItems({ categoryId, limit, searchTerm });

  if (isLoading) {
    return <div className="animate-pulse">Loading items...</div>;
  }

  if (error) {
    return (
      <div className="text-red-600">
        Error loading items: {error.message}
      </div>
    );
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Search items..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-2 border rounded"
      />
      
      {items.length === 0 ? (
        <div className="text-gray-500">No items found</div>
      ) : (
        <div className="grid gap-4">
          {items.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};
```

### State Management

**Using TanStack Query:**
```typescript
// Custom hook for complex state management
export const useItemManagement = () => {
  const queryClient = useQueryClient();
  
  const itemsQuery = useQuery({
    queryKey: ['items'],
    queryFn: itemsApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: itemsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      // Show success notification
    },
    onError: (error) => {
      // Show error notification
      console.error('Failed to create item:', error);
    },
  });

  return {
    items: itemsQuery.data || [],
    isLoading: itemsQuery.isLoading,
    error: itemsQuery.error,
    createItem: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
};
```

### Form Handling

**Recommended Form Pattern:**
```typescript
interface FormData {
  name: string;
  description: string;
}

export const ItemForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const { createItem, isCreating } = useItemManagement();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const newErrors: Partial<FormData> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await createItem(formData);
      // Reset form or redirect
      setFormData({ name: '', description: '' });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="text"
          placeholder="Name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className={`w-full p-2 border rounded ${errors.name ? 'border-red-500' : ''}`}
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>
      
      <button
        type="submit"
        disabled={isCreating}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {isCreating ? 'Creating...' : 'Create Item'}
      </button>
    </form>
  );
};
```

---

## Testing Guidelines

### Backend Testing

**Unit Tests:**
```python
# tests/test_crud_items.py
import pytest
from sqlalchemy.orm import Session
from app.crud.item import item as crud_item
from app.schemas.item import ItemCreate

def test_create_item(db: Session):
    item_in = ItemCreate(
        name="Test Item",
        description="Test Description"
    )
    item = crud_item.create(db=db, obj_in=item_in)
    assert item.name == item_in.name
    assert item.description == item_in.description
```

**API Tests:**
```python
# tests/test_api_items.py
import pytest
from fastapi.testclient import TestClient

def test_create_item(client: TestClient, admin_token: str):
    response = client.post(
        "/api/v1/items/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Test Item",
            "description": "Test Description"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Item"
```

### Frontend Testing

**Component Tests:**
```typescript
// __tests__/ItemList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ItemList } from '../components/ItemList';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

test('renders loading state', () => {
  const queryClient = createTestQueryClient();
  
  render(
    <QueryClientProvider client={queryClient}>
      <ItemList />
    </QueryClientProvider>
  );
  
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
```

**Hook Tests:**
```typescript
// __tests__/useItems.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useItems } from '../hooks/useItems';

test('should fetch items successfully', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: any) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const { result } = renderHook(() => useItems(), { wrapper });

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.items).toBeDefined();
});
```

### E2E Testing

**Basic E2E Test:**
```javascript
// e2e/basic-flow.test.js
const puppeteer = require('puppeteer');

describe('Basic User Flow', () => {
  let browser, page;

  beforeAll(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  test('should login and navigate to content', async () => {
    await page.goto('http://localhost:3000/login');
    
    await page.fill('input[type="email"]', 'admin@kyool.com');
    await page.fill('input[type="password"]', 'adminpassword');
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation();
    expect(page.url()).toContain('/content');
  });
});
```

---

## Deployment

### Environment Configuration

**Production Environment Variables:**

```bash
# Backend (.env)
ENVIRONMENT=production
SECRET_KEY=your-very-secure-secret-key
DATABASE_URI=postgresql://user:pass@host:port/db
CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com

# File Storage
UPLOAD_S3_BUCKET_NAME=your-bucket
UPLOAD_S3_ACCESS_KEY=your-access-key
UPLOAD_S3_SECRET_KEY=your-secret-key

# Mux (optional)
UPLOAD_MUX_TOKEN_ID=your-mux-token-id
UPLOAD_MUX_TOKEN_SECRET=your-mux-token-secret
```

### Build Process

**Frontend Build:**
```bash
# Build all applications
npm run build

# This creates:
# - apps/web/dist/
# - apps/backoffice/dist/
# - packages/share/dist/
```

**Backend Deployment:**
```bash
cd backend

# Install production dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start production server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker Deployment

**Production Docker Compose:**
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URI=postgresql://user:pass@db:5432/kyool_media
    depends_on:
      - db

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=kyool_media
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./apps/web/dist:/var/www/web
      - ./apps/backoffice/dist:/var/www/backoffice

volumes:
  postgres_data:
```

---

## Troubleshooting

### Common Development Issues

**1. "Module not found" errors:**
```bash
# Clear all caches and reinstall
npm run clean
npm install
cd backend && pip install -r requirements.txt
```

**2. Database migration issues:**
```bash
cd backend

# Reset to specific migration
alembic downgrade <revision_id>

# Or reset completely (DANGEROUS - data loss)
alembic downgrade base
alembic upgrade head
```

**3. Authentication not working:**
```bash
# Check token storage
# In browser console:
localStorage.getItem('auth_token')

# Clear authentication state
localStorage.clear()
```

**4. CORS issues:**
```python
# backend/app/core/config.py
CORS_ORIGINS = "http://localhost:3000,http://localhost:3001"
```

### Performance Issues

**Slow API responses:**
1. Check database queries with EXPLAIN ANALYZE
2. Add database indexes
3. Implement API response caching
4. Use database connection pooling

**Frontend performance:**
1. Use React DevTools Profiler
2. Implement component memoization
3. Add lazy loading for routes
4. Optimize bundle size with analysis

### Debugging Tips

**Backend Debugging:**
```python
# Add debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Use pdb for breakpoints
import pdb; pdb.set_trace()
```

**Frontend Debugging:**
```typescript
// React Query DevTools (development only)
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <>
      {/* Your app */}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```

---

## Best Practices Summary

### Code Quality
- Always use TypeScript with strict mode
- Write comprehensive type definitions
- Implement proper error handling
- Add meaningful comments for complex logic

### Security
- Never hardcode secrets or credentials
- Always validate user input
- Use environment variables for configuration
- Implement proper CORS settings

### Performance
- Use database indexes appropriately
- Implement caching strategies
- Optimize bundle sizes
- Monitor API response times

### Testing
- Write unit tests for all business logic
- Add integration tests for API endpoints
- Test error scenarios
- Maintain good test coverage

### Documentation
- Keep this guide updated
- Document API changes
- Add inline code comments
- Update type definitions

---

This developer guide provides a comprehensive foundation for working with the Kyool Media platform. As you develop new features or modify existing ones, remember to follow these patterns and update this documentation to help future team members.

For questions or clarifications, refer to the API documentation at `/docs` when the backend is running, or consult with the team lead.