import { AxiosRequestConfig } from 'axios'
import { request } from '../common/request'

interface IQuery {
  access_token: string
}

interface IBody {
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

interface IRes {
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

export function httpUploadId(inQuery: IQuery, inBody: IBody, inOpts?: AxiosRequestConfig) {
  const formData = new URLSearchParams()
  const fullBody = Object.assign(
    {
      autoinit: 1,
      isdir: 0,
    },
    inBody,
    inOpts?.data
  )

  for (const key in fullBody) {
    formData.append(key, `${fullBody[key]}`)
  }

  return request<IRes>(
    {
      ...Object.assign({}, inOpts),
      url: 'https://pan.baidu.com/rest/2.0/xpan/file',
      method: 'POST',
      params: Object.assign(
        {
          method: 'precreate',
        },
        inQuery,
        inOpts?.params
      ),
      data: formData.toString(),
    },
    {
      errMap: __ERR_MAP__,
    }
  )
}
