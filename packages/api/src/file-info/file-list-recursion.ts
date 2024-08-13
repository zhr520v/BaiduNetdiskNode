import { AxiosRequestConfig } from 'axios'
import request from '../common/request'

export interface IFileListRecursionQuery {
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

export interface IFileListRecursionItem {
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

export interface IFileListRecursionResponse {
  cursor: number
  errmsg: string
  errno: number
  has_more: number
  list: IFileListRecursionItem[]
  request_id: string
}

export function fileListRecursion(
  query: IFileListRecursionQuery,
  options?: AxiosRequestConfig
) {
  return request<IFileListRecursionResponse>({
    ...Object.assign({}, options),
    url: 'https://pan.baidu.com/rest/2.0/xpan/multimedia',
    method: 'GET',
    params: Object.assign(
      {
        method: 'listall',
      },
      query,
      options?.params
    ),
    headers: {
      'User-Agent': 'pan.baidu.com',
    },
  })
}
