#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const SOURCE_DIR = path.join(ROOT_DIR, 'content');
const OUTPUT_DIR = path.join(ROOT_DIR, '.codex-build', 'content');

function removeDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(sourceDir, outputDir) {
  fs.mkdirSync(path.dirname(outputDir), { recursive: true });
  fs.cpSync(sourceDir, outputDir, { recursive: true });
}

function escapeEncryptShortcodesInCodeFences(markdown) {
  const lines = markdown.split('\n');
  const transformed = [];

  let inFence = false;
  let fenceMarker = '';
  let fenceLength = 0;

  for (const line of lines) {
    const fenceMatch = line.match(/^( {0,3})(`{3,}|~{3,})(.*)$/);

    if (!inFence && fenceMatch) {
      inFence = true;
      fenceMarker = fenceMatch[2][0];
      fenceLength = fenceMatch[2].length;
      transformed.push(line);
      continue;
    }

    if (inFence && fenceMatch) {
      const currentMarker = fenceMatch[2][0];
      const currentLength = fenceMatch[2].length;
      const trailing = fenceMatch[3].trim();

      if (currentMarker === fenceMarker && currentLength >= fenceLength && trailing === '') {
        inFence = false;
        fenceMarker = '';
        fenceLength = 0;
        transformed.push(line);
        continue;
      }
    }

    if (inFence) {
      transformed.push(
        line.replace(/\{\{([<%])\s*(\/?)\s*encrypt(\b[^}]*)\s*([>%])\}\}/g, (match, open, slash, rest, close) => {
          const expectedClose = open === '<' ? '>' : '%';
          if (close !== expectedClose) return match;

          const suffix = rest.trim();
          const body = `${slash ? '/' : ''}encrypt${suffix ? ` ${suffix}` : ''}`;
          return `{{${open}/* ${body} */${close}}}`;
        })
      );
      continue;
    }

    transformed.push(line);
  }

  return transformed.join('\n');
}

function walkMarkdownFiles(dir, callback) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkMarkdownFiles(fullPath, callback);
      continue;
    }

    if (entry.name.endsWith('.md')) {
      callback(fullPath);
    }
  }
}

removeDir(OUTPUT_DIR);
copyDir(SOURCE_DIR, OUTPUT_DIR);

let updatedFiles = 0;

walkMarkdownFiles(OUTPUT_DIR, filePath => {
  const original = fs.readFileSync(filePath, 'utf8');
  const prepared = escapeEncryptShortcodesInCodeFences(original);

  if (prepared !== original) {
    fs.writeFileSync(filePath, prepared, 'utf8');
    updatedFiles += 1;
  }
});

console.log(`Prepared content directory: ${path.relative(ROOT_DIR, OUTPUT_DIR)} (${updatedFiles} file(s) adjusted)`);
