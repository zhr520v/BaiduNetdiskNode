import { AxiosRequestConfig } from 'axios'
import { request } from '../common/request'

export interface IQuery {
  access_token: string
  desc?: number
  dir?: string
  folder?: number
  limit?: number
  order?: string
  showempty?: number
  start?: number
  web?: number
}

export interface IItem {
  category: number
  extent_tinyint7: number
  from_type: number
  fs_id: number
  isdir: number
  local_ctime: number
  local_mtime: number
  oper_id: number
  owner_id: number
  owner_type: number
  path: string
  pl: number
  real_category: string
  server_atime: number
  server_ctime: number
  server_filename: string
  server_mtime: number
  share: number
  size: number
  tkbind_id: number
  unlist: number
  wpfile: number
  dir_empty?: number
  empty?: number
  md5?: string
  thumbs?: {
    icon: string
    url1: string
    url2: string
    url3: string
  }
}

export interface IRes {
  errno: number
  guid: number
  guid_info: string
  list: IItem[]
  request_id: number
}

const __ERR_MAP__: { [key: string]: string } = {
  '-7': '文件或目录无权访问',
  '-9': '文件或目录不存在',
}

export function httpFileList(inQuery: IQuery, inOpts?: AxiosRequestConfig) {
  return request<IRes>(
    {
      ...Object.assign({}, inOpts),
      url: 'https://pan.baidu.com/rest/2.0/xpan/file',
      method: 'GET',
      params: Object.assign(
        {
          method: 'list',
        },
        inQuery,
        inOpts?.params
      ),
    },
    {
      errMap: __ERR_MAP__,
    }
  )
}
