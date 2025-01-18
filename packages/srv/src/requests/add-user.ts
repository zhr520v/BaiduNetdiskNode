import { httpUserInfo } from 'baidu-netdisk-api'
import { Netdisk } from 'baidu-netdisk-sdk'
import { nanoid } from '../common/utils.js'
import { type IUserConfig, config } from '../main/config.js'
import { initUser } from '../main/vars.js'
import { type IContext, type IHttpAddUserReq } from '../types/http.js'

export default async (ctx: IContext) => {
  const body = ctx.request.body as IHttpAddUserReq

  const token = await Netdisk.code2Token({
    code: body.code,
    app_key: body.app_key,
    secret_key: body.secret_key,
  })

  const { data: userInfo } = await httpUserInfo({ access_token: token.access_token })

  const newUser: IUserConfig = {
    access_token: token.access_token,
    app_id: body.app_id,
    app_key: body.app_key,
    app_name: body.app_name,
    expire: token.expires_in,
    refresh_token: token.refresh_token,
    secret_key: body.secret_key,
    uk: userInfo.uk,
    thiryparty: '',
    id: nanoid(),
    folders: [],
  }

  config.modify({ users: config.get('users').concat([newUser]) })

  initUser(newUser)
}
