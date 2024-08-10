import { AxiosRequestConfig } from 'axios'
import request from '../common/request'

export interface IFileManagerComQuery {
  access_token: string
  opera: string
}

export interface IFileManagerComBody {
  async: number
  filelist: string
  ondup?: string
}

export interface IFileManagerComResponse {
  errno: number
  info: {
    errno: number
    path: string
  }[]
  request_id: number
  taskid?: number
}

export function fileManagerCom(
  query: IFileManagerComQuery,
  body: IFileManagerComBody,
  options?: AxiosRequestConfig
) {
  const formData = new URLSearchParams()
  const fullBody = Object.assign({}, body, options?.data)

  for (const key in fullBody) {
    formData.append(key, `${fullBody[key]}`)
  }

  return request<IFileManagerComResponse>({
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
