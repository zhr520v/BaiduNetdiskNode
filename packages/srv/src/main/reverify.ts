import { axios } from 'baidu-netdisk-api'
import { Netdisk } from 'baidu-netdisk-sdk'
import { type IRefreshRes } from 'baidu-netdisk-xth/types'
import { scheduleJob } from 'node-schedule'
import { config, type IUserConfig } from './config.js'
import { __VARS__ } from './vars.js'

class Reverify {
  #processing = false

  constructor() {
    scheduleJob('0 0 * * *', () => this.refreshTokens())
  }

  async refreshTokens() {
    if (this.#processing) {
      return
    }

    this.#processing = true
    const users = config.get('users')

    for (const user of users) {
      if (user.expire - Date.now() > 10 * 24 * 60 * 60 * 1000) {
        continue
      }

      const appKey = user.app_key
      const secretKey = user.secret_key
      const thirdparty = user.thiryparty
      const refreshToken = user.refresh_token

      try {
        if (thirdparty) {
          const { data } = await axios.post<IRefreshRes>(thirdparty + '/api/refresh', {
            refreshToken: refreshToken,
          })

          const newUsers: IUserConfig[] = []

          for (const u of config.get('users')) {
            if (u.id === user.id) {
              newUsers.push({
                ...u,
                access_token: data.accessToken,
                refresh_token: data.refreshToken,
                expire: data.expiresIn,
              })
            } else {
              newUsers.push(u)
            }
          }

          config.modify({ users: newUsers })
          __VARS__.netdisks.get(user.id)?.updateAccessToken(data.accessToken)
        } else if (secretKey) {
          const data = await Netdisk.refreshToken({
            app_key: appKey,
            secret_key: secretKey,
            refresh_token: refreshToken,
          })

          const newUsers: IUserConfig[] = []

          for (const u of config.get('users')) {
            if (u.id === user.id) {
              newUsers.push({
                ...u,
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expire: data.expires_in,
              })
            } else {
              newUsers.push(u)
            }
          }

          config.modify({ users: newUsers })
          __VARS__.netdisks.get(user.id)?.updateAccessToken(data.access_token)
        }
      } catch {}
    }

    this.#processing = false
  }
}

export const reverify = new Reverify()
