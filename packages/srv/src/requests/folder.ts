import { type IContext, type IHttpFolderReq, type IHttpFolderRes } from '../types/http.js'

export default async (ctx: IContext<IHttpFolderRes>) => {
  const reqBody = ctx.request.body as IHttpFolderReq

  ctx.body = ctx.userMgr.getFolder(reqBody.id).basicInfo()
}
