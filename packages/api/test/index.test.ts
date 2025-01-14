import { describe, expect, it, runTest } from '@root/utils/test-suite'
import crypto from 'node:crypto'
import fs from 'node:fs'
import pico from 'picocolors'
import {
  httpCopy,
  httpCreateFolder,
  httpDelete,
  httpFileInfo,
  httpFileList,
  httpFileListRecursion,
  httpFileManager,
  httpMove,
  httpRename,
  httpUploadFinish,
  httpUploadId,
  httpUploadSlice,
  httpUploadSmall,
  httpUploadUrl,
  httpUserInfo,
  httpUserQuota,
} from '../index'

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

function md5(inData: Buffer) {
  return crypto.createHash('md5').update(inData).digest('hex')
}

function genRandomBuffer(inSize: number) {
  const buf = Buffer.alloc(inSize)

  for (let i = 0; i < inSize; i++) {
    buf[i] = Math.floor(Math.random() * 256)
  }

  return buf
}

const testInfo: {
  largeFileMd5: string[]
  largeFileSize: number
  uploadId: string
  uploadUrl: string
  smallFilefsId: number
  largeFilefsId: number
} = {
  largeFileMd5: [],
  largeFileSize: 0,
  uploadId: '',
  uploadUrl: '',
  smallFilefsId: 0,
  largeFilefsId: 0,
}

const app_name = config.app_name
const access_token = config.access_token
const __NETDISK_PATH_PREFIX__ = `/apps/${app_name}/BaiduNetdiskApiTest`

function init() {
  try {
    fs.rmSync('tmp/files', { recursive: true })
  } catch {}

  fs.mkdirSync('tmp/files')

  const smallFileBuf = genRandomBuffer(4 * 1024 * 1024)
  fs.writeFileSync('tmp/files/SmallFile.bin', smallFileBuf)

  const largeFileBuf = genRandomBuffer(5.5 * 1024 * 1024)
  testInfo.largeFileSize = largeFileBuf.length

  for (let i = 0, pointer = 0; pointer < largeFileBuf.length; i++) {
    const nextPointer = Math.min(pointer + 4 * 1024 * 1024, largeFileBuf.length)
    const buf = largeFileBuf.subarray(pointer, nextPointer)
    testInfo.largeFileMd5.push(md5(buf))
    pointer = nextPointer
    fs.writeFileSync(`tmp/files/LargeFile-${i}.bin`, buf)
  }
}

init()

describe('USERINFO', () => {
  it('UserInfo', async () => {
    const { data } = await httpUserInfo({
      access_token,
    })

    expect(data).toHaveProperties('avatar_url', 'baidu_name', 'netdisk_name', 'uk', 'vip_type')
  })

  it('UserInfoQuota', async () => {
    const { data } = await httpUserQuota({
      access_token,
      checkexpire: 1,
      checkfree: 1,
    })

    expect(data).toHaveProperties('expire', 'free', 'total', 'used')
  })
})

describe('CLEANUP', () => {
  it('DeleteFolder', async () => {
    const { data } = await httpDelete(
      {
        access_token,
      },
      {
        filelist: JSON.stringify([__NETDISK_PATH_PREFIX__]),
        async: 0,
      }
    )

    expect(data).toHaveProperties('info')
  })

  it('CreateFolder', async () => {
    const { data } = await httpCreateFolder(
      {
        access_token,
      },
      {
        path: `${__NETDISK_PATH_PREFIX__}`,
        rtype: 0,
      }
    )

    expect(data).toHaveProperties('category', 'name', 'path')
  })
})

describe('FILE_UPLOAD', () => {
  it('FileUploadId', async () => {
    const stats = fs.statSync('tmp/files/LargeFile-0.bin')

    const { data } = await httpUploadId(
      {
        access_token,
      },
      {
        block_list: JSON.stringify(testInfo.largeFileMd5),
        path: `${__NETDISK_PATH_PREFIX__}/LargeFile.bin`,
        size: testInfo.largeFileSize,
        local_ctime: Math.floor(stats.ctime.getTime() / 1000).toString(),
        local_mtime: Math.floor(stats.mtime.getTime() / 1000).toString(),
        rtype: 3,
      }
    )

    expect(data).toHaveProperties('block_list', 'return_type', 'uploadid')
    expect(data.uploadid).toBeTruthy()
    expect(data.block_list.length).toBe(testInfo.largeFileMd5.length)

    testInfo.uploadId = data.uploadid
  })

  it('FileUploadUrl', async () => {
    const { data } = await httpUploadUrl({
      access_token,
      path: `${__NETDISK_PATH_PREFIX__}/LargeFile.bin`,
      uploadid: testInfo.uploadId,
    })

    expect(data).toHaveProperties('servers')

    for (const server of data.servers) {
      expect(server).toHaveProperties('server')
    }

    const server = data.servers.find(i => /^https/.test(i.server))
    const uploadUrl = server?.server

    if (!uploadUrl) {
      throw new Error('Returned Https Server Not Found')
    }

    testInfo.uploadUrl = uploadUrl
  })

  it('FileUploadSlice', async () => {
    for (let i = 0; i < testInfo.largeFileMd5.length; i++) {
      const { data } = await httpUploadSlice(
        testInfo.uploadUrl,
        {
          access_token,
          path: `${__NETDISK_PATH_PREFIX__}/LargeFile.bin`,
          partseq: i,
          uploadid: testInfo.uploadId,
        },
        fs.readFileSync(`tmp/files/LargeFile-${i}.bin`)
      )

      expect(data).toHaveProperties('md5')
      expect(data.md5).toBe(testInfo.largeFileMd5[i])
    }
  })

  it('FileUploadFinish', async () => {
    const { data } = await httpUploadFinish(
      {
        access_token,
      },
      {
        block_list: JSON.stringify(testInfo.largeFileMd5),
        size: testInfo.largeFileSize.toString(),
        path: `${__NETDISK_PATH_PREFIX__}/LargeFile.bin`,
        uploadid: testInfo.uploadId,
        rtype: 3,
      }
    )

    testInfo.largeFilefsId = data.fs_id

    expect(data).toHaveProperties(
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
    expect(data.fs_id).toBeGreaterThan(0)
  })

  it('FileUploadSmall', async () => {
    const { data } = await httpUploadSmall(
      testInfo.uploadUrl,
      {
        access_token,
        path: `${__NETDISK_PATH_PREFIX__}/SmallFile.bin`,
        ondup: 'overwrite',
      },
      fs.readFileSync('tmp/files/SmallFile.bin')
    )

    expect(data).toHaveProperties('ctime', 'fs_id', 'md5', 'mtime', 'path', 'size')
    expect(data.fs_id).toBeGreaterThan(0)

    testInfo.smallFilefsId = data.fs_id
  })
})

describe('FILE_MANAGER', () => {
  it('CopyFile', async () => {
    const { data } = await httpCopy(
      {
        access_token,
      },
      {
        filelist: JSON.stringify([
          {
            path: `${__NETDISK_PATH_PREFIX__}/LargeFile.bin`,
            dest: `${__NETDISK_PATH_PREFIX__}/Copy/`,
            newname: 'LargeFileCopied.bin',
            ondup: 'overwrite',
          },
          {
            path: `${__NETDISK_PATH_PREFIX__}/LargeFile.bin`,
            dest: `${__NETDISK_PATH_PREFIX__}/Rename/`,
            newname: 'LargeFileToBeRename.bin',
          },
          {
            path: `${__NETDISK_PATH_PREFIX__}/LargeFile.bin`,
            dest: `${__NETDISK_PATH_PREFIX__}/`,
            newname: 'LargeFileToBeDelete.bin',
          },
        ]),
        async: 0,
        ondup: 'overwrite',
      }
    )

    expect(data).toHaveProperties('info')
    expect(data.info.length).toBe(3)
  })

  it('MoveFile', async () => {
    const { data } = await httpMove(
      {
        access_token,
      },
      {
        filelist: JSON.stringify([
          {
            path: `${__NETDISK_PATH_PREFIX__}/SmallFile.bin`,
            dest: `${__NETDISK_PATH_PREFIX__}/Move/`,
            newname: 'SmallFileMoved.bin',
            ondup: 'overwrite',
          },
        ]),
        async: 0,
        ondup: 'overwrite',
      }
    )

    expect(data).toHaveProperties('info')
    expect(data.info.length).toBe(1)
  })

  it('RenameFile', async () => {
    const { data } = await httpRename(
      {
        access_token,
      },
      {
        filelist: JSON.stringify([
          {
            path: `${__NETDISK_PATH_PREFIX__}/Rename/LargeFileToBeRename.bin`,
            newname: 'LargeFileRenamed.bin',
            ondup: 'overwrite',
          },
        ]),
        async: 0,
        ondup: 'overwrite',
      }
    )

    expect(data).toHaveProperties('info')
    expect(data.info.length).toBe(1)
  })

  it('DeleteFile', async () => {
    const { data } = await httpDelete(
      {
        access_token,
      },
      {
        filelist: JSON.stringify([`${__NETDISK_PATH_PREFIX__}/LargeFileToBeDelete.bin`]),
        async: 0,
      }
    )

    expect(data).toHaveProperties('info')
  })
})

describe('FILE_INFO', () => {
  it('FileInfo', async () => {
    const { data } = await httpFileInfo({
      access_token,
      fsids: JSON.stringify([testInfo.largeFilefsId]),
      needmedia: 1,
      detail: 1,
      extra: 1,
      thumb: 1,
    })

    expect(data).toHaveProperties('list')
    expect(data.list.length).toBe(1)
  })

  it('FileList', async () => {
    const { data } = await httpFileList({
      access_token,
      dir: __NETDISK_PATH_PREFIX__,
    })

    expect(data).toHaveProperties('list')
    expect(data.list.length).toBe(4)
  })
})

describe('VERIFY', () => {
  it('FileListRecursion', async () => {
    const { data } = await httpFileListRecursion({
      access_token,
      path: __NETDISK_PATH_PREFIX__,
      recursion: 1,
    })

    expect(data).toHaveProperties('cursor', 'list')
    expect(data.list.length).toBeGreaterThan(0)

    const expectPaths = [
      `${__NETDISK_PATH_PREFIX__}/LargeFile.bin`,
      `${__NETDISK_PATH_PREFIX__}/Copy/LargeFileCopied.bin`,
      `${__NETDISK_PATH_PREFIX__}/Move/SmallFileMoved.bin`,
      `${__NETDISK_PATH_PREFIX__}/Rename/LargeFileRenamed.bin`,
    ]
    const existsPaths = data.list.filter(item => !item.isdir).map(item => item.path)

    expect(expectPaths).toBePlainArrayEqual(existsPaths)
  })
})

describe('CLEANUP', () => {
  it('DeleteFolder', async () => {
    const { data } = await httpFileManager(
      {
        access_token,
        opera: 'delete',
      },
      {
        filelist: JSON.stringify([__NETDISK_PATH_PREFIX__]),
        async: 0,
      }
    )

    expect(data).toHaveProperties('info')
  })

  it('DeleteLocalFolder', async () => {
    fs.rmSync('tmp/files', { recursive: true })

    expect(fs.existsSync('tmp/files')).toBe(false)
  })
})

runTest()
