import { AxiosRequestConfig } from 'axios'
import request from '../common/request'

export interface IFileManagerDeleteQuery {
  access_token: string
}

export interface IFileManagerDeleteBody {
  async: number
  filelist: string
  ondup?: string
}

export interface IFileManagerDeleteResponse {
  errno: number
  info: {
    errno: number
    path: string
  }[]
  request_id: number
  taskid?: number
}

export function fileManagerDelete(
  query: IFileManagerDeleteQuery,
  body: IFileManagerDeleteBody,
  options?: AxiosRequestConfig
) {
  const formData = new URLSearchParams()
  const fullBody = Object.assign({}, body, options?.data)

  for (const key in fullBody) {
    formData.append(key, `${fullBody[key]}`)
  }

  return request<IFileManagerDeleteResponse>({
    ...Object.assign({}, options),
    url: 'https://pan.baidu.com/rest/2.0/xpan/file',
    method: 'POST',
    params: Object.assign(
      {
        method: 'filemanager',
        opera: 'delete',
      },
      query,
      options?.params
    ),
    data: formData.toString(),
  })
}
