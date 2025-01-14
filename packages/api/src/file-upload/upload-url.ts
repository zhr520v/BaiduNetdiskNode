import { type AxiosRequestConfig } from 'axios'
import { request } from '../common/request.js'

export interface IUploadUrlQuery {
  access_token: string
  path: string
  uploadid: string
}

export interface IUploadUrlRes {
  bak_server: string[]
  bak_servers: { server: string }[]
  client_ip: string
  error_code: number
  error_msg: string
  expire: number
  host: string
  newno: string
  quic_server: string[]
  quic_servers: { server: string }[]
  request_id: number
  server: string[]
  server_time: number
  servers: { server: string }[]
  sl: number
}

const __ERR_MAP__: { [key: string]: string } = {}

export function httpUploadUrl(inQuery: IUploadUrlQuery, inOpts?: AxiosRequestConfig) {
  return request<IUploadUrlRes>(
    {
      ...Object.assign({}, inOpts),
      url: 'https://d.pcs.baidu.com/rest/2.0/pcs/file',
      method: 'GET',
      params: Object.assign(
        {
          method: 'locateupload',
          appid: 250528,
          upload_version: '2.0',
        },
        inQuery,
        inOpts?.params
      ),
    },
    {
      errMap: __ERR_MAP__,
    }
  )
}
