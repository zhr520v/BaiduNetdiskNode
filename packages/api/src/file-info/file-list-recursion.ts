import type { AxiosRequestConfig } from 'axios'
import { request } from '../common/request'

export interface IQuery {
  access_token: string
  path: string
  ctime?: number
  desc?: number
  device_id?: string
  limit?: number
  mtime?: number
  order?: string
  recursion?: number
  start?: number
  web?: number
}

export interface IItem {
  category: number
  fs_id: number
  isdir: number
  local_ctime: number
  local_mtime: number
  md5: string
  path: string
  server_ctime: number
  server_filename: string
  server_mtime: number
  size: number
  thumbs?: {
    icon: string
    url1: string
    url2: string
    url3: string
    url4: string
  }
}

export interface IRes {
  cursor: number
  errmsg: string
  errno: number
  has_more: number
  list: IItem[]
  request_id: string
}

const __ERR_MAP__: { [key: string]: string } = {
  '31034': '命中频控,listall接口的请求频率建议不超过每分钟8-10次',
  '31066': '文件不存在',
  '42213': '没有共享目录的权限',
}

export function httpFileListRecursion(inQuery: IQuery, inOpts?: AxiosRequestConfig) {
  return request<IRes>(
    {
      ...Object.assign({}, inOpts),
      url: 'https://pan.baidu.com/rest/2.0/xpan/multimedia',
      method: 'GET',
      params: Object.assign(
        {
          method: 'listall',
        },
        inQuery,
        inOpts?.params
      ),
      headers: {
        'User-Agent': 'pan.baidu.com',
      },
    },
    {
      errMap: __ERR_MAP__,
    }
  )
}
