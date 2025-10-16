# Kyool Media Uploader - Installation Guide

**Simple Node.js application - Just extract and run!**

## System Requirements

- **Windows 10/11** (64-bit)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **RAM:** 2GB minimum
- **Disk:** ~200MB

## Quick Start (Recommended)

### Step 1: Install Node.js

If not already installed:
1. Download from https://nodejs.org/ (LTS version)
2. Run installer
3. Verify: Open CMD and type `node --version`

### Step 2: Extract the ZIP

Extract `kyool-media-uploader-v1.0.0.zip` to any folder, for example:
```
C:\Kyool\media-uploader\
```

### Step 3: Run!

**Double-click `START.bat`**

That's it! The application will:
- Check Node.js is installed
- Install dependencies if needed (first run only)
- Start both services
- Open your browser to http://localhost:3010

**Logs are in:** `logs/` folder

**To stop:** Double-click `STOP.bat`

---

## What Gets Installed

```
kyool-media-uploader/
├── START.bat           ← Double-click to start
├── STOP.bat            ← Double-click to stop
├── src/                ← Source code (runs with Node.js)
├── logs/               ← All logs go here
│   ├── startup.log
│   ├── server.log
│   └── ui.log
├── package.json
└── docs/
    └── README_INSTALL.md (this file)
```

---

## Usage

### Start the Application

```
Double-click START.bat
```

Or from command line:
```powershell
cd C:\Kyool\media-uploader
START.bat
```

### Access the UI

Browser opens automatically to:
```
http://localhost:3010
```

### Stop the Application

```
Double-click STOP.bat
```

### View Logs

All logs are in the `logs/` folder:
- `startup.log` - Installation and startup events
- `server.log` - Server output (Port 3011)
- `ui.log` - UI output (Port 3010)

Application data logs:
```
%APPDATA%\Kyool\MediaUploader\logs\
```

---

## Advanced: Windows Service Installation (Optional)

If you want services to auto-start with Windows:

### Prerequisites
- Open PowerShell **as Administrator**
- Navigate to extracted folder

### Install as Windows Service

```powershell
npm install
node install-services.js
```

If successful:
- Services start automatically with Windows
- No need to run START.bat anymore
- Manage via `services.msc`

### Uninstall Services

```powershell
node uninstall-services.js
```

**Note:** Service installation may fail depending on Windows configuration. If it fails, just use START.bat (it always works).

---

## Troubleshooting

### START.bat doesn't work

1. **Check Node.js:**
   ```
   node --version
   ```
   Should show v18.x.x or higher

2. **Check logs:**
   ```
   logs\startup.log
   ```

3. **Ports in use:**
   ```powershell
   netstat -ano | findstr "3010"
   netstat -ano | findstr "3011"
   ```
   If ports are in use, stop the other application first

### Can't access UI (localhost:3010)

1. Check if services are running (look for console windows)
2. Check `logs\ui.log` for errors
3. Check `logs\server.log` - UI needs server running first

### First run is slow

First time running START.bat will:
- Install node_modules (takes 1-2 minutes)
- After that, startup is fast

### Permission errors

- Run START.bat from a folder you have write access to
- Don't extract to `C:\Program Files\` (use `C:\Kyool\` or similar)

---

## Data Locations

### Application Files
```
C:\Kyool\media-uploader\  (wherever you extracted)
```

### User Data
```
%APPDATA%\Kyool\MediaUploader\
├── data\
│   └── tasks.db       # Task database
├── logs\              # Application logs
└── temp\              # Temporary files
```

To open: Press `Win+R`, type `%APPDATA%\Kyool\MediaUploader`, press Enter

---

## Uninstallation

### Remove Services (if installed)

```powershell
node uninstall-services.js
```

### Delete Application

Delete the extraction folder:
```
C:\Kyool\media-uploader\
```

### Delete User Data (Optional)

```
%APPDATA%\Kyool\MediaUploader\
```

---

## FAQ

**Q: Do I need to build anything?**
A: No! Just extract and run START.bat

**Q: Why Node.js?**
A: The application is written in Node.js. It's a prerequisite like .NET or Java.

**Q: Can I run without START.bat?**
A: Yes:
```powershell
node src\subtools\service-server\server.js
node src\subtools\service-interface\serve.js
```

**Q: Does it need internet?**
A: Only for first-time `npm install`. After that, runs offline.

**Q: Can I move the folder after installing?**
A: Yes, just move the whole folder. Re-run START.bat from new location.

**Q: Services vs Manual mode?**
A:
- **START.bat (Manual):** Simple, always works, must run after reboot
- **Services:** Auto-starts with Windows, but complex setup that may fail

---

## What Changed from Previous Versions

**v1.0.0:**
- ✅ No more .exe bundling (was unreliable with ESM modules)
- ✅ Ships source code - more reliable, debuggable
- ✅ START.bat as primary method (dead simple)
- ✅ Full logging to logs/ folder
- ✅ Services optional instead of required
- ✅ Smaller package size

---

## Support

**Issues:** https://github.com/kyool-media/uploader-tool/issues

**Logs:** Always check `logs/` folder first!

---

## Quick Reference

| Action | Command |
|--------|---------|
| **Start** | Double-click `START.bat` |
| **Stop** | Double-click `STOP.bat` |
| **Access UI** | http://localhost:3010 |
| **View Logs** | Open `logs/` folder |
| **Install Services** | `npm install` then `node install-services.js` |

---

**Version:** 1.0.0
**Last Updated:** 2025-01-16
**License:** MIT
