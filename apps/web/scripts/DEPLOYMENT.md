# Web App Deployment Scripts

This directory contains deployment scripts for the web application to AWS S3 and CloudFront.

## Prerequisites

1. **AWS CLI** installed and configured
   ```bash
   # Install AWS CLI
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   
   # Configure AWS credentials
   aws configure
   ```

2. **Node.js** (version 16 or higher)

3. **AWS Permissions** - Your AWS user/role needs:
   - S3: `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`
   - CloudFront: `cloudfront:CreateInvalidation`, `cloudfront:GetDistribution`

## Configuration

Before running the scripts, you need to configure the following variables:

### 1. S3 Configuration (in `scripts/deploy-s3.js`)
```javascript
const S3_BUCKET = 'FIXME-your-s3-bucket-name';
const S3_REGION = 'FIXME-your-s3-region';
```

### 2. CloudFront Configuration (in `scripts/invalidate-cloudfront.js`)
```javascript
const CLOUDFRONT_DISTRIBUTION_ID = 'FIXME-your-distribution-id';
```

### 3. Environment Variables (Optional)
You can also set these as environment variables:
```bash
export S3_BUCKET="your-bucket-name"
export S3_REGION="us-east-1"
export CLOUDFRONT_DISTRIBUTION_ID="E1234567890123"
export AWS_PROFILE="default"
export PRODUCTION_ENV=".env.production"
```

## Available Scripts

### Individual Scripts

1. **Build for Production**
   ```bash
   npm run build:production
   ```
   - Cleans previous build
   - Installs dependencies
   - Creates production build in `dist/` directory

2. **Deploy to S3**
   ```bash
   npm run deploy:s3
   ```
   - Uploads build files to S3 bucket
   - Sets appropriate cache headers
   - Deletes old files

3. **Invalidate CloudFront**
   ```bash
   npm run deploy:cloudfront
   ```
   - Creates CloudFront invalidation
   - Waits for completion

### Master Deployment Script

**Full Deployment** (Recommended)
```bash
npm run deploy
```
This runs all three scripts in sequence:
1. Build for production
2. Deploy to S3
3. Invalidate CloudFront cache

## Cross-Platform Compatibility

All scripts are designed to work on both Windows and Linux:
- Uses Node.js `spawn` with platform detection
- Handles Windows `cmd` vs Unix shells automatically
- No bash-specific features used

## Troubleshooting

### Common Issues

1. **AWS CLI not found**
   - Ensure AWS CLI is installed and in your PATH
   - Try `aws --version` to verify

2. **Access denied to S3 bucket**
   - Check bucket name is correct
   - Verify AWS credentials have proper permissions
   - Ensure bucket exists and is in the correct region

3. **CloudFront access denied**
   - Verify distribution ID is correct
   - Check AWS permissions for CloudFront operations

4. **Build fails**
   - Ensure all dependencies are installed: `npm install`
   - Check for TypeScript/build errors: `npm run build`

### Debug Mode

For verbose output, you can run scripts with debug logging:
```bash
DEBUG=* npm run deploy
```

## File Structure

```
apps/web/
├── scripts/
│   ├── build-production.js    # Production build script
│   ├── deploy-s3.js          # S3 deployment script
│   ├── invalidate-cloudfront.js # CloudFront invalidation
│   └── deploy.js             # Master deployment script
├── DEPLOYMENT.md             # This file
└── package.json              # Updated with new scripts
```

## Next Steps After Configuration

1. Replace all `FIXME` values in the scripts
2. Test individual scripts first:
   ```bash
   npm run build:production
   npm run deploy:s3
   npm run deploy:cloudfront
   ```
3. Run full deployment:
   ```bash
   npm run deploy
   ```

## Security Notes

- Never commit AWS credentials to version control
- Use environment variables or AWS profiles for credentials
- Consider using IAM roles instead of user credentials in production
- The scripts will output URLs and IDs but no sensitive information