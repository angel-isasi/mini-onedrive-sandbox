# Sandbox decisions

Practice repo for learning. Not the official project.

## Stack

- Monorepo: frontend/, backend/, infra/, docs/
- Frontend: React + Vite (JavaScript), TanStack Router, TanStack Query, Tailwind
- Backend: Node.js 24 Lambdas (JS, ES modules), one Lambda per endpoint
- API: API Gateway HTTP API
- Region: us-east-1

## Data

- S3: files stored at users/{userId}/{fileId}, private bucket, presigned URLs only
- DynamoDB: table sandbox-files, key userId + itemId, GSI userId#parentId
- Files and folders in the same table (type field)
- Soft delete with deletedAt (trash)

## Other

- Auth: Cognito + JWT authorizer (module 8)
- Limit: 100 MB per file
- Console first, then CDK in TypeScript
- AWS resources prefixed with sandbox-
- One branch per module + PR to main, conventional commits
