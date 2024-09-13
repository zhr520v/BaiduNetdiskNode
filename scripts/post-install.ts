import fsExt from 'fs-extra'

const pnpmlock = fsExt.readFileSync('pnpm-lock.yaml', { encoding: 'utf-8' })

fsExt.writeFileSync('pnpm-lock.yaml', pnpmlock.replace(/, tarball: .*}/g, '}'))
