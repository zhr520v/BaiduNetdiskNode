import { config } from '../main/config.js'
import { type IContext, type IInfoRes } from '../types/http.js'

export default async (ctx: IContext<IInfoRes>) => {
  ctx.body = {
    appId: config.get('app_id'),
    appKey: config.get('app_key'),
    appName: config.get('app_name'),
  }
}
