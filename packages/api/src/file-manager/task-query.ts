import { type AxiosRequestConfig } from 'axios'
import { request } from '../common/request.js'

export interface ITaskQueryQuery {
  access_token: string
  taskid: number
}

export interface ITaskQueryRes {
  errno: number
  progress?: number // 进行中时
  status: string // 'running' | 'success' | 'failed'
  task_errno: number
  list?: {
    error_code?: number
    from: string
    from_meta?: {
      isdir: number // 0 | 1
      mtime: string // 秒级时间戳
      size: number // 文件字节数
    }
    ondup?: string
    to: string
    to_meta?: {
      isdir: number
      mtime: number
      size: number
    }
  }[] // 完成时
  total?: number // 完成时
  request_id: number
}

const __ERR_MAP__: { [key: string]: string } = {}

export function httpTaskQuery(inQuery: ITaskQueryQuery, inOpts?: AxiosRequestConfig) {
  return request<ITaskQueryRes>(
    {
      ...Object.assign({}, inOpts),
      url: 'https://pan.baidu.com/share/taskquery',
      method: 'GET',
      params: Object.assign(inQuery, inOpts?.params),
    },
    {
      errMap: __ERR_MAP__,
    }
  )
}
