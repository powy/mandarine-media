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

## update database

```bash
Basic Commands:
  # From the backend directory:
  cd kyool-media/backend

  # Create a new migration after model changes:
  alembic revision --autogenerate -m "Description of changes"

  # Apply migrations to database:
  alembic upgrade head

  # Check current migration version:
  alembic current

  # See migration history:
  alembic history


```

## Deploy Web App to S3

### Build and Deploy Web App

```bash
# Build the web app for production
npx nx build web --prod

# Sync built files to S3 bucket (replace with actual bucket name)
aws s3 sync apps/web/dist/ s3://your-web-app-bucket-name --delete

# Invalidate CloudFront cache if using CloudFront (replace with distribution ID)
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### Alternative deployment with specific AWS profile

```bash
# Build the web app
npx nx build web --prod

# Deploy with specific AWS profile
aws s3 sync apps/web/dist/ s3://your-web-app-bucket-name --delete --profile your-aws-profile

# Invalidate CloudFront cache with profile
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*" --profile your-aws-profile
```
