import child_process from 'node:child_process'
import fs from 'node:fs'
import picocolors from 'picocolors'

const dirs: string[] = ['./']

dirs.push(...fs.readdirSync('packages').map(pkg => `packages/${pkg}`))

for (const dir of dirs) {
  console.log(`type checking ${picocolors.green(dir)}...`)
  child_process.execSync('pnpm tsc --noEmit', { cwd: dir, stdio: 'inherit' })
}
