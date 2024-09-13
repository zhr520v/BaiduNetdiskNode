import { AxiosRequestConfig } from 'axios'
import { request } from '../common/request'

export interface IQuery {
  access_token: string
  path: string
  uploadid: string
}

export interface IRes {
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

export function httpUploadUrl(inQuery: IQuery, inOpts?: AxiosRequestConfig) {
  return request<IRes>(
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
