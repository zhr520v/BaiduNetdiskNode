import {
  IBaiduApiError,
  httpCode2Token,
  httpCreateFolder,
  httpFileInfo,
  httpFileList,
  httpFileListRecursion,
  httpRefreshToken,
  httpUserInfo,
  httpUserQuota,
} from '@baidu-netdisk/api'
import path from 'path'
import {
  PromType,
  __DOWNLOAD_THREADS__,
  __TRY_DELTA__,
  __TRY_TIMES__,
  __UPLOAD_THREADS__,
} from './common/alpha'
import { DownloadTask } from './common/download-task'
import { EAsync, EOndup, fileManage } from './common/file-manage'
import { EStatus } from './common/steps'
import { ERtype, UploadTask } from './common/upload-task'
import { pathNormalized, pick } from './common/utils'

export class Netdisk {
  #app_name = ''
  #access_token = ''
  #gUploadThreads = __UPLOAD_THREADS__
  #gDownloadThreads = __DOWNLOAD_THREADS__
  #gTryTimes = __TRY_TIMES__
  #gTryDelta = __TRY_DELTA__

  static Enum = {
    EAsync: EAsync,
    EOndup: EOndup,
    ERtype: ERtype,
    EStatus: EStatus,
  }

  constructor(inOpts: {
    app_name: string
    access_token: string
    gUploadThreads?: number
    gDownloadThreads?: number
    gTryTimes?: number
    gTryDelta?: number
  }) {
    this.#app_name = inOpts.app_name
    this.#access_token = inOpts.access_token
    this.#gUploadThreads = inOpts.gUploadThreads || this.#gUploadThreads
    this.#gDownloadThreads = inOpts.gDownloadThreads || this.#gDownloadThreads
    this.#gTryTimes = inOpts.gTryTimes || this.#gTryTimes
    this.#gTryDelta = inOpts.gTryDelta || this.#gTryDelta
  }

  static getCodeUrl(inOpts: { app_key: string; app_id: string }) {
    return encodeURI(
      'https://openapi.baidu.com/oauth/2.0/authorize?' +
        'response_type=code&' +
        `client_id=${inOpts.app_key}&` +
        'redirect_uri=oob&' +
        'scope=basic,netdisk&' +
        `device_id=${inOpts.app_id}`
    )
  }

  static async code2Token(inOpts: {
    code: string
    app_key: string
    secret_key: string
    redirect_uri?: string
  }) {
    const { data } = await httpCode2Token({
      code: inOpts.code,
      client_id: inOpts.app_key,
      client_secret: inOpts.secret_key,
      redirect_uri: inOpts.redirect_uri || 'oob',
    })

    return {
      ...data,
      expires_in: Date.now() + data.expires_in * 1000,
    }
  }

  static async refreshToken(inOpts: {
    app_key: string
    secret_key: string
    refresh_token: string
  }) {
    const { data } = await httpRefreshToken({
      client_id: inOpts.app_key,
      client_secret: inOpts.secret_key,
      refresh_token: inOpts.refresh_token,
    })

    return {
      ...data,
      expires_in: Date.now() + data.expires_in * 1000,
    }
  }

  async getUserInfo() {
    const [{ data: user }, { data: quota }] = await Promise.all([
      httpUserInfo({
        access_token: this.#access_token,
      }),
      httpUserQuota({
        access_token: this.#access_token,
        checkexpire: 1,
        checkfree: 1,
      }),
    ])

    const info = {
      ...pick(user, ['avatar_url', 'baidu_name', 'netdisk_name', 'uk', 'vip_type']),
      ...pick(quota, ['expire', 'free', 'total', 'used']),
    }

    return info
  }

  async getFileList(inOpts: {
    dir: string
    opts?: Pick<
      Parameters<typeof httpFileList>[0],
      'desc' | 'folder' | 'limit' | 'order' | 'showempty' | 'start' | 'web'
    > & { infinite?: boolean }
  }) {
    const list: PromType<ReturnType<typeof httpFileList>>['data']['list'] = []

    let may_has_more = false
    let cursor = inOpts.opts?.start || 0
    const limit = inOpts.opts?.limit || 1000
    const infinite = inOpts.opts?.infinite

    do {
      const { data } = await httpFileList({
        access_token: this.#access_token,
        dir: inOpts.dir,
        ...inOpts.opts,
        start: cursor,
      })

      list.push(...data.list)
      may_has_more = data.list.length === limit
      cursor = cursor + data.list.length
    } while (may_has_more && infinite)

    return list.map(item =>
      pick(item, [
        'category',
        'dir_empty',
        'fs_id',
        'isdir',
        'local_ctime',
        'local_mtime',
        'md5',
        'path',
        'server_ctime',
        'server_filename',
        'server_mtime',
        'size',
        'thumbs',
      ])
    )
  }

  async getFileListRecursion(inOpts: {
    path: string
    opts?: Pick<
      Parameters<typeof httpFileListRecursion>[0],
      'ctime' | 'desc' | 'limit' | 'mtime' | 'order' | 'recursion' | 'start' | 'web'
    > & { infinite?: boolean }
  }) {
    const list: PromType<ReturnType<typeof httpFileListRecursion>>['data']['list'] = []

    let has_more = false
    let cursor = inOpts.opts?.start || 0
    const infinite = inOpts.opts?.infinite

    do {
      const { data } = await httpFileListRecursion({
        access_token: this.#access_token,
        path: inOpts.path,
        ...inOpts.opts,
        start: cursor,
      })

      list.push(...data.list)

      has_more = !!data.has_more
      cursor = data.cursor
    } while (has_more && infinite)

    return list.map(item =>
      pick(item, [
        'category',
        'fs_id',
        'isdir',
        'local_ctime',
        'local_mtime',
        'md5',
        'server_ctime',
        'server_mtime',
        'size',
        'thumbs',
      ])
    )
  }

  async getFileInfo(inOpts: {
    fsids: number[]
    opts?: Pick<
      Parameters<typeof httpFileInfo>[0],
      'detail' | 'dlink' | 'extra' | 'needmedia' | 'path' | 'thumb'
    >
  }) {
    const { data } = await httpFileInfo({
      access_token: this.#access_token,
      fsids: JSON.stringify(inOpts.fsids),
      ...inOpts.opts,
    })

    return data.list.map(item =>
      pick(item, [
        'category',
        'date_taken',
        'dlink',
        'filename',
        'height',
        'isdir',
        'orientation',
        'server_ctime',
        'server_mtime',
        'size',
        'thumbs',
        'width',
      ])
    )
  }

  async createFolder(inOpts: {
    path: string
    opts?: Pick<
      Parameters<typeof httpCreateFolder>[1],
      'local_ctime' | 'local_mtime' | 'mode' | 'rtype'
    > & { verifyExists?: boolean }
  }) {
    try {
      const { data } = await httpCreateFolder(
        {
          access_token: this.#access_token,
        },
        {
          path: inOpts.path,
          ...inOpts.opts,
        }
      )

      return pick(data, ['category', 'ctime', 'fs_id', 'isdir', 'mtime', 'path'])
    } catch (err) {
      const tErr = err as IBaiduApiError

      if (inOpts.opts?.verifyExists && tErr.errno === -8) {
        const list = await this.getFileList({
          dir: path.dirname(inOpts.path),
          opts: {
            folder: 1,
            infinite: true,
          },
        })

        const item = list.find(item => item.path === inOpts.path)

        if (item) {
          const dirObj: Pick<
            PromType<ReturnType<typeof httpCreateFolder>>['data'],
            'category' | 'ctime' | 'fs_id' | 'isdir' | 'mtime' | 'path'
          > = {
            category: 6,
            isdir: 1,
            path: inOpts.path,
          }

          return dirObj
        }
      }

      throw err
    }
  }

  copyFolderOrFile(inOpts: {
    source: string
    target: string
    ondup?: (typeof EOndup)[keyof typeof EOndup]
    async?: (typeof EAsync)[keyof typeof EAsync]
  }) {
    return fileManage({
      access_token: this.#access_token,
      opera: 'copy',
      list: [pick(inOpts, ['source', 'target'])],
      ...pick(inOpts, ['ondup', 'async']),
    })
  }

  copyFoldersOrFiles(inOpts: {
    list: {
      source: string
      target: string
      ondup?: (typeof EOndup)[keyof typeof EOndup]
    }[]
    ondup?: (typeof EOndup)[keyof typeof EOndup]
    async?: (typeof EAsync)[keyof typeof EAsync]
  }) {
    return fileManage({
      access_token: this.#access_token,
      opera: 'copy',
      ...inOpts,
    })
  }

  moveFolderOrFile(inOpts: {
    source: string
    target: string
    ondup?: (typeof EOndup)[keyof typeof EOndup]
    async?: (typeof EAsync)[keyof typeof EAsync]
  }) {
    return fileManage({
      access_token: this.#access_token,
      opera: 'move',
      list: [pick(inOpts, ['source', 'target'])],
      ...pick(inOpts, ['ondup', 'async']),
    })
  }

  moveFoldersOrFiles(inOpts: {
    list: {
      source: string
      target: string
      ondup?: (typeof EOndup)[keyof typeof EOndup]
    }[]
    ondup?: (typeof EOndup)[keyof typeof EOndup]
    async?: (typeof EAsync)[keyof typeof EAsync]
  }) {
    return fileManage({
      access_token: this.#access_token,
      opera: 'move',
      ...inOpts,
    })
  }

  renameFolderOrFile(inOpts: {
    source: string
    newname: string
    ondup?: (typeof EOndup)[keyof typeof EOndup]
    async?: (typeof EAsync)[keyof typeof EAsync]
  }) {
    return fileManage({
      access_token: this.#access_token,
      opera: 'rename',
      list: [pick(inOpts, ['source', 'newname'])],
      ...pick(inOpts, ['ondup', 'async']),
    })
  }

  renameFoldersOrFiles(inOpts: {
    list: {
      source: string
      newname: string
      ondup?: (typeof EOndup)[keyof typeof EOndup]
    }[]
    ondup?: (typeof EOndup)[keyof typeof EOndup]
    async?: (typeof EAsync)[keyof typeof EAsync]
  }) {
    return fileManage({
      access_token: this.#access_token,
      opera: 'rename',
      ...inOpts,
    })
  }

  deleteFolderOrFile(inOpts: { source: string; async?: (typeof EAsync)[keyof typeof EAsync] }) {
    return fileManage({
      access_token: this.#access_token,
      opera: 'delete',
      list: [pick(inOpts, ['source'])],
      ...pick(inOpts, ['async']),
    })
  }

  deleteFoldersOrFiles(inOpts: {
    list: { source: string }[]
    async?: (typeof EAsync)[keyof typeof EAsync]
  }) {
    return fileManage({
      access_token: this.#access_token,
      opera: 'delete',
      ...inOpts,
    })
  }

  upload(
    inOpts: Pick<
      ConstructorParameters<typeof UploadTask>[0],
      'encrypt' | 'local' | 'apiOpts' | 'remote' | 'rtype' | 'threads' | 'tryDelta' | 'tryTimes'
    >
  ) {
    if (pathNormalized(inOpts.remote).startsWith(`/apps/${this.#app_name}`)) {
      throw new Error(`only support upload to specific folder ${this.#app_name} for now`)
    }

    const task = new UploadTask({
      ...inOpts,
      app_name: this.#app_name,
      access_token: this.#access_token,
      noSilent: true,
      threads: inOpts.threads || this.#gUploadThreads,
      tryTimes: inOpts.tryTimes || this.#gTryTimes,
      tryDelta: inOpts.tryDelta || this.#gTryDelta,
    })

    task.run()

    return task.done
  }

  uploadTask(
    inOpts: Pick<
      ConstructorParameters<typeof UploadTask>[0],
      'encrypt' | 'local' | 'apiOpts' | 'remote' | 'rtype' | 'threads' | 'tryDelta' | 'tryTimes'
    >
  ) {
    if (pathNormalized(inOpts.remote).startsWith(`/apps/${this.#app_name}`)) {
      throw new Error(`only support upload to specific folder ${this.#app_name} for now`)
    }

    return new UploadTask({
      ...inOpts,
      app_name: this.#app_name,
      access_token: this.#access_token,
      threads: inOpts.threads || this.#gUploadThreads,
      tryTimes: inOpts.tryTimes || this.#gTryTimes,
      tryDelta: inOpts.tryDelta || this.#gTryDelta,
    })
  }

  download(
    inOpts: Pick<
      ConstructorParameters<typeof DownloadTask>[0],
      | 'encrypt'
      | 'local'
      | 'threads'
      | 'tryDelta'
      | 'tryTimes'
      | 'withDlink'
      | 'withFsid'
      | 'withPath'
    >
  ) {
    const task = new DownloadTask({
      ...inOpts,
      access_token: this.#access_token,
      noSilent: true,
      threads: inOpts.threads || this.#gDownloadThreads,
      tryTimes: inOpts.tryTimes || this.#gTryTimes,
      tryDelta: inOpts.tryDelta || this.#gTryDelta,
    })

    task.run()

    return task.done
  }

  downloadTask(
    inOpts: Pick<
      ConstructorParameters<typeof DownloadTask>[0],
      | 'encrypt'
      | 'local'
      | 'threads'
      | 'tryDelta'
      | 'tryTimes'
      | 'withDlink'
      | 'withFsid'
      | 'withPath'
    >
  ) {
    return new DownloadTask({
      ...inOpts,
      access_token: this.#access_token,
      threads: inOpts.threads || this.#gDownloadThreads,
      tryTimes: inOpts.tryTimes || this.#gTryTimes,
      tryDelta: inOpts.tryDelta || this.#gTryDelta,
    })
  }
}
