import { httpUploadUrl } from 'baidu-netdisk-api'

const __CACHED_HOURS__ = 6

const __CACHED_INFOS__ = {
  url: '',
  date: 0,
}

async function fetchUploadUrl(inOpts: {
  access_token: string
  path: string
  uploadid: string
}) {
  const { data } = await httpUploadUrl(inOpts)

  const target = data.servers.find(item => /^https/.test(item.server))

  if (!target) {
    throw new Error('httpUploadUrl returns none https server address')
  }

  return target.server
}

export async function getUploadUrl(inOpts?: {
  access_token: string
  path: string
  uploadid: string
}) {
  if (Date.now() - __CACHED_INFOS__.date < __CACHED_HOURS__ * 3600 * 1000) {
    return __CACHED_INFOS__.url
  }

  inOpts = inOpts || { access_token: '', path: '', uploadid: '' }
  __CACHED_INFOS__.url = await fetchUploadUrl(inOpts)
  __CACHED_INFOS__.date = Date.now()

  return __CACHED_INFOS__.url
}
