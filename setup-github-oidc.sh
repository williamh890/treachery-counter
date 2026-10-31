#!/usr/bin/env bash
# One-time setup: let GitHub Actions deploy to Firebase without a stored key.
# Run it once from your machine with gcloud signed in as a project owner.
set -euo pipefail

PROJECT_ID="treachery-counter"
GITHUB_REPO="williamh890/treachery-counter"
SA_NAME="github-deployer"
POOL="github"
PROVIDER="github-provider"

SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"

gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project "$PROJECT_ID"

# 1. Service account the workflow will act as
gcloud iam service-accounts create "$SA_NAME" \
  --project "$PROJECT_ID" \
  --display-name "GitHub Actions deployer"

for ROLE in \
  roles/firebasehosting.admin \
  roles/firebaserules.admin \
  roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member "serviceAccount:${SA_EMAIL}" \
    --role "$ROLE" \
    --condition=None
done

# 2. Workload identity pool + GitHub OIDC provider, limited to your repo
gcloud iam workload-identity-pools create "$POOL" \
  --project "$PROJECT_ID" \
  --location global \
  --display-name "GitHub"

gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
  --project "$PROJECT_ID" \
  --location global \
  --workload-identity-pool "$POOL" \
  --display-name "GitHub Actions" \
  --issuer-uri "https://token.actions.githubusercontent.com" \
  --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition "assertion.repository == '${GITHUB_REPO}'"

# 3. Allow that repo (and only that repo) to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --project "$PROJECT_ID" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${GITHUB_REPO}"

echo
echo "Add these as GitHub repository variables (Settings > Secrets and variables > Actions > Variables):"
echo "  GCP_WORKLOAD_IDENTITY_PROVIDER = projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}"
echo "  GCP_SERVICE_ACCOUNT            = ${SA_EMAIL}"
