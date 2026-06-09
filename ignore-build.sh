#!/bin/bash

echo "VERCEL_GIT_COMMIT_REF: $VERCEL_GIT_COMMIT_REF"

if [[ "$VERCEL_GIT_COMMIT_REF" == "deployment" ]] ; then
  # Proceed with the build
  echo "✅ - Build can proceed for branch: $VERCEL_GIT_COMMIT_REF"
  exit 1;
else
  # Don't build
  echo "🛑 - Build cancelled for branch: $VERCEL_GIT_COMMIT_REF"
  exit 0;
fi
