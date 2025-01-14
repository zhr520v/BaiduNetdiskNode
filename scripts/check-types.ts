import child_process from 'node:child_process'
import fs from 'node:fs'

const dirs: string[] = ['./']

dirs.push(...fs.readdirSync('packages').map(pkg => `packages/${pkg}`))

for (const dir of dirs) {
  child_process.execSync('pnpm tsc --noEmit', { cwd: dir })
}
