import { AxiosRequestConfig } from 'axios'
import { request } from '../common/request'

export interface IFileUploadFinishQuery {
  access_token: string
}

export interface IFileUploadFinishBody {
  block_list: string
  size: string
  path: string
  uploadid: string
  exif_info?: string
  is_revision?: number
  local_ctime?: string
  local_mtime?: string
  mode?: number
  rtype?: number
  zip_quality?: number
  zip_sign?: number
}

export interface IFileUploadFinishResponse {
  category: number
  ctime: number
  errno: number
  from_type: number
  fs_id: number
  isdir: number
  md5: string
  mtime: number
  name: string
  path: string
  size: number
}

const __ERR_MAP__: { [key: string]: string } = {
  '-7': '文件或目录名错误或无权访问',
  '-8': '文件或目录已存在',
  '-10': '云端容量已满',
  '10': '创建文件失败',
  '31190': '文件不存在',
  '31355': '参数异常',
  '31365': '文件总大小超限',
}

export function fileUploadFinish(
  query: IFileUploadFinishQuery,
  body: IFileUploadFinishBody,
  options?: AxiosRequestConfig
) {
  const formData = new URLSearchParams()
  const fullBody = Object.assign(
    {
      isdir: 0,
    },
    body,
    options?.data
  )

  for (const key in fullBody) {
    formData.append(key, `${fullBody[key]}`)
  }

  return request<IFileUploadFinishResponse>(
    {
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
    },
    {
      errMap: __ERR_MAP__,
    }
  )
}
