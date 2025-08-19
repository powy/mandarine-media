# Project Setup Guide

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
