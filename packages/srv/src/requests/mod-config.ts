import { config } from '../main/config.js'
import { type IContext, type IHttpModConfigReq } from '../types/http.js'

export default async (ctx: IContext) => {
  const reqBody = ctx.request.body as IHttpModConfigReq

  config.modify(reqBody)
}
