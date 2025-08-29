import { type AxiosRequestConfig } from 'axios'
import { request } from '../common/request.js'

export interface IFileManagerQuery {
  access_token: string
  opera: string
}

export interface IFileManagerBody {
  async: number
  filelist: string
  ondup?: string
}

export interface IFileManagerRes {
  errno: number
  info: {
    errno: number
    path: string
  }[]
  request_id: number
  taskid?: number
}

const __ERR_MAP__: { [key: string]: string } = {
  '-7': '文件名非法',
  '-9': '文件不存在',
  '111': '有其他异步任务正在执行',
}

/**
 * when do batch operations, sources can not be same
 * otherwise will get errno 12, 批量转存失败
 */

export function httpFileManager(
  inQuery: IFileManagerQuery,
  inBody: IFileManagerBody,
  inOpts?: AxiosRequestConfig
) {
  const formData = new URLSearchParams()
  const fullBody = Object.assign({}, inBody, inOpts?.data)

  for (const key in fullBody) {
    formData.append(key, `${fullBody[key]}`)
  }

  return request<IFileManagerRes>(
    {
      ...Object.assign({}, inOpts),
      url: 'https://pan.baidu.com/rest/2.0/xpan/file',
      method: 'POST',
      params: Object.assign(
        {
          method: 'filemanager',
        },
        inQuery,
        inOpts?.params
      ),
      data: formData.toString(),
    },
    {
      errMap: __ERR_MAP__,
    }
  )
}
