import { axios, httpUserInfo } from 'baidu-netdisk-api'
import { type IAuthRes } from 'baidu-netdisk-xth/types'
import { nanoid } from '../common/utils.js'
import { type IUserConfig, config } from '../main/config.js'
import { initUser } from '../main/vars.js'
import { type IContext, type IHttpProxyAuthReq } from '../types/http.js'

export default async (ctx: IContext) => {
  const reqBody = ctx.request.body as IHttpProxyAuthReq

  if (!reqBody.appName) {
    throw new Error('appName is required')
  }

  const { data } = await axios.post<IAuthRes>(reqBody.addr.replace(/\/*$/, '') + '/api/auth', {
    authCode: reqBody.authCode,
  })

  const { data: userInfo } = await httpUserInfo({ access_token: data.accessToken })

  const newUser: IUserConfig = {
    access_token: data.accessToken,
    app_id: reqBody.appId,
    app_key: reqBody.appKey,
    app_name: reqBody.appName,
    expire: data.expiresIn,
    refresh_token: data.refreshToken,
    secret_key: '',
    uk: userInfo.uk,
    thiryparty: reqBody.addr.replace(/\/*$/, ''),
    id: nanoid(),
    folders: [],
  }

  config.modify({ users: config.get('users').concat([newUser]) })

  initUser(newUser)
}
