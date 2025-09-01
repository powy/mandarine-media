# Project Setup Guide

## Build share package (prod or dev)

```bash
npm run build:share
npm run dev:share
```

## Mobile App

```bash
npm install
npx nx run mobile:android
```

## alpha mobile app

### First terminal

```bash
npm install
npx nx run alpha:start --reset-cache
```

### second terminal

```bash
npx nx run alpha:android
```

## Web App

```bash
npm install
npx nx serve web
```

## Back Office

```bash
npm install
npx nx serve backoffice
```

## Backend Server

```bash
cd backend
docker-compose -f docker-compose.dev.yml build
docker-compose -f docker-compose.dev.yml up
```

```bash
./venv/activate
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

## Android Emulator (Windows)

### List Available Emulators

```bash
emulator -list-avds
```

### Start Emulator

```bash
# Replace <your_emulator_name> with your actual emulator name
emulator -avd <your_emulator_name>

# Example:
emulator -avd Pixel_4_API_35
```

## uspadte sdtabase

```bash
Basic Commands:
  # From the backend directory:
  cd /home/powy/code/media_workspace/kyool-media/backend

  # Create a new migration after model changes:
  alembic revision --autogenerate -m "Description of changes"

  # Apply migrations to database:
  alembic upgrade head

  # Check current migration version:
  alembic current

  # See migration history:
  alembic history


```
