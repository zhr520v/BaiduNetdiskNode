import {
  httpCode2Token,
  httpCreateFolder,
  httpFileInfo,
  httpFileList,
  httpFileListRecursion,
  httpRefreshToken,
  httpUserInfo,
  httpUserQuota,
} from 'baidu-netdisk-api'
import { type IBaiduApiError } from 'baidu-netdisk-api/types'
import path from 'node:path'
import {
  __DOWNLOAD_THREADS__,
  __TRY_DELTA__,
  __TRY_TIMES__,
  __UPLOAD_THREADS__,
} from '../common/const.js'
import { DownloadTask } from '../common/download-task.js'
import { fileManage } from '../common/file-manage.js'
import { UploadTask } from '../common/upload-task.js'
import { type PromType, pathNormalized, pick, tryTimes } from '../common/utils.js'
import { EFileManageAsync, EFileManageOndup } from '../types/enums.js'

export class Netdisk {
  #app_name = ''
  #access_token = ''
  #gUploadThreads = __UPLOAD_THREADS__
  #gDownloadThreads = __DOWNLOAD_THREADS__
  #gTryTimes = __TRY_TIMES__
  #gTryDelta = __TRY_DELTA__

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
    const { data } = await tryTimes(
      () =>
        httpCode2Token({
          code: inOpts.code,
          client_id: inOpts.app_key,
          client_secret: inOpts.secret_key,
          redirect_uri: inOpts.redirect_uri || 'oob',
        }),
      { times: __TRY_TIMES__, delta: __TRY_DELTA__ }
    )

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
    const { data } = await tryTimes(
      () =>
        httpRefreshToken({
          client_id: inOpts.app_key,
          client_secret: inOpts.secret_key,
          refresh_token: inOpts.refresh_token,
        }),
      { times: __TRY_TIMES__, delta: __TRY_DELTA__ }
    )

    return {
      ...data,
      expires_in: Date.now() + data.expires_in * 1000,
    }
  }

  async getUserInfo() {
    const [{ data: user }, { data: quota }] = await Promise.all([
      tryTimes(
        () =>
          httpUserInfo({
            access_token: this.#access_token,
          }),
        { times: this.#gTryTimes, delta: this.#gTryDelta }
      ),
      tryTimes(
        () =>
          httpUserQuota({
            access_token: this.#access_token,
            checkexpire: 1,
            checkfree: 1,
          }),
        { times: this.#gTryTimes, delta: this.#gTryDelta }
      ),
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
      const { data } = await tryTimes(
        () =>
          httpFileList({
            access_token: this.#access_token,
            dir: inOpts.dir,
            ...inOpts.opts,
            start: cursor,
          }),
        { times: this.#gTryTimes, delta: this.#gTryDelta }
      )

      list.push(...data.list)
      may_has_more = data.list.length === limit
      cursor = cursor + data.list.length
    } while (may_has_more && infinite)

    return {
      cursor: cursor,
      may_has_more: may_has_more,
      list: list.map(item =>
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
      ),
    }
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
      const { data } = await tryTimes(
        () =>
          httpFileListRecursion({
            access_token: this.#access_token,
            path: inOpts.path,
            ...inOpts.opts,
            start: cursor,
          }),
        { times: this.#gTryTimes, delta: this.#gTryDelta }
      )

      list.push(...data.list)

      has_more = !!data.has_more
      cursor = data.cursor
    } while (has_more && infinite)

    return {
      cursor: cursor,
      has_more: has_more,
      list: list.map(item =>
        pick(item, [
          'category',
          'fs_id',
          'isdir',
          'local_ctime',
          'local_mtime',
          'md5',
          'path',
          'server_ctime',
          'server_mtime',
          'size',
          'thumbs',
        ])
      ),
    }
  }

  async getFileInfo(inOpts: {
    fsids: number[]
    opts?: Pick<
      Parameters<typeof httpFileInfo>[0],
      'detail' | 'dlink' | 'extra' | 'needmedia' | 'path' | 'thumb'
    >
  }) {
    const { data } = await tryTimes(
      () =>
        httpFileInfo({
          access_token: this.#access_token,
          fsids: JSON.stringify(inOpts.fsids),
          ...inOpts.opts,
        }),
      { times: this.#gTryTimes, delta: this.#gTryDelta }
    )

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
      const { data } = await tryTimes(
        () =>
          httpCreateFolder(
            {
              access_token: this.#access_token,
            },
            {
              path: inOpts.path,
              ...inOpts.opts,
            }
          ),
        { times: this.#gTryTimes, delta: this.#gTryDelta }
      )

      return pick(data, ['category', 'ctime', 'fs_id', 'isdir', 'mtime', 'path'])
    } catch (err) {
      const tErr = err as IBaiduApiError

      if (inOpts.opts?.verifyExists && tErr.errno === -8) {
        const { list } = await this.getFileList({
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
    ondup?: EFileManageOndup
    async?: EFileManageAsync
  }) {
    return tryTimes(
      () =>
        fileManage({
          access_token: this.#access_token,
          opera: 'copy',
          list: [pick(inOpts, ['source', 'target'])],
          ...pick(inOpts, ['ondup', 'async']),
        }),
      { times: this.#gTryTimes, delta: this.#gTryDelta }
    )
  }

  copyFoldersOrFiles(inOpts: {
    list: {
      source: string
      target: string
      ondup?: EFileManageOndup
    }[]
    ondup?: EFileManageOndup
    async?: EFileManageAsync
  }) {
    return tryTimes(
      () =>
        fileManage({
          access_token: this.#access_token,
          opera: 'copy',
          ...inOpts,
        }),
      { times: this.#gTryTimes, delta: this.#gTryDelta }
    )
  }

  moveFolderOrFile(inOpts: {
    source: string
    target: string
    ondup?: EFileManageOndup
    async?: EFileManageAsync
  }) {
    return tryTimes(
      () =>
        fileManage({
          access_token: this.#access_token,
          opera: 'move',
          list: [pick(inOpts, ['source', 'target'])],
          ...pick(inOpts, ['ondup', 'async']),
        }),
      { times: this.#gTryTimes, delta: this.#gTryDelta }
    )
  }

  moveFoldersOrFiles(inOpts: {
    list: {
      source: string
      target: string
      ondup?: EFileManageOndup
    }[]
    ondup?: EFileManageOndup
    async?: EFileManageAsync
  }) {
    return tryTimes(
      () =>
        fileManage({
          access_token: this.#access_token,
          opera: 'move',
          ...inOpts,
        }),
      { times: this.#gTryTimes, delta: this.#gTryDelta }
    )
  }

  renameFolderOrFile(inOpts: {
    source: string
    newname: string
    ondup?: EFileManageOndup
    async?: EFileManageAsync
  }) {
    return tryTimes(
      () =>
        fileManage({
          access_token: this.#access_token,
          opera: 'rename',
          list: [pick(inOpts, ['source', 'newname'])],
          ...pick(inOpts, ['ondup', 'async']),
        }),
      { times: this.#gTryTimes, delta: this.#gTryDelta }
    )
  }

  renameFoldersOrFiles(inOpts: {
    list: {
      source: string
      newname: string
      ondup?: EFileManageOndup
    }[]
    ondup?: EFileManageOndup
    async?: EFileManageAsync
  }) {
    return tryTimes(
      () =>
        fileManage({
          access_token: this.#access_token,
          opera: 'rename',
          ...inOpts,
        }),
      { times: this.#gTryTimes, delta: this.#gTryDelta }
    )
  }

  deleteFolderOrFile(inOpts: { source: string; async?: EFileManageAsync }) {
    return tryTimes(
      () =>
        fileManage({
          access_token: this.#access_token,
          opera: 'delete',
          list: [pick(inOpts, ['source'])],
          ...pick(inOpts, ['async']),
        }),
      { times: this.#gTryTimes, delta: this.#gTryDelta }
    )
  }

  deleteFoldersOrFiles(inOpts: { list: { source: string }[]; async?: EFileManageAsync }) {
    return tryTimes(
      () =>
        fileManage({
          access_token: this.#access_token,
          opera: 'delete',
          ...inOpts,
        }),
      { times: this.#gTryTimes, delta: this.#gTryDelta }
    )
  }

  async upload(
    inOpts: Pick<
      ConstructorParameters<typeof UploadTask>[0],
      | 'encrypt'
      | 'local'
      | 'apiOpts'
      | 'remote'
      | 'rtype'
      | 'threads'
      | 'noVerify'
      | 'downloadThreads'
      | 'tryDelta'
      | 'tryTimes'
    >
  ) {
    if (!pathNormalized(inOpts.remote).startsWith(`/apps/${this.#app_name}/`)) {
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

    try {
      return await task.done
    } catch (inError) {
      task.terminate()
      throw inError
    }
  }

  uploadTask(
    inOpts: Pick<
      ConstructorParameters<typeof UploadTask>[0],
      | 'encrypt'
      | 'local'
      | 'apiOpts'
      | 'onDone'
      | 'onError'
      | 'onStatusChanged'
      | 'remote'
      | 'rtype'
      | 'threads'
      | 'noVerify'
      | 'downloadThreads'
      | 'tryDelta'
      | 'tryTimes'
    >
  ) {
    if (!pathNormalized(inOpts.remote).startsWith(`/apps/${this.#app_name}/`)) {
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

  async download(
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
      | 'noVerify'
      | 'noVerifyOnDisk'
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

    try {
      return await task.done
    } catch (inError) {
      task.terminate()
      throw inError
    }
  }

  downloadTask(
    inOpts: Pick<
      ConstructorParameters<typeof DownloadTask>[0],
      | 'encrypt'
      | 'local'
      | 'onDone'
      | 'onError'
      | 'onStatusChanged'
      | 'threads'
      | 'noVerify'
      | 'noVerifyOnDisk'
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
