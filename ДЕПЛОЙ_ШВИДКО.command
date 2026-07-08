#!/bin/bash
# Швидкий deploy — тільки railway up, без variables (не зависає)
cd "$(dirname "$0")"
export SET_RAILWAY_VARS=0
bash .railway-deploy-run.sh
read -p "Enter..."
