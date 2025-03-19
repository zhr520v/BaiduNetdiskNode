import { LRUCache } from 'lru-cache'
import {
  type IContext,
  type IHttpDiskListItem,
  type IHttpDiskListReq,
  type IHttpDiskListRes,
} from '../types/http.js'

const LRUCacheOpts = {
  ttl: 60 * 60 * 1000,
  ttlAutopurge: true,
}

const USER_CACHE = new Map<string, LRUCache<string, IHttpDiskListItem[]>>()

function getUserCache(uid: string) {
  const cache = USER_CACHE.get(uid)

  if (cache) {
    return cache
  }

  const newCache = new LRUCache<string, IHttpDiskListItem[]>(LRUCacheOpts)

  USER_CACHE.set(uid, newCache)

  return newCache
}

export default async (ctx: IContext<IHttpDiskListRes>) => {
  const { path, page, force, fOnly } = ctx.request.body as IHttpDiskListReq

  const userCache = getUserCache(ctx.user.id)

  if (force || fOnly || !userCache.has(path)) {
    const data = await ctx.userMgr.netdisk.getFileList({
      dir: path,
      opts: {
        infinite: true,
        limit: 1000,
        folder: fOnly ? 1 : 0,
      },
    })

    const list = data.list.map(i => ({
      fs_id: i.fs_id || 0,
      isdir: i.isdir || (fOnly ? 1 : 0),
      ctime: i.local_ctime || 0,
      mtime: i.local_mtime || 0,
      path: i.path || '',
      size: i.size || 0,
    }))

    if (fOnly) {
      ctx.body = {
        list,
        isEnd: true,
      }

      return
    } else {
      userCache.set(path, list)
    }
  }

  const list = userCache.get(path) || []
  const start = ((page || 1) - 1) * 40
  const end = start + 40

  ctx.body = {
    list: list.slice(start, end),
    isEnd: end >= list.length,
  }
}
