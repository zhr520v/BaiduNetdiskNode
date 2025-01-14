import { type AxiosRequestConfig } from 'axios'
import { request } from '../common/request.js'

export interface IUploadSliceQuery {
  access_token: string
  path: string
  partseq: number
  uploadid: string
}

export interface IUploadSliceRes {
  md5: string
  request_id: number
}

const __ERR_MAP__: { [key: string]: string } = {
  '31024': '没有申请上传权限',
  '31299': '第一个分片的大小小于4MB',
  '31363': '分片缺失',
  '31364': '超出分片大小限制',
}

export function httpUploadSlice(
  inUrl: string,
  inQuery: IUploadSliceQuery,
  inBody: Buffer,
  inOpts?: AxiosRequestConfig
) {
  return request<IUploadSliceRes>(
    {
      ...Object.assign({}, inOpts),
      url: inUrl + '/rest/2.0/pcs/superfile2',
      method: 'PUT',
      params: Object.assign(
        {
          method: 'upload',
          type: 'tmpfile',
        },
        inQuery,
        inOpts?.params
      ),
      data: inBody,
    },
    {
      errMap: __ERR_MAP__,
    }
  )
}
