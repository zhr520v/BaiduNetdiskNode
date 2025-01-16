import { httpCode2Token } from 'baidu-netdisk-api'
import { config } from '../main/config.js'
import { type IAuthReq, type IAuthRes, type IContext } from '../types/http.js'

export default async (ctx: IContext<IAuthRes>) => {
  const reqBody = ctx.request.body as IAuthReq

  if (!reqBody.authCode) {
    throw new Error('authCode is required')
  }

  const { data } = await httpCode2Token({
    code: reqBody.authCode,
    client_id: config.get('app_key'),
    client_secret: config.get('secret_key'),
  })

  ctx.body = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: Date.now() + data.expires_in * 1000,
  }
}
