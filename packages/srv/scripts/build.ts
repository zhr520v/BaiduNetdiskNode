import child_process from 'node:child_process'
import fs from 'node:fs'

try {
  fs.rmSync('dist', { recursive: true })
} catch {}

child_process.execSync('pnpm tsc --incremental false')

fs.mkdirSync('dist/runtime')

fs.copyFileSync('package.json', 'dist/package.json')
fs.copyFileSync('pnpm-lock.yaml', 'dist/pnpm-lock.yaml')
