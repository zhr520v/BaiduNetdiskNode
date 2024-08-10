import { AxiosRequestConfig } from 'axios'
import request from '../common/request'

export interface IFileManagerMoveQuery {
  access_token: string
}

export interface IFileManagerMoveBody {
  async: number
  filelist: string
  ondup?: string
}

export interface IFileManagerMoveResponse {
  errno: number
  info: {
    errno: number
    path: string
  }[]
  request_id: number
  taskid?: number
}

export function fileManagerMove(
  query: IFileManagerMoveQuery,
  body: IFileManagerMoveBody,
  options?: AxiosRequestConfig
) {
  const formData = new URLSearchParams()
  const fullBody = Object.assign({}, body, options?.data)

  for (const key in fullBody) {
    formData.append(key, `${fullBody[key]}`)
  }

  return request<IFileManagerMoveResponse>({
    ...Object.assign({}, options),
    url: 'https://pan.baidu.com/rest/2.0/xpan/file',
    method: 'POST',
    params: Object.assign(
      {
        method: 'filemanager',
        opera: 'move',
      },
      query,
      options?.params
    ),
    data: formData.toString(),
  })
}
