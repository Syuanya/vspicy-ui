#!/usr/bin/env bash
set -euo pipefail

echo "== Frontend Environment Check =="

echo
echo "-- repo --"
pwd
if [ -d ".git" ]; then
  git branch --show-current || true
  git status --short || true
else
  echo "[WARN] .git not found"
fi

echo
echo "-- required files --"
for file in ".env.example" "package.json"; do
  if [ -f "$file" ]; then
    echo "[OK]   $file"
  else
    echo "[MISS] $file"
  fi
done

echo
echo "-- local env files --"
for file in ".env.local" ".env.development"; do
  if [ -f "$file" ]; then
    echo "[OK]   $file"
  else
    echo "[WARN] $file not found"
  fi
done

echo
echo "-- node / package manager --"
if command -v node >/dev/null 2>&1; then
  node -v
else
  echo "[MISS] node"
fi

if command -v pnpm >/dev/null 2>&1; then
  pnpm -v
elif command -v npm >/dev/null 2>&1; then
  npm -v
else
  echo "[MISS] pnpm/npm"
fi

echo
echo "-- VITE env preview from .env.local if exists --"
if [ -f ".env.local" ]; then
  grep -E '^VITE_' .env.local || true
else
  echo "[WARN] .env.local missing. Copy .env.example to .env.local."
fi

echo
echo "Done."
