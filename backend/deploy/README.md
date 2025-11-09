# AWS Lambda Deployment Guide - KYOOL Media Platform API

This directory contains all the scripts and configuration files needed to deploy the KYOOL Media Platform API to AWS Lambda using container images.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Deployment Scripts](#deployment-scripts)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Updating Deployment](#updating-deployment)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)
- [Cost Estimates](#cost-estimates)

---

## Overview

This deployment system uses:
- **AWS Lambda** with container images (10GB limit)
- **Amazon ECR** for Docker image storage
- **API Gateway** (HTTP API) for routing
- **AWS RDS** PostgreSQL for database
- **Amazon S3** for media storage
- **Mangum** adapter to bridge FastAPI and Lambda

### Why Container Images?

Your application has heavy dependencies (boto3, pandas, psycopg2, SQLAlchemy) that exceed Lambda's 250MB ZIP limit. Container images support up to 10GB, making deployment straightforward.

---

## Prerequisites

### 1. Local Development Environment

**Required:**
- **Python 3.11+** - Match Lambda runtime version
- **Docker Desktop** - For building container images
  - Windows: https://www.docker.com/products/docker-desktop
  - Ensure Docker is running before deployment
- **AWS Account** with appropriate permissions
- **AWS CLI** configured with credentials
  ```bash
  aws configure
  ```

**Optional but Recommended:**
- **Git** for version control
- **Python virtual environment** for deployment scripts

### 2. AWS Setup

Create the following AWS resources before deployment:

**RDS PostgreSQL Database:**
```bash
# Create via AWS Console or CLI
# Database identifier: kyool-api-production-db
# Engine: PostgreSQL 15+
# Instance class: db.t3.micro (for testing) or larger
# VPC: Note the VPC, subnet IDs, and security group
```

**S3 Bucket for Media:**
```bash
aws s3 mb s3://example-media-production --region us-east-1
```

**VPC Configuration (if using private RDS):**
- Note your VPC subnet IDs
- Note your security group IDs
- Update `deploy/config.py` with these values

### 3. Python Dependencies for Deployment

Create a virtual environment **outside** the project (as per CLAUDE.md):

```bash
# Windows
cd C:\
mkdir venv-kyool-deploy
cd venv-kyool-deploy
python -m venv .
Scripts\activate
cd C:\GitHub\kftv-kyool\kyool-media\backend\deploy
pip install -r requirements-deploy.txt
```

```bash
# Linux/Mac
cd ~
python3 -m venv venv-kyool-deploy
source venv-kyool-deploy/bin/activate
cd /path/to/kyool-media/backend/deploy
pip install -r requirements-deploy.txt
```

---

## Quick Start

### First Time Deployment

1. **Configure Environment**
   ```bash
   cd kyool-media/backend/deploy
   cp .env.production.template ../.env.production
   # Edit .env.production with your settings
   ```

2. **Update Configuration**
   ```bash
   # Edit deploy/config.py
   # Set AWS_REGION, VPC settings if needed
   ```

3. **Run Full Deployment**
   ```bash
   # Activate your deployment venv first
   python deploy_all.py
   ```

4. **Run Migrations**
   ```bash
   python run_migrations.py
   ```

Your API is now live! The script will display the API Gateway URL.

### Updating Existing Deployment

```bash
# Activate your deployment venv
python deploy_all.py --update
```

Or use the update script directly:
```bash
python 04_update_lambda.py
```

---

## Detailed Setup

### Step 1: Environment Configuration

1. **Copy the template:**
   ```bash
   cp deploy/.env.production.template backend/.env.production
   ```

2. **Edit `.env.production`:**
   ```bash
   # Required changes:
   ENVIRONMENT=production

   # Database (RDS)
   DATABASE_URI=postgresql://username:password@your-rds.region.rds.amazonaws.com:5432/kyool_media

   # Security (CRITICAL - generate new key)
   SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")

   # CORS (add your frontend URLs)
   CORS_ORIGINS=https://yourapp.com,https://www.yourapp.com

   # S3 Storage
   UPLOAD_S3_BUCKET_NAME=example-media-production
   UPLOAD_S3_REGION=us-east-1
   UPLOAD_VIDEO_BACKEND=s3
   UPLOAD_WEBCOMIC_BACKEND=s3
   ```

3. **Never commit `.env.production`** - it contains secrets!

### Step 2: Configure Deployment Settings

Edit `deploy/config.py`:

```python
# AWS Region
AWS_REGION = "us-east-1"  # Change to your region

# VPC Configuration (if using private RDS)
LAMBDA_VPC_SUBNET_IDS = ["subnet-xxxxx", "subnet-yyyyy"]
LAMBDA_VPC_SECURITY_GROUP_IDS = ["sg-xxxxx"]

# Lambda Settings (adjust if needed)
LAMBDA_MEMORY_SIZE = 2048  # MB
LAMBDA_TIMEOUT = 30  # seconds
```

### Step 3: Build and Deploy

You have two options:

**Option A: Master Script (Recommended)**
```bash
python deploy_all.py
```

**Option B: Step-by-Step (for learning/debugging)**
```bash
python 01_build_image.py      # Build Docker image
python 02_push_to_ecr.py       # Push to ECR
python 03_create_lambda.py     # Create Lambda function
python 05_setup_api_gateway.py # Setup API Gateway
python run_migrations.py       # Run database migrations
```

---

## Deployment Scripts

### Master Script

**`deploy_all.py`** - Orchestrates complete deployment
```bash
# Full deployment
python deploy_all.py

# Update existing deployment
python deploy_all.py --update

# Skip API Gateway setup
python deploy_all.py --skip-gateway

# Skip database migrations
python deploy_all.py --skip-migrations

# Auto-confirm (no prompts)
python deploy_all.py --yes
```

### Individual Scripts

**`01_build_image.py`** - Build Lambda Docker image
- Builds using `Dockerfile.lambda`
- Tags image as configured in `config.py`
- Verifies build success

**`02_push_to_ecr.py`** - Push image to AWS ECR
- Creates ECR repository if needed
- Authenticates Docker to ECR
- Tags and pushes image
- Uses boto3 for AWS operations

**`03_create_lambda.py`** - Create Lambda function
- Creates IAM execution role
- Attaches necessary policies
- Creates Lambda function from ECR image
- Configures memory, timeout, VPC
- Creates Function URL for testing

**`04_update_lambda.py`** - Update existing Lambda
- Rebuilds and pushes new image
- Updates Lambda function code
- Updates configuration
- Publishes new version

```bash
# Full update (rebuild + push + update)
python 04_update_lambda.py

# Skip rebuild (use existing ECR image)
python 04_update_lambda.py --skip-build
```

**`05_setup_api_gateway.py`** - Configure API Gateway
- Creates HTTP API Gateway
- Sets up Lambda integration
- Configures routes (catch-all proxy)
- Creates production stage
- Grants invoke permissions
- Configures CORS

**`run_migrations.py`** - Database migrations
- Runs Alembic migrations
- Supports custom database URL
- Shows migration history
- Confirms before execution

```bash
# Run migrations with .env.production
python run_migrations.py

# Use custom database URL
python run_migrations.py --database-url postgresql://...

# Show migration history
python run_migrations.py --show-history

# Show current revision
python run_migrations.py --current
```

### Configuration Files

**`config.py`** - Centralized deployment configuration
- AWS region and account settings
- Resource naming (production/staging)
- Lambda configuration
- API Gateway settings
- VPC configuration
- Path configuration

**`.env.production.template`** - Production environment template
- Copy to `backend/.env.production`
- Configure all production settings
- Never commit `.env.production`

**`iam-lambda-policy.json`** - IAM policy template
- S3 access for media storage
- CloudWatch Logs for monitoring
- Secrets Manager for credentials
- RDS access (if needed)
- VPC network interface management

**`requirements-deploy.txt`** - Deployment script dependencies
- boto3 for AWS SDK
- python-dotenv for environment management
- docker for container operations

---

## Configuration

### Environment Variables

The Lambda function uses environment variables from three sources (in priority order):

1. **Lambda Environment Variables** (set in `config.py`)
   - Basic configuration
   - Non-sensitive values

2. **`.env.production` file** (copied into Docker image)
   - Application configuration
   - Should not contain highly sensitive data

3. **AWS Secrets Manager** (recommended for production)
   - Database credentials
   - API keys
   - Encryption keys

### AWS Secrets Manager (Recommended)

For better security, store sensitive credentials in AWS Secrets Manager:

```bash
# Create secret for database
aws secretsmanager create-secret \
  --name kyool-media/production/database \
  --description "Database credentials" \
  --secret-string '{"username":"user","password":"pass","host":"rds-host","database":"kyool_media"}'

# Create secret for JWT
aws secretsmanager create-secret \
  --name kyool-media/production/jwt-secret \
  --secret-string "your-secure-secret-key"
```

Then update `app/core/config.py` to fetch from Secrets Manager.

### VPC Configuration

If your RDS is in a private VPC, configure Lambda VPC access in `config.py`:

```python
# VPC Subnets (use private subnets with NAT gateway)
LAMBDA_VPC_SUBNET_IDS = ["subnet-xxxxx", "subnet-yyyyy"]

# Security Group (allow outbound to RDS, internet via NAT)
LAMBDA_VPC_SECURITY_GROUP_IDS = ["sg-xxxxx"]
```

**Important:** VPC Lambda functions need:
- NAT Gateway for internet access (ECR, S3, etc.)
- Security group allowing outbound traffic
- RDS security group allowing inbound from Lambda SG

---

## Database Setup

### 1. Create RDS Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier kyool-api-production-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.3 \
  --master-username kyool_admin \
  --master-user-password YourSecurePassword \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name your-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --tags Key=Project,Value=kyool-media Key=Environment,Value=production
```

### 2. Configure Connection

Update `.env.production`:
```bash
DATABASE_URI=postgresql://kyool_admin:YourSecurePassword@kyool-api-production-db.xxxx.us-east-1.rds.amazonaws.com:5432/kyool_media
```

### 3. Run Migrations

```bash
python run_migrations.py
```

### 4. Create Admin User

Create a script or use the Lambda console to run:
```python
from app.crud.user import create_user
from app.schemas.user import UserCreate
from app.db.database import get_db

user = create_user(
    db=next(get_db()),
    user=UserCreate(
        email="admin@yourcompany.com",
        password="SecurePassword123!",
        is_superuser=True
    )
)
```

### RDS Proxy (Optional - Recommended for Production)

For better connection management:

```bash
aws rds create-db-proxy \
  --db-proxy-name kyool-api-production-proxy \
  --engine-family POSTGRESQL \
  --auth {"AuthScheme":"SECRETS","SecretArn":"arn:aws:secretsmanager:..."} \
  --role-arn arn:aws:iam::account-id:role/RDSProxyRole \
  --vpc-subnet-ids subnet-xxxxx subnet-yyyyy
```

Then use proxy endpoint in DATABASE_URI.

---

## Updating Deployment

### Code Changes

When you make code changes:

```bash
# Quick update
python deploy_all.py --update

# Or step by step
python 01_build_image.py
python 02_push_to_ecr.py
python 04_update_lambda.py
```

### Configuration Changes

**Lambda settings** (memory, timeout, environment variables):
```bash
python 04_update_lambda.py
```

**API Gateway changes:**
```bash
python 05_setup_api_gateway.py
```

### Database Schema Changes

```bash
# Create migration (local development)
cd backend
alembic revision --autogenerate -m "Add new table"

# Deploy code update
python deploy_all.py --update

# Run migrations
python run_migrations.py
```

---

## Troubleshooting

### Docker Issues

**Problem:** `Docker is not running`
```bash
# Windows: Start Docker Desktop
# Linux: sudo systemctl start docker
# Mac: Open Docker Desktop application
```

**Problem:** `Permission denied accessing Docker`
```bash
# Linux: Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in
```

### AWS Credential Issues

**Problem:** `AWS credentials not found`
```bash
# Configure AWS CLI
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_DEFAULT_REGION=us-east-1
```

**Problem:** `Access denied` errors
- Ensure your AWS user/role has necessary permissions
- Check IAM policies include Lambda, ECR, API Gateway, IAM

### Lambda Issues

**Problem:** Lambda function times out
- Increase timeout in `config.py` (max 30s for API Gateway)
- Check database connection is fast
- Optimize slow queries
- Consider provisioned concurrency for cold starts

**Problem:** Lambda can't connect to RDS
- Verify VPC configuration in `config.py`
- Check security groups allow traffic
- Ensure RDS is accessible from Lambda subnets
- Verify DATABASE_URI is correct

**Problem:** Lambda out of memory
- Increase `LAMBDA_MEMORY_SIZE` in `config.py`
- Monitor CloudWatch metrics
- Optimize memory usage in code

### API Gateway Issues

**Problem:** `404 Not Found` on API endpoints
- Check API Gateway routes are configured correctly
- Verify Lambda integration is set up
- Check Lambda has permission to be invoked by API Gateway
- Test Function URL first to isolate issue

**Problem:** CORS errors
- Update `CORS_ALLOWED_ORIGINS` in `config.py`
- Redeploy API Gateway: `python 05_setup_api_gateway.py`
- Check browser console for actual CORS error

### Database Issues

**Problem:** Migrations fail
- Verify DATABASE_URI is correct
- Check RDS security group allows Lambda access
- Test connection with psql or database client
- Check migration files in `alembic/versions/`

**Problem:** Connection pool exhausted
- Add RDS Proxy for connection pooling
- Reduce pool size in SQLAlchemy settings
- Set Lambda reserved concurrency to limit concurrent executions

### Build Issues

**Problem:** Build fails with dependency errors
- Check `requirements.txt` has all dependencies
- Verify Python version matches (3.11)
- Try building locally first
- Check Dockerfile.lambda syntax

**Problem:** Image too large
- Current limit: 10GB (should be fine)
- If exceeded, remove unused dependencies
- Optimize layer caching in Dockerfile

---

## Architecture

### Request Flow

```
User Request
    ↓
API Gateway (HTTPS)
    ↓
AWS Lambda (Container)
    ↓
Mangum (ASGI Adapter)
    ↓
FastAPI Application
    ↓
   RDS PostgreSQL / S3 / Mux
```

### Components

- **API Gateway:** HTTPS endpoint, routing, CORS, throttling
- **Lambda:** Runs FastAPI in container, scales automatically
- **Mangum:** Translates API Gateway events to ASGI
- **FastAPI:** Your application logic and API endpoints
- **RDS:** PostgreSQL database for application data
- **S3:** Media file storage (videos, images)
- **Mux:** Video processing and streaming (optional)
- **CloudWatch:** Logs and monitoring

### Cold Starts

Lambda functions have cold starts (first request after idle):
- **Typical:** 1-3 seconds for container images
- **Mitigation:**
  - Provisioned concurrency (costs more)
  - Optimize imports in lambda_handler.py
  - Keep functions warm with scheduled pings

### Scaling

- **Automatic:** Lambda scales to match request volume
- **Concurrent Executions:** Default 1,000 per region
- **Database:** Monitor RDS connections, use RDS Proxy
- **Reserved Concurrency:** Limit Lambda concurrency to protect database

---

## Cost Estimates

### Monthly Costs (Low Traffic - 100,000 requests/month)

| Service | Configuration | Estimated Cost |
|---------|--------------|----------------|
| **Lambda** | 2GB memory, 1s avg duration | $5 - $10 |
| **API Gateway** | HTTP API | $0.10 |
| **RDS** | db.t3.micro PostgreSQL | $15 - $20 |
| **ECR** | 5GB storage | $0.50 |
| **S3** | 50GB storage + transfers | $2 - $5 |
| **CloudWatch** | Logs | $1 - $2 |
| **Total** | | **$24 - $38/month** |

### Scaling Costs

- Lambda: Scales linearly with requests
- RDS: Upgrade instance for more connections
- Add RDS Proxy: ~$15/month for connection pooling
- Provisioned Concurrency: ~$35/month per instance

### Cost Optimization

1. **Use RDS Aurora Serverless** for variable workloads
2. **S3 Intelligent Tiering** for automatic cost optimization
3. **CloudWatch Logs retention** - set to 7-30 days
4. **Reserved Instances** for RDS if predictable load
5. **Monitor with AWS Cost Explorer**

---

## Adding Staging Environment

To add a staging environment:

1. **Update `config.py`:**
   ```python
   ENVIRONMENT = os.getenv("DEPLOY_ENV", "production")
   # When DEPLOY_ENV=staging, all resources get -staging suffix
   ```

2. **Deploy staging:**
   ```bash
   export DEPLOY_ENV=staging
   python deploy_all.py
   ```

3. **Resources created:**
   - ECR: `kyool-api-staging`
   - Lambda: `kyool-api-staging`
   - API Gateway: `kyool-api-staging-gateway`
   - RDS: `kyool-api-staging-db` (create separately)

---

## Security Checklist

- [ ] Change `SECRET_KEY` to secure random value
- [ ] Use AWS Secrets Manager for sensitive credentials
- [ ] Enable RDS encryption at rest
- [ ] Enable S3 bucket encryption
- [ ] Use VPC for Lambda and RDS
- [ ] Configure security groups (least privilege)
- [ ] Set up WAF for API Gateway (production)
- [ ] Enable CloudWatch Logs encryption
- [ ] Rotate credentials regularly
- [ ] Use IAM roles instead of access keys
- [ ] Review IAM policies (least privilege)
- [ ] Enable MFA for AWS accounts
- [ ] Set up CloudTrail for audit logging
- [ ] Configure backup retention for RDS
- [ ] Test disaster recovery procedures

---

## Monitoring & Logging

### CloudWatch Logs

Lambda automatically logs to CloudWatch:
```
Log Group: /aws/lambda/kyool-api-production
```

View logs:
```bash
aws logs tail /aws/lambda/kyool-api-production --follow
```

### CloudWatch Metrics

Monitor key metrics:
- Lambda invocations, errors, duration
- API Gateway 4xx, 5xx errors, latency
- RDS CPU, connections, disk usage

Create alarms:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name kyool-api-high-error-rate \
  --alarm-description "Alert on high Lambda error rate" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

### X-Ray Tracing (Optional)

Enable for detailed request tracing:
```python
# In config.py
LAMBDA_TRACING_MODE = "Active"
```

---

## Support & Resources

### Documentation

- **AWS Lambda Docs:** https://docs.aws.amazon.com/lambda/
- **API Gateway Docs:** https://docs.aws.amazon.com/apigateway/
- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **Mangum Docs:** https://mangum.io/
- **Boto3 Docs:** https://boto3.amazonaws.com/v1/documentation/api/latest/index.html

### Getting Help

- Check CloudWatch Logs for errors
- Review this README's troubleshooting section
- Test components individually (Function URL, then API Gateway)
- Check AWS Service Health Dashboard
- Review IAM permissions

---

## License

Copyright © 2025 KYOOL Media Platform
