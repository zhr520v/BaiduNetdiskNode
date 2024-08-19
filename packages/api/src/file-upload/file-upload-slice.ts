import { AxiosRequestConfig } from 'axios'
import { request } from '../common/request'

interface IQuery {
  access_token: string
  path: string
  partseq: number
  uploadid: string
}

interface IRes {
  md5: string
  request_id: number
}

const __ERR_MAP__: { [key: string]: string } = {
  '31024': '没有申请上传权限',
  '31299': '第一个分片的大小小于4MB',
  '31363': '分片缺失',
  '31364': '超出分片大小限制',
}

export function fileUploadSlice(
  url: string,
  query: IQuery,
  body: Buffer,
  options?: AxiosRequestConfig
) {
  return request<IRes>(
    {
      ...Object.assign({}, options),
      url: url + '/rest/2.0/pcs/superfile2',
      method: 'PUT',
      params: Object.assign(
        {
          method: 'upload',
          type: 'tmpfile',
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
