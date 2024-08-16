import { AxiosRequestConfig } from 'axios'
import request from '../common/request'

export interface IFileManagerQuery {
  access_token: string
  opera: string
}

export interface IFileManagerBody {
  async: number
  filelist: string
  ondup?: string
}

export interface IFileManagerResponse {
  errno: number
  info: {
    errno: number
    path: string
  }[]
  request_id: number
  taskid?: number
}

export function fileManager(
  query: IFileManagerQuery,
  body: IFileManagerBody,
  options?: AxiosRequestConfig
) {
  const formData = new URLSearchParams()
  const fullBody = Object.assign({}, body, options?.data)

  for (const key in fullBody) {
    formData.append(key, `${fullBody[key]}`)
  }

  return request<IFileManagerResponse>({
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
  })
}
