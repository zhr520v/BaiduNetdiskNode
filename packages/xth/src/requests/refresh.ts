import { httpRefreshToken } from 'baidu-netdisk-api'
import { config } from '../main/config.js'
import { type IContext, type IRefreshReq, type IRefreshRes } from '../types/http.js'

export default async (ctx: IContext<IRefreshRes>) => {
  const reqBody = ctx.request.body as IRefreshReq

  if (!reqBody.refreshToken) {
    throw new Error('refreshToken is required')
  }

  const { data } = await httpRefreshToken({
    refresh_token: reqBody.refreshToken,
    client_id: config.get('app_key'),
    client_secret: config.get('secret_key'),
  })

  ctx.body = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: Date.now() + data.expires_in * 1000,
  }
}
