import { AxiosRequestConfig } from 'axios'
import { request } from '../common/request'

interface IQuery {
  access_token: string
}

interface IBody {
  path: string
  local_ctime?: number
  local_mtime?: number
  mode?: number
  rtype?: number
}

interface IRes {
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

const __ERR_MAP__: { [key: string]: string } = {
  '-7': '文件或目录名错误或无权访问',
  '-8': '文件或目录已存在',
  '-10': '云端容量已满',
}

export function fileUploadCreateFolder(
  query: IQuery,
  body: IBody,
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

  return request<IRes>(
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
