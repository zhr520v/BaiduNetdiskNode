import { type Netdisk } from 'baidu-netdisk-sdk'
import { type PromType } from '../common/utils.js'
import { config } from '../main/config.js'
import { __VARS__ } from '../main/vars.js'
import { type IContext, type IHttpUsersReq, type IHttpUsersRes } from '../types/http.js'

const __INFO_TIME__: Map<string, number> = new Map()
const __INFO_CACHE__: Map<string, PromType<ReturnType<Netdisk['getUserInfo']>>> = new Map()

async function getUserInfo(inUserId: string) {
  const now = Date.now()

  const infoTime = __INFO_TIME__.get(inUserId) || 0

  if (now - infoTime <= 60 * 60 * 1000) {
    const cache = __INFO_CACHE__.get(inUserId)

    if (cache) {
      return cache
    }
  }

  const netdisk = __VARS__.netdisks.get(inUserId)

  if (!netdisk) {
    throw new Error('找不到该用户的 Netdisk 实例')
  }

  const newCache = await netdisk.getUserInfo()

  __INFO_CACHE__.set(inUserId, newCache)
  __INFO_TIME__.set(inUserId, Date.now())

  return newCache
}

export default async (ctx: IContext<IHttpUsersRes>) => {
  const body = ctx.request.body as IHttpUsersReq
  const returnUsers: IHttpUsersRes['users'] = []

  if (body.id) {
    const user = config.get('users').find(item => item.id === body.id)

    if (!user) {
      throw new Error('找不到该用户')
    }

    returnUsers.push({
      id: user.id,
      app_name: user.app_name,
      ...(await getUserInfo(user.id)),
    })
  } else {
    const users = config.get('users')

    for (const user of users) {
      returnUsers.push({
        id: user.id,
        app_name: user.app_name,
        ...(await getUserInfo(user.id)),
      })
    }
  }

  ctx.body = {
    users: returnUsers,
  }
}
