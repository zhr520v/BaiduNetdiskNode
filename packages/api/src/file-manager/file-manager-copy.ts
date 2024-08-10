import { AxiosRequestConfig } from 'axios'
import request from '../common/request'

export interface IFileManagerCopyQuery {
  access_token: string
}

export interface IFileManagerCopyBody {
  async: number
  filelist: string
  ondup?: string
}

export interface IFileManagerCopyResponse {
  errno: number
  info: {
    errno: number
    path: string
  }[]
  request_id: number
  taskid?: number
}

export function fileManagerCopy(
  query: IFileManagerCopyQuery,
  body: IFileManagerCopyBody,
  options?: AxiosRequestConfig
) {
  const formData = new URLSearchParams()
  const fullBody = Object.assign({}, body, options?.data)

  for (const key in fullBody) {
    formData.append(key, `${fullBody[key]}`)
  }

  return request<IFileManagerCopyResponse>({
    ...Object.assign({}, options),
    url: 'https://pan.baidu.com/rest/2.0/xpan/file',
    method: 'POST',
    params: Object.assign(
      {
        method: 'filemanager',
        opera: 'copy',
      },
      query,
      options?.params
    ),
    data: formData.toString(),
  })
}
