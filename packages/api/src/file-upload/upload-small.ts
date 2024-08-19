import { AxiosRequestConfig } from 'axios'
import { request } from '../common/request'

interface IQuery {
  access_token: string
  path: string
  ondup?: string
}

interface IRes {
  ctime: number
  fs_id: number
  md5: string
  mtime: number
  path: string
  request_id: number
  size: number
}

const __ERR_MAP__: { [key: string]: string } = {
  '31024': '没有申请上传权限',
  '31061': '文件已存在',
  '31064': '上传路径错误',
}

export function fileUploadSmall(
  url: string,
  query: IQuery,
  body: Buffer,
  options?: AxiosRequestConfig
) {
  if (body.length > 4 * 1024 * 1024) {
    throw new Error(
      'fileUploadSmall: buffer size must be <= 4 MB, otherwise use fileUploadId, fileUploadUrl, fileUploadSlice, fileUploadFinish.'
    )
  }

  return request<IRes>(
    {
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
    },
    {
      errMap: __ERR_MAP__,
    }
  )
}
