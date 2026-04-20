# EHH Project - Development & Deployment Guide

This guide explains how to manage updates and deployments for the EHH monorepo.

## Local Development

To run the entire stack (Frontend, Backend, and Mobile) concurrently:
```bash
npm run dev
```

To run individual parts:
- **Frontend**: `npm run dev:frontend`
- **Backend**: `npm run dev:backend`
- **Mobile**: `npm run dev:mobile`

## Workflow for Updates

1. **Modify Code**: Make your changes in the respective subdirectories (`frontend/`, `backend/`, or `mobile/`).
2. **Commit Changes**:
   ```bash
   git add .
   git commit -m "Your descriptive message"
   ```
3. **Push to GitHub**:
   ```bash
   git push
   ```
4. **Vercel Automatic Deploy**: Vercel is configured to watch your `main` branch. It will automatically build and deploy the frontend whenever you push.

## Dependency Management

- We use **npm workspaces**.
- A root `.npmrc` is configured with `legacy-peer-deps=true` to handle React 19 versioning and other peer dependency conflicts automatically.
- **To add a dependency to a specific area**:
  ```bash
  npm install <package-name> --workspace=frontend
  npm install <package-name> --workspace=backend
  ```

## Vercel Troubleshooting

If a build fails, check the following in the Vercel Dashboard:
- **Root Directory**: Should be the repository root (`.`).
- **Build Command**: Should be `npm run build:frontend` (or let it use the default from `vercel.json`).
- **Output Directory**: Should be `frontend/dist` (or let it use the default from `vercel.json`).
