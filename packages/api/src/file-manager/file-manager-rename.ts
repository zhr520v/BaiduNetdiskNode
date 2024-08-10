import { AxiosRequestConfig } from 'axios'
import request from '../common/request'

export interface IFileManagerRenameQuery {
  access_token: string
}

export interface IFileManagerRenameBody {
  async: number
  filelist: string
  ondup?: string
}

export interface IFileManagerRenameResponse {
  errno: number
  info: {
    errno: number
    path: string
  }[]
  request_id: number
  taskid?: number
}

export function fileManagerRename(
  query: IFileManagerRenameQuery,
  body: IFileManagerRenameBody,
  options?: AxiosRequestConfig
) {
  const formData = new URLSearchParams()
  const fullBody = Object.assign({}, body, options?.data)

  for (const key in fullBody) {
    formData.append(key, `${fullBody[key]}`)
  }

  return request<IFileManagerRenameResponse>({
    ...Object.assign({}, options),
    url: 'https://pan.baidu.com/rest/2.0/xpan/file',
    method: 'POST',
    params: Object.assign(
      {
        method: 'filemanager',
        opera: 'rename',
      },
      query,
      options?.params
    ),
    data: formData.toString(),
  })
}
