#!/bin/bash

git add .
git commit -m "Update site: $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main
