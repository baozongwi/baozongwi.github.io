#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const child = spawn(process.execPath, [
  resolve(import.meta.dirname, '../themes/flavor/scripts/encrypt.mjs'),
  ...process.argv.slice(2),
], { stdio: 'inherit' });

child.on('exit', (code) => process.exit(code ?? 1));
