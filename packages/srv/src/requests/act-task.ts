import { type IContext, type IHttpActTaskReq } from '../types/http.js'

export default async (ctx: IContext) => {
  const { id, type, action } = ctx.request.body as IHttpActTaskReq

  if (action === 'play') {
    await ctx.userMgr.playTask(id, type)
  } else if (action === 'pause') {
    await ctx.userMgr.pauseTask(id, type)
  } else if (action === 'del') {
    await ctx.userMgr.removeTask(id, type)
  } else {
    throw new Error('无效的操作')
  }
}
