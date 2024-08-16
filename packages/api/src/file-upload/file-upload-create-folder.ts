import { AxiosRequestConfig } from 'axios'
import request from '../common/request'

export interface IFileUploadCreateFolderQuery {
  access_token: string
}

export interface IFileUploadCreateFolderBody {
  path: string
  local_ctime?: number
  local_mtime?: number
  mode?: number
  rtype?: number
}

export interface IFileUploadCreateFolderResponse {
  category: number
  ctime?: number
  errno?: number
  fs_id?: number
  isdir?: number
  mtime?: number
  name?: string
  path?: string
  status?: number
}

export function fileUploadCreateFolder(
  query: IFileUploadCreateFolderQuery,
  body: IFileUploadCreateFolderBody,
  options?: AxiosRequestConfig
) {
  const formData = new URLSearchParams()
  const fullBody = Object.assign(
    {
      isdir: 1,
    },
    body,
    options?.data
  )

  for (const key in fullBody) {
    formData.append(key, `${fullBody[key]}`)
  }

  return request<IFileUploadCreateFolderResponse>({
    ...Object.assign({}, options),
    url: 'https://pan.baidu.com/rest/2.0/xpan/file',
    method: 'POST',
    params: Object.assign(
      {
        method: 'create',
      },
      query,
      options?.params
    ),
    data: formData.toString(),
  })
}
