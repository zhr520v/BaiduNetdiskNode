import { AxiosRequestConfig } from 'axios'
import { request } from '../common/request'

export interface IQuery {
  access_token: string
  opera: string
}

export interface IBody {
  async: number
  filelist: string
  ondup?: string
}

export interface IRes {
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

export function httpFileManager(query: IQuery, body: IBody, options?: AxiosRequestConfig) {
  const formData = new URLSearchParams()
  const fullBody = Object.assign({}, body, options?.data)

  for (const key in fullBody) {
    formData.append(key, `${fullBody[key]}`)
  }

  return request<IRes>(
    {
      ...Object.assign({}, options),
      url: 'https://pan.baidu.com/rest/2.0/xpan/file',
      method: 'POST',
      params: Object.assign(
        {
          method: 'filemanager',
        },
        query,
        options?.params
      ),
      data: formData.toString(),
    },
    {
      errMap: __ERR_MAP__,
    }
  )
}
