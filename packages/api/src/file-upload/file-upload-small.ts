import { AxiosRequestConfig } from 'axios'
import request from '../common/request'

export interface IFileUploadSmallQuery {
  access_token: string
  path: string
  ondup?: string
}

export interface IFileUploadSmallResponse {
  ctime: number
  fs_id: number
  md5: string
  mtime: number
  path: string
  request_id: number
  size: number
}

export function fileUploadSmall(
  url: string,
  query: IFileUploadSmallQuery,
  body: Buffer,
  options?: AxiosRequestConfig
) {
  if (body.length > 4 * 1024 * 1024) {
    throw new Error(
      'fileUploadSmall: buffer size must be <= 4 MB, otherwise use fileUploadId, fileUploadUrl, fileUploadSlice, fileUploadFinish.'
    )
  }

  return request<IFileUploadSmallResponse>({
    ...Object.assign({}, options),
    url: url + '/rest/2.0/pcs/file',
    method: 'PUT',
    params: Object.assign(
      {
        method: 'upload',
      },
      query,
      options?.params
    ),
    data: body,
  })
}
