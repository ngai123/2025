# Project Aura - Deployment Guide

Complete guide for deploying Project Aura to Firebase Hosting (Frontend) and Cloud Run (Backend) using GitLab CI/CD.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [GitLab CI/CD Configuration](#gitlab-cicd-configuration)
4. [First-Time Deployment](#first-time-deployment)
5. [Continuous Deployment Workflow](#continuous-deployment-workflow)
6. [Making Changes After Deployment](#making-changes-after-deployment)
7. [Rollback Procedures](#rollback-procedures)
8. [Monitoring & Debugging](#monitoring--debugging)
9. [Cost Optimization](#cost-optimization)

---

## Prerequisites

### Required Accounts & Tools
- [ ] Google Cloud Platform account with billing enabled
- [ ] Firebase project created
- [ ] GitLab account with repository set up
- [ ] Local installation of:
  - `gcloud` CLI - [Install for Windows](https://cloud.google.com/sdk/docs/install#windows)
  - `firebase-tools` CLI - `npm install -g firebase-tools`
  - `docker` (optional, for local testing)

### Install Google Cloud SDK (Windows)

**Download and Install:**
1. Download from: https://cloud.google.com/sdk/docs/install#windows
2. Run the installer (GoogleCloudSDKInstaller.exe)
3. Follow the installation wizard
4. When prompted, check "Run 'gcloud init'" to configure

**Or use PowerShell:**
```powershell
# Download installer
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")

# Run installer
& $env:Temp\GoogleCloudSDKInstaller.exe
```

**After installation, open a new PowerShell/CMD window and verify:**
```powershell
gcloud --version
```

### GCP Services to Enable

**For Windows PowerShell/CMD:**
```powershell
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com storage-api.googleapis.com
```

**For Linux/Mac:**
```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  storage-api.googleapis.com
```

---

## Initial Setup

### 1. Google Cloud Project Setup

#### Create a Service Account for Deployment

**For Windows PowerShell:**
```powershell
# Set your project ID (replace with your actual project ID)
$GCP_PROJECT_ID = "project-aura-475314"
gcloud config set project $GCP_PROJECT_ID

# Create service account
gcloud iam service-accounts create gitlab-deployer --description="GitLab CI/CD deployment service account" --display-name="GitLab Deployer"

# Grant necessary roles
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID --member="serviceAccount:gitlab-deployer@$GCP_PROJECT_ID.iam.gserviceaccount.com" --role="roles/run.admin"

gcloud projects add-iam-policy-binding $GCP_PROJECT_ID --member="serviceAccount:gitlab-deployer@$GCP_PROJECT_ID.iam.gserviceaccount.com" --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $GCP_PROJECT_ID --member="serviceAccount:gitlab-deployer@$GCP_PROJECT_ID.iam.gserviceaccount.com" --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $GCP_PROJECT_ID --member="serviceAccount:gitlab-deployer@$GCP_PROJECT_ID.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"

# Create and download service account key
gcloud iam service-accounts keys create gitlab-deployer-key.json --iam-account="gitlab-deployer@$GCP_PROJECT_ID.iam.gserviceaccount.com"

# Base64 encode the key for GitLab (Windows)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("gitlab-deployer-key.json")) | Out-File -FilePath gitlab-deployer-key-base64.txt -Encoding ASCII
```

**For Linux/Mac:**
```bash
# Set your project ID
export GCP_PROJECT_ID="project-aura-475314"
gcloud config set project $GCP_PROJECT_ID

# Create service account
gcloud iam service-accounts create gitlab-deployer \
  --description="GitLab CI/CD deployment service account" \
  --display-name="GitLab Deployer"

# Grant necessary roles
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:gitlab-deployer@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:gitlab-deployer@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:gitlab-deployer@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:gitlab-deployer@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Create and download service account key
gcloud iam service-accounts keys create gitlab-deployer-key.json \
  --iam-account=gitlab-deployer@${GCP_PROJECT_ID}.iam.gserviceaccount.com

# Base64 encode the key for GitLab
cat gitlab-deployer-key.json | base64 > gitlab-deployer-key-base64.txt
```

#### Store Secrets in Google Secret Manager

**For Windows PowerShell:**
```powershell
# Database credentials (replace with your actual values)
echo "YOUR_DB_HOST" | gcloud secrets create DATABASE_HOST --data-file=-
echo "5432" | gcloud secrets create DATABASE_PORT --data-file=-
echo "YOUR_DB_NAME" | gcloud secrets create DATABASE_NAME --data-file=-
echo "YOUR_DB_USER" | gcloud secrets create DATABASE_USER --data-file=-
echo "YOUR_DB_PASSWORD" | gcloud secrets create DATABASE_PASSWORD --data-file=-

# For staging (if different)
echo "YOUR_STAGING_DB_HOST" | gcloud secrets create DATABASE_HOST_STAGING --data-file=-
echo "YOUR_STAGING_DB_NAME" | gcloud secrets create DATABASE_NAME_STAGING --data-file=-

# Application secrets
echo "your-secret-key-here" | gcloud secrets create SECRET_KEY --data-file=-
echo "project-aura-475314-profile-images" | gcloud secrets create GCS_BUCKET_NAME --data-file=-

# Service account for app runtime
gcloud secrets create GCP_SERVICE_ACCOUNT --data-file=path\to\your\service-account.json
```

**For Linux/Mac:**
```bash
# Database credentials
echo -n "YOUR_DB_HOST" | gcloud secrets create DATABASE_HOST --data-file=-
echo -n "5432" | gcloud secrets create DATABASE_PORT --data-file=-
echo -n "YOUR_DB_NAME" | gcloud secrets create DATABASE_NAME --data-file=-
echo -n "YOUR_DB_USER" | gcloud secrets create DATABASE_USER --data-file=-
echo -n "YOUR_DB_PASSWORD" | gcloud secrets create DATABASE_PASSWORD --data-file=-

# For staging (if different)
echo -n "YOUR_STAGING_DB_HOST" | gcloud secrets create DATABASE_HOST_STAGING --data-file=-
echo -n "YOUR_STAGING_DB_NAME" | gcloud secrets create DATABASE_NAME_STAGING --data-file=-

# Application secrets
echo -n "your-secret-key-here" | gcloud secrets create SECRET_KEY --data-file=-
echo -n "project-aura-475314-profile-images" | gcloud secrets create GCS_BUCKET_NAME --data-file=-

# Service account for app runtime
gcloud secrets create GCP_SERVICE_ACCOUNT --data-file=path/to/your/service-account.json
```

### 2. Firebase Setup

#### Initialize Firebase
```bash
cd Project-Aura-Development/frontend

# Login to Firebase
firebase login

# Set your Firebase project ID in .firebaserc
# Replace "YOUR_FIREBASE_PROJECT_ID" with your actual project ID
```

#### Get Firebase CI Token
```bash
firebase login:ci
# Copy the token - you'll add this to GitLab variables
```

### 3. Update Configuration Files

#### A. Update `.firebaserc`
```json
{
  "projects": {
    "default": "your-actual-firebase-project-id"
  }
}
```

#### B. Update GitLab CI Variables in `.gitlab-ci.yml`
Replace these values in the `variables:` section:
```yaml
variables:
  GCP_PROJECT_ID: "your-gcp-project-id"
  GCP_REGION: "us-central1"  # or your preferred region
  CLOUD_RUN_SERVICE_NAME: "project-aura-backend"
```

---

## GitLab CI/CD Configuration

### Required GitLab CI/CD Variables

Navigate to your GitLab project: **Settings → CI/CD → Variables**

Add the following variables:

| Variable Name | Type | Value | Protected | Masked |
|---------------|------|-------|-----------|--------|
| `GCP_SERVICE_ACCOUNT_KEY` | Variable | Content of `gitlab-deployer-key-base64.txt` | ✅ | ✅ |
| `FIREBASE_TOKEN` | Variable | Token from `firebase login:ci` | ✅ | ✅ |
| `FIREBASE_PROJECT_ID` | Variable | Your Firebase project ID | ✅ | ❌ |

**Note**: "Protected" means these variables only work on protected branches (main, develop).

---

## First-Time Deployment

### Step 1: Verify Docker Runner
Ensure your GitLab runner has Docker support. If using GitLab.com, this is already configured.

### Step 2: Push to Develop Branch (Staging)
```bash
# Ensure you're on develop branch
git checkout develop

# Make sure all changes are committed
git add .
git commit -m "chore: setup deployment configuration"

# Push to GitLab
git push origin develop
```

This will trigger:
- ✅ Backend build (Docker image)
- ✅ Backend deployment to Cloud Run (staging)
- ✅ Frontend build (Vite)
- ✅ Frontend deployment to Firebase (staging channel)

### Step 3: Deploy to Production
```bash
# Merge to main branch
git checkout main
git merge develop
git push origin main
```

This will trigger:
- ✅ Production backend deployment
- ✅ Production frontend deployment

---

## Continuous Deployment Workflow

### Branch Strategy

```
main (production)
  ├── develop (staging)
  │     ├── feature/new-feature
  │     ├── fix/bug-fix
  │     └── Christian/feature/signup
  └── hotfix/critical-fix
```

### Deployment Flow

1. **Feature Development**
   ```bash
   git checkout develop
   git checkout -b feature/your-feature
   # Make changes
   git commit -m "feat: add new feature"
   git push origin feature/your-feature
   ```

2. **Create Merge Request**
   - Create MR from `feature/your-feature` → `develop`
   - CI runs tests (optional step in pipeline)
   - Code review
   - Merge to `develop`

3. **Automatic Staging Deployment**
   - Merging to `develop` automatically deploys to staging
   - Test on staging URLs:
     - Frontend: `https://your-project--staging.web.app`
     - Backend: `https://project-aura-backend-staging-{project-id}.a.run.app`

4. **Production Deployment**
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```
   - Automatically deploys to production
   - URLs:
     - Frontend: `https://your-project.web.app`
     - Backend: `https://project-aura-backend-{project-id}.a.run.app`

---

## Making Changes After Deployment

### Scenario 1: Code Changes (Frontend or Backend)

```bash
# 1. Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/your-change

# 2. Make your changes
# Edit files...

# 3. Commit and push
git add .
git commit -m "feat: your change description"
git push origin feature/your-change

# 4. Create merge request to develop
# After merge, changes auto-deploy to staging

# 5. Test on staging, then merge develop → main for production
git checkout main
git merge develop
git push origin main
```

**Result**: GitLab CI automatically rebuilds and deploys both frontend and backend.

### Scenario 2: Environment Variable Changes

```bash
# Update secrets in Google Secret Manager
echo -n "NEW_VALUE" | gcloud secrets versions add SECRET_KEY --data-file=-

# Cloud Run will use the new value on next deployment
# Or manually update the service:
gcloud run services update project-aura-backend \
  --region us-central1 \
  --update-secrets=SECRET_KEY=SECRET_KEY:latest
```

### Scenario 3: Database Schema Changes

```bash
# 1. Create Alembic migration locally
cd Project-Aura-Development/backend
alembic revision --autogenerate -m "add new column"

# 2. Review the migration file
# 3. Commit the migration
git add migrations/
git commit -m "db: add new column migration"
git push

# 4. SSH into Cloud Run instance or run migration job
gcloud run jobs create run-migrations \
  --image gcr.io/$GCP_PROJECT_ID/project-aura-backend:latest \
  --region us-central1 \
  --set-secrets="DATABASE_HOST=DATABASE_HOST:latest,..." \
  --command="alembic" \
  --args="upgrade,head"

gcloud run jobs execute run-migrations --region us-central1
```

### Scenario 4: Frontend Environment Variables

```bash
# Edit .gitlab-ci.yml to add new environment variable
# In frontend:build job, add:
- export VITE_NEW_VARIABLE="value"

# Commit and push
git add .gitlab-ci.yml
git commit -m "ci: add new frontend env variable"
git push
```

### Scenario 5: Dependency Updates

**Backend:**
```bash
cd Project-Aura-Development/backend
pip install new-package
pip freeze > requirements.txt
git add requirements.txt
git commit -m "deps: add new-package"
git push
```

**Frontend:**
```bash
cd Project-Aura-Development/frontend
npm install new-package
git add package.json package-lock.json
git commit -m "deps: add new-package"
git push
```

Both trigger automatic rebuild and deployment.

---

## Rollback Procedures

### Quick Rollback (Recommended)

#### Backend Rollback
```bash
# List recent revisions
gcloud run revisions list \
  --service project-aura-backend \
  --region us-central1

# Rollback to previous revision
gcloud run services update-traffic project-aura-backend \
  --region us-central1 \
  --to-revisions=REVISION_NAME=100
```

#### Frontend Rollback
```bash
cd Project-Aura-Development/frontend

# List previous releases
firebase hosting:releases:list

# Rollback to specific release
firebase hosting:rollback
```

### Git-Based Rollback

```bash
# Find the working commit
git log --oneline

# Revert to previous commit
git revert COMMIT_SHA

# Push revert commit
git push origin main
# This triggers new deployment with old code
```

---

## Monitoring & Debugging

### View Cloud Run Logs
```bash
# Real-time logs
gcloud run services logs tail project-aura-backend \
  --region us-central1

# Recent logs
gcloud run services logs read project-aura-backend \
  --region us-central1 \
  --limit 100
```

### View GitLab Pipeline Logs
1. Go to GitLab project → CI/CD → Pipelines
2. Click on pipeline number
3. Click on job name (e.g., `backend:deploy`)
4. View detailed logs

### Firebase Hosting Logs
```bash
firebase hosting:channel:list
```

### Common Issues & Solutions

#### Issue: "Docker daemon not available"
**Solution**: Ensure GitLab runner has Docker-in-Docker enabled or use shared runners.

#### Issue: "Permission denied" on Cloud Run deployment
**Solution**: Verify service account has `roles/run.admin` role.

#### Issue: "Secret not found"
**Solution**: Ensure secrets exist in Secret Manager and service account has `secretAccessor` role.

#### Issue: Frontend can't connect to backend
**Solution**:
1. Check CORS settings in backend `main.py`
2. Verify `VITE_API_BASE_URL` in frontend build
3. Check Cloud Run service URL is correct

---

## Cost Optimization

### Cloud Run
```bash
# Reduce minimum instances to 0 (current setting)
--min-instances 0

# Set reasonable max instances
--max-instances 10

# Adjust memory based on actual usage
--memory 512Mi  # Start here, monitor and adjust
```

### Firebase Hosting
- Free tier includes 10GB storage and 360MB/day transfer
- Monitor usage in Firebase Console

### Cloud SQL
```bash
# Use connection pooling to reduce instances
# Consider Cloud SQL Proxy for secure connections
# Use smaller machine types for development/staging
```

### Monitoring Costs
```bash
# Check current month costs
gcloud billing accounts list
gcloud billing projects describe $GCP_PROJECT_ID

# Set budget alerts in GCP Console
```

---

## Environment URLs

### Production
- **Frontend**: `https://your-firebase-project.web.app`
- **Backend**: `https://project-aura-backend-{project-id}.a.run.app`

### Staging
- **Frontend**: `https://your-firebase-project--staging.web.app`
- **Backend**: `https://project-aura-backend-staging-{project-id}.a.run.app`

---

## Quick Reference Commands

```bash
# Deploy backend manually (bypassing CI/CD)
cd Project-Aura-Development/backend
gcloud run deploy project-aura-backend --source .

# Deploy frontend manually
cd Project-Aura-Development/frontend
npm run build
firebase deploy --only hosting

# View service status
gcloud run services describe project-aura-backend --region us-central1

# Update Cloud Run environment variable
gcloud run services update project-aura-backend \
  --region us-central1 \
  --update-env-vars KEY=VALUE

# Check GitLab pipeline status
git push origin main && echo "Check: https://gitlab.com/your-org/your-repo/-/pipelines"
```

---

## Support & Documentation

- **Cloud Run**: https://cloud.google.com/run/docs
- **Firebase Hosting**: https://firebase.google.com/docs/hosting
- **GitLab CI/CD**: https://docs.gitlab.com/ee/ci/
- **Docker**: https://docs.docker.com/

---

## Post-Deployment Checklist

After first deployment:
- [ ] Verify frontend loads correctly
- [ ] Test backend API endpoints
- [ ] Check database connectivity
- [ ] Verify file uploads to GCS work
- [ ] Test WebSocket connections
- [ ] Check CORS is properly configured
- [ ] Verify environment variables are set
- [ ] Test authentication flow
- [ ] Monitor logs for errors
- [ ] Set up uptime monitoring (Google Cloud Monitoring or third-party)
- [ ] Configure custom domain (optional)
- [ ] Enable Cloud CDN for better performance (optional)

---

**Last Updated**: 2025-11-08
**Version**: 1.0.0
