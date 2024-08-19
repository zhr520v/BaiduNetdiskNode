import { AxiosRequestConfig } from 'axios'
import { request } from '../common/request'

export interface IFileInfoQuery {
  access_token: string
  fsids: string
  detail?: number
  dlink?: number
  extra?: number
  needmedia?: number
  path?: string
  thumb?: number
}

export interface IFileInfoItem {
  category: number
  filename: string
  fs_id: number
  isdir: number
  local_ctime: number
  local_mtime: number
  md5: string
  oper_id: number
  path: string
  server_ctime: number
  server_mtime: number
  size: number
  date_taken?: number
  dlink?: string
  duration?: number
  height?: number
  media_info?: {
    channels: number
    duration: number
    duration_ms: number
    extra_info: string
    file_size: string
    frame_rate: number
    height: number
    meta_info: string
    resolution: string
    rotate: number
    sample_rate: number
    use_segment: number
    width: number
  }
  orientation?: string
  thumbs?: {
    icon: string
    url1: string
    url2: string
    url3: string
    url4: string
  }
  width?: number
}

export interface IFileInfoResponse {
  errmsg: string
  errno: number
  list: IFileInfoItem[]
  names: {}
  request_id: string
}

const __ERR_MAP__: { [key: string]: string } = {
  '42211': '图片详细信息查询失败',
  '42212': '共享目录文件上传者信息查询失败，可重试',
  '42213': '共享目录鉴权失败',
  '42214': '文件基础信息查询失败',
}

export function fileInfo(query: IFileInfoQuery, options?: AxiosRequestConfig) {
  return request<IFileInfoResponse>(
    {
      ...Object.assign({}, options),
      url: 'https://pan.baidu.com/rest/2.0/xpan/multimedia',
      method: 'GET',
      params: Object.assign(
        {
          method: 'filemetas',
        },
        query,
        options?.params
      ),
    },
    {
      errMap: __ERR_MAP__,
    }
  )
}
