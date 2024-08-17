import { AxiosRequestConfig } from 'axios'
import request from '../common/request'

export interface IFileUploadIdQuery {
  access_token: string
}

export interface IFileUploadIdBody {
  block_list: string
  path: string
  size: number
  'content-md5'?: string
  local_ctime?: string
  local_mtime?: string
  rtype?: number
  'slice-md5'?: string
  uploadid?: string
}

export interface IFileUploadIdResponse {
  block_list: number[]
  errno: number
  request_id: number
  return_type: number
  uploadid: string
}

const __ERR_MAP__: { [key: string]: string } = {
  '-7': '文件或目录名错误或无权访问',
  '-10': '容量不足',
}

export function fileUploadId(
  query: IFileUploadIdQuery,
  body: IFileUploadIdBody,
  options?: AxiosRequestConfig
) {
  const formData = new URLSearchParams()
  const fullBody = Object.assign(
    {
      autoinit: 1,
      isdir: 0,
    },
    body,
    options?.data
  )

  for (const key in fullBody) {
    formData.append(key, `${fullBody[key]}`)
  }

  return request<IFileUploadIdResponse>(
    {
      ...Object.assign({}, options),
      url: 'https://pan.baidu.com/rest/2.0/xpan/file',
      method: 'POST',
      params: Object.assign(
        {
          method: 'precreate',
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
