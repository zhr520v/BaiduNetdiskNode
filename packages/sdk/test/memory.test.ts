import { describe, expect, it } from '@root/utils/test-suite'
import fs from 'node:fs'
import path from 'node:path'
import { Netdisk } from '../index'

const CONFIG_PATH = 'tmp/test.config.json'
const shouldRunLarge = fs.existsSync(CONFIG_PATH) && process.env.SDK_LARGE_FILE_TEST === '1'

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function ensureLargeFile(filePath: string, size: number) {
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath)

    if (stats.size === size) {
      return
    }

    fs.rmSync(filePath)
  }

  const fd = fs.openSync(filePath, 'w')

  if (size > 0) {
    fs.writeSync(fd, Buffer.from([0]), 0, 1, size - 1)
  }

  fs.closeSync(fd)
}

async function trackRssDuring<T>(fn: () => Promise<T>) {
  const samples: number[] = []

  const collect = () => {
    samples.push(process.memoryUsage().rss)
  }

  collect()
  const timer = setInterval(collect, 250)

  try {
    const result = await fn()
    collect()

    return {
      result,
      maxRss: Math.max(...samples),
    }
  } finally {
    clearInterval(timer)
  }
}

if (!shouldRunLarge) {
  describe('MEMORY LIMIT (>1GB transfers)', () => {
    it('skips large file checks without SDK_LARGE_FILE_TEST=1', () => {
      expect(true).toBeTruthy()
    })
  })
} else {
  const config: {
    app_name: string
    access_token: string
  } = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))

  const netdisk = new Netdisk({
    app_name: config.app_name,
    access_token: config.access_token,
  })

  const PATH_PREFIX = `/apps/${config.app_name}/BaiduNetdiskSdkTest`
  const LOCAL_DIR = path.resolve('tmp/files')
  const LARGE_SIZE = 1024 * 1024 * 1024 + 128 * 1024 * 1024 // 1.125GB
  const LOCAL_FILE = path.resolve(LOCAL_DIR, 'large-memory.bin')
  const REMOTE_FILE = `${PATH_PREFIX}/large-memory.bin`
  const DOWNLOAD_FILE = path.resolve(LOCAL_DIR, 'large-memory.bin.download')
  const RSS_LIMIT = 512 * 1024 * 1024

  describe('MEMORY LIMIT (>1GB transfers)', () => {
    it('uploads a >1GB file without exceeding 512MB RSS', async () => {
      ensureDir(LOCAL_DIR)
      ensureLargeFile(LOCAL_FILE, LARGE_SIZE)

      await netdisk
        .deleteFolderOrFile({
          source: REMOTE_FILE,
        })
        .catch(() => {})

      const { maxRss } = await trackRssDuring(() =>
        netdisk.upload({
          local: LOCAL_FILE,
          remote: REMOTE_FILE,
          noVerify: true,
          threads: 4,
        })
      )

      expect(maxRss <= RSS_LIMIT).toBeTruthy()
    })

    it('downloads a >1GB file without exceeding 512MB RSS', async () => {
      if (fs.existsSync(DOWNLOAD_FILE)) {
        fs.rmSync(DOWNLOAD_FILE)
      }

      const { maxRss } = await trackRssDuring(() =>
        netdisk.download({
          withPath: REMOTE_FILE,
          local: DOWNLOAD_FILE,
          noVerify: true,
          threads: 4,
        })
      )

      expect(maxRss <= RSS_LIMIT).toBeTruthy()
    })
  })
}
