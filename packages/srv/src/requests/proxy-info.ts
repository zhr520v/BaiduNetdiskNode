import { axios } from 'baidu-netdisk-api'
import { type IContext, type IHttpProxyInfoReq, type IHttpProxyInfoRes } from '../types/http.js'

export default async (ctx: IContext<IHttpProxyInfoRes>) => {
  const reqBody = ctx.request.body as IHttpProxyInfoReq

  const { data } = await axios.post(reqBody.addr.replace(/\/*$/, '') + '/api/info')

  ctx.body = data
}
