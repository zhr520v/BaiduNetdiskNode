import { type IContext, type IHttpManualCheckReq } from '../types/http.js'

export default async (ctx: IContext) => {
  const reqBody = ctx.request.body as IHttpManualCheckReq

  const folderMgr = ctx.userMgr.getFolder(reqBody.id)

  folderMgr.runSync().catch()
}
