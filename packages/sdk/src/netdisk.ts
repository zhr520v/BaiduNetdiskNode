import {
  httpCode2Token,
  httpRefreshToken,
  httpUserInfo,
  httpUserQuota,
} from '@baidu-netdisk/api'
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
}
