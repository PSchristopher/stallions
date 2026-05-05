#!/bin/bash

# Migration runner for SPL Stallions
# Usage: ./migrate.sh [up|status]

set -e

node scripts/migrate.mjs "${1:-up}"
