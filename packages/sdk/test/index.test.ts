import { describe, expect, it, runTest } from '@root/utils/test-suite'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import pico from 'picocolors'
import { Netdisk } from '../index'

if (!fs.existsSync('tmp/test.config.json')) {
  console.log(pico.red('config file not found.'))
  console.log(pico.yellow('should prepare tmp/test.config.json format below:'))
  console.log(pico.yellow('{\n  "app_name": "string",\n  "access_token": "string"\n}\n'))

  process.exit(0)
}

/**
 * test.config.json
 * {
 *   "app_name": "string",
 *   "access_token": "string"
 * }
 */
const config: {
  app_name: string
  access_token: string
} = JSON.parse(fs.readFileSync('tmp/test.config.json', 'utf8'))

const netdisk = new Netdisk({
  app_name: config.app_name,
  access_token: config.access_token,
})

const __PATH_PREFIX__ = `/apps/${config.app_name}/BaiduNetdiskSdkTest`

const __FILES_LISTS__ = [
  {
    name: '0.bin',
    size: 0,
  },
  {
    name: '16.bin',
    size: 16,
  },
  {
    name: '32.bin',
    size: 32,
  },
  {
    name: '64.bin',
    size: 64,
  },
]

function getFileMd5(inFilePath: string) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5')
    const input = fs.createReadStream(inFilePath)

    input.on('data', chunk => {
      hash.update(chunk)
    })

    input.on('end', () => {
      const md5Value = hash.digest('hex')
      resolve(md5Value)
    })

    input.on('error', err => {
      reject(new Error(`Error reading file: ${err.message}`))
    })
  })
}

function genRandomBuffer(inSize: number) {
  const buf = Buffer.alloc(inSize)

  for (let i = 0; i < inSize; i++) {
    buf[i] = Math.floor(Math.random() * 256)
  }

  return buf
}

describe('PREPARE', () => {
  it('CreatLocalFile', async () => {
    try {
      fs.rmSync('tmp/files', { recursive: true })
    } catch {}

    fs.mkdirSync('tmp/files')

    for (const item of __FILES_LISTS__) {
      fs.writeFileSync(`tmp/files/${item.name}`, genRandomBuffer(item.size * 1024 * 1024))
    }

    fs.writeFileSync('tmp/files/64.task.bin', genRandomBuffer(64 * 1024 * 1024))
  })

  it('DeleteFolder', async () => {
    const data = await netdisk.deleteFolderOrFile({
      source: __PATH_PREFIX__,
    })

    expect(data).toHaveProperties('info')
  })

  it('CreateFolder', async () => {
    const data = await netdisk.createFolder({
      path: __PATH_PREFIX__,
      opts: {
        verifyExists: true,
      },
    })

    expect(data).toHaveProperties('category')
  })
})

describe('FUNCTION_TEST', () => {
  it('GetUserInfo', async () => {
    const data = await netdisk.getUserInfo()

    expect(data).toHaveProperties(
      'avatar_url',
      'baidu_name',
      'expire',
      'free',
      'netdisk_name',
      'total',
      'uk',
      'used',
      'vip_type'
    )

    expect(data.netdisk_name).toBeTruthy()
  })

  it('GetFileList', async () => {
    const { list } = await netdisk.getFileList({
      dir: '/',
    })

    expect(list.length).toBeGreaterThan(0)

    for (const item of list) {
      expect(item).toHaveProperties(
        'category',
        'fs_id',
        'isdir',
        'local_ctime',
        'local_mtime',
        'path',
        'server_ctime',
        'server_filename',
        'server_mtime',
        'size'
      )
    }
  })

  it('GetFileListRecursion', async () => {
    const { list } = await netdisk.getFileListRecursion({
      path: '/apps',
      opts: {
        recursion: 1,
        infinite: true,
      },
    })

    expect(list.length).toBeGreaterThan(0)

    for (const item of list) {
      expect(item).toHaveProperties(
        'category',
        'fs_id',
        'isdir',
        'local_ctime',
        'local_mtime',
        'md5',
        'server_ctime',
        'server_mtime',
        'size'
      )
    }
  })
})

describe('UPLOAD', () => {
  it('UploadWithoutEncryt', async () => {
    const list = await Promise.all(
      __FILES_LISTS__.map(item =>
        netdisk.upload({
          local: path.resolve(`tmp/files/${item.name}`),
          remote: `${__PATH_PREFIX__}/${item.name}`,
          threads: 2,
        })
      )
    )

    for (const item of list) {
      expect(item).toHaveProperties(
        'category',
        'ctime',
        'fs_id',
        'isdir',
        'md5',
        'mtime',
        'name',
        'path',
        'size'
      )
    }
  })

  it('UploadWithEncrypt', async () => {
    const list = await Promise.all(
      __FILES_LISTS__.map(item =>
        netdisk.upload({
          local: path.resolve(`tmp/files/${item.name}`),
          remote: `${__PATH_PREFIX__}/${item.name}.e`,
          encrypt: 'keenghost',
          threads: 2,
        })
      )
    )

    for (const item of list) {
      expect(item).toHaveProperties(
        'category',
        'ctime',
        'fs_id',
        'isdir',
        'md5',
        'mtime',
        'name',
        'path',
        'size'
      )
    }
  })
})

describe('UPLOAD_TASK', () => {
  it('UploadTaskWithoutEncrypt', () => {
    return new Promise<void>((resolve, reject) => {
      const task = netdisk.uploadTask({
        local: path.resolve('tmp/files/64.task.bin'),
        remote: `${__PATH_PREFIX__}/64.task.bin`,
        threads: 2,
        onDone: inData => {
          expect(inData).toHaveProperties(
            'category',
            'ctime',
            'fs_id',
            'isdir',
            'md5',
            'mtime',
            'name',
            'path',
            'size'
          )

          resolve()
        },
        onError: inError => {
          reject(inError)
        },
      })

      task.run()

      setTimeout(() => {
        task.stop()

        setTimeout(() => {
          task.run()

          setTimeout(() => {
            task.stop()

            setTimeout(() => {
              task.run()
            }, 1000)
          }, 10000)
        }, 1000)
      }, 1000)
    })
  })

  it('UploadTaskWithEncrypt', () => {
    return new Promise<void>((resolve, reject) => {
      const task = netdisk.uploadTask({
        local: path.resolve('tmp/files/64.task.bin'),
        remote: `${__PATH_PREFIX__}/64.task.bin.e`,
        encrypt: 'keenghost',
        threads: 2,
        onDone: inData => {
          expect(inData).toHaveProperties(
            'category',
            'ctime',
            'fs_id',
            'isdir',
            'md5',
            'mtime',
            'name',
            'path',
            'size'
          )

          resolve()
        },
        onError: inError => {
          reject(inError)
        },
      })

      task.run()

      setTimeout(() => {
        task.stop()

        setTimeout(() => {
          task.run()

          setTimeout(() => {
            task.stop()

            setTimeout(() => {
              task.run()
            }, 1000)
          }, 10000)
        }, 1000)
      }, 1000)
    })
  })
})

describe('DOWNLOAD', () => {
  it('DownloadWithoutEncrypt', async () => {
    await Promise.all(
      __FILES_LISTS__.map(item =>
        netdisk.download({
          withPath: `${__PATH_PREFIX__}/${item.name}`,
          local: path.resolve(`tmp/files/${item.name}.download`),
          threads: 3,
        })
      )
    )

    for (const item of __FILES_LISTS__) {
      const oriMd5 = await getFileMd5(path.resolve(`tmp/files/${item.name}`))
      const dowMd5 = await getFileMd5(path.resolve(`tmp/files/${item.name}.download`))

      expect(oriMd5).toBe(dowMd5)
    }
  })

  it('DownloadWithEncrypt', async () => {
    await Promise.all(
      __FILES_LISTS__.map(item =>
        netdisk.download({
          withPath: `${__PATH_PREFIX__}/${item.name}.e`,
          local: path.resolve(`tmp/files/${item.name}.e.download`),
          encrypt: 'keenghost',
          threads: 3,
        })
      )
    )

    for (const item of __FILES_LISTS__) {
      const oriMd5 = await getFileMd5(path.resolve(`tmp/files/${item.name}`))
      const dowMd5 = await getFileMd5(path.resolve(`tmp/files/${item.name}.e.download`))

      expect(oriMd5).toBe(dowMd5)
    }
  })
})

describe('DOWNLOAD_TASK', () => {
  it('DownloadTaskWithoutEncrypt', async () => {
    await new Promise<void>((resolve, reject) => {
      const task = netdisk.downloadTask({
        withPath: `${__PATH_PREFIX__}/64.task.bin`,
        local: path.resolve('tmp/files/64.task.bin.download'),
        threads: 3,
        onDone: inData => {
          expect(inData).toHaveProperties('local')

          resolve()
        },
        onError: inError => {
          reject(inError)
        },
      })

      task.run()

      setTimeout(() => {
        task.stop()

        setTimeout(() => {
          task.run()
        }, 1000)
      }, 2000)
    })

    const oriMd5 = await getFileMd5(path.resolve('tmp/files/64.task.bin'))
    const dowMd5 = await getFileMd5(path.resolve('tmp/files/64.task.bin.download'))

    expect(dowMd5).toBe(oriMd5)
  })

  it('DownloadTaskWithEncrypt', async () => {
    await new Promise<void>((resolve, reject) => {
      const task = netdisk.downloadTask({
        withPath: `${__PATH_PREFIX__}/64.task.bin.e`,
        local: path.resolve('tmp/files/64.task.bin.e.download'),
        encrypt: 'keenghost',
        threads: 3,
        onDone: inData => {
          expect(inData).toHaveProperties('local')

          resolve()
        },
        onError: inError => {
          reject(inError)
        },
      })

      task.run()

      setTimeout(() => {
        task.stop()

        setTimeout(() => {
          task.run()
        }, 1000)
      }, 2000)
    })

    const oriMd5 = await getFileMd5(path.resolve('tmp/files/64.task.bin'))
    const dowMd5 = await getFileMd5(path.resolve('tmp/files/64.task.bin.e.download'))

    expect(dowMd5).toBe(oriMd5)
  })
})

describe('FILE_MANAGE', () => {
  it('CopyFile', async () => {
    const data = await netdisk.copyFolderOrFile({
      source: `${__PATH_PREFIX__}/0.bin`,
      target: `${__PATH_PREFIX__}/SubFolder/Copied.bin`,
    })

    expect(data.info.length).toBe(1)
  })

  it('CopyFiles', async () => {
    const data = await netdisk.copyFoldersOrFiles({
      list: [
        {
          source: `${__PATH_PREFIX__}/0.bin.e`,
          target: `${__PATH_PREFIX__}/SubFolder/ToBeMove0.bin`,
        },
        {
          source: `${__PATH_PREFIX__}/16.bin`,
          target: `${__PATH_PREFIX__}/SubFolder/ToBeMove1.bin`,
        },
        {
          source: `${__PATH_PREFIX__}/16.bin.e`,
          target: `${__PATH_PREFIX__}/SubFolder/ToBeMove2.bin`,
        },
        {
          source: `${__PATH_PREFIX__}/32.bin`,
          target: `${__PATH_PREFIX__}/SubFolder/ToBeRename0.bin`,
        },
        {
          source: `${__PATH_PREFIX__}/32.bin.e`,
          target: `${__PATH_PREFIX__}/SubFolder/ToBeRename1.bin`,
        },
        {
          source: `${__PATH_PREFIX__}/64.bin`,
          target: `${__PATH_PREFIX__}/SubFolder/ToBeRename2.bin`,
        },
        {
          source: `${__PATH_PREFIX__}/64.bin.e`,
          target: `${__PATH_PREFIX__}/SubFolder/ToBeDelete0.bin`,
        },
        {
          source: `${__PATH_PREFIX__}/64.task.bin`,
          target: `${__PATH_PREFIX__}/SubFolder/ToBeDelete1.bin`,
        },
        {
          source: `${__PATH_PREFIX__}/64.task.bin.e`,
          target: `${__PATH_PREFIX__}/SubFolder/ToBeDelete2.bin`,
        },
      ],
    })

    expect(data.info.length).toBe(9)
  })

  it('MoveFile', async () => {
    const data = await netdisk.moveFolderOrFile({
      source: `${__PATH_PREFIX__}/SubFolder/ToBeMove0.bin`,
      target: `${__PATH_PREFIX__}/SubFolder/Moved0.bin`,
    })

    expect(data.info.length).toBe(1)
  })

  it('MoveFiles', async () => {
    const data = await netdisk.moveFoldersOrFiles({
      list: [
        {
          source: `${__PATH_PREFIX__}/SubFolder/ToBeMove1.bin`,
          target: `${__PATH_PREFIX__}/SubFolder/Moved1.bin`,
        },
        {
          source: `${__PATH_PREFIX__}/SubFolder/ToBeMove2.bin`,
          target: `${__PATH_PREFIX__}/SubFolder/Moved2.bin`,
        },
      ],
    })

    expect(data.info.length).toBe(2)
  })

  it('RenameFile', async () => {
    const data = await netdisk.renameFolderOrFile({
      source: `${__PATH_PREFIX__}/SubFolder/ToBeRename0.bin`,
      newname: 'Renamed0.bin',
    })

    expect(data.info.length).toBe(1)
  })

  it('RenameFiles', async () => {
    const data = await netdisk.renameFoldersOrFiles({
      list: [
        {
          source: `${__PATH_PREFIX__}/SubFolder/ToBeRename1.bin`,
          newname: 'Renamed1.bin',
        },
        {
          source: `${__PATH_PREFIX__}/SubFolder/ToBeRename2.bin`,
          newname: 'Renamed2.bin',
        },
      ],
    })

    expect(data.info.length).toBe(2)
  })

  it('DeleteFile', async () => {
    const data = await netdisk.deleteFolderOrFile({
      source: `${__PATH_PREFIX__}/SubFolder/ToBeDelete0.bin`,
    })

    expect(data.info.length).toBe(1)
  })

  it('DeleteFiles', async () => {
    const data = await netdisk.deleteFoldersOrFiles({
      list: [
        {
          source: `${__PATH_PREFIX__}/SubFolder/ToBeDelete1.bin`,
        },
        {
          source: `${__PATH_PREFIX__}/SubFolder/ToBeDelete2.bin`,
        },
      ],
    })

    expect(data.info.length).toBe(2)
  })

  it('VerifyFileManage', async () => {
    const { list } = await netdisk.getFileList({
      dir: `${__PATH_PREFIX__}/SubFolder`,
    })

    const expectPaths = [
      `${__PATH_PREFIX__}/SubFolder/Copied.bin`,
      `${__PATH_PREFIX__}/SubFolder/Moved0.bin`,
      `${__PATH_PREFIX__}/SubFolder/Moved1.bin`,
      `${__PATH_PREFIX__}/SubFolder/Moved2.bin`,
      `${__PATH_PREFIX__}/SubFolder/Renamed0.bin`,
      `${__PATH_PREFIX__}/SubFolder/Renamed1.bin`,
      `${__PATH_PREFIX__}/SubFolder/Renamed2.bin`,
    ]
    const existsPaths = list.filter(item => !item.isdir).map(item => item.path)

    expect(expectPaths).toBePlainArrayEqual(existsPaths)
  })
})

describe('CLEANUP', () => {
  it('DeleteFolder', async () => {
    const data = await netdisk.deleteFolderOrFile({
      source: __PATH_PREFIX__,
    })

    expect(data.info.length).toBe(1)
  })

  it('DeleteLocalFolder', async () => {
    fs.rmSync('tmp/files', { recursive: true })

    expect(fs.existsSync('tmp/files')).toBe(false)
  })
})

runTest()
