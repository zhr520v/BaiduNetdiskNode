import {
  httpCode2Token,
  httpFileInfo,
  httpFileList,
  httpFileListRecursion,
  httpRefreshToken,
  httpUserInfo,
  httpUserQuota,
} from '@baidu-netdisk/api'
import { PromType } from './common/alpha'
import { pick } from './common/utils'

export class Netdisk {
  #app_name = ''
  #access_token = ''

  constructor(inOpts: { app_name: string; access_token: string }) {
    this.#app_name = inOpts.app_name
    this.#access_token = inOpts.access_token
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
}
