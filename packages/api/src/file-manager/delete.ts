import { AxiosRequestConfig } from 'axios'
import { IBody, IQuery, httpFileManager } from './file-manager'

export function httpDelete(
  inQuery: Omit<IQuery, 'opera'>,
  inBody: IBody,
  inOpts?: AxiosRequestConfig
) {
  return httpFileManager(
    Object.assign({}, inQuery, {
      opera: 'delete',
    }),
    inBody,
    inOpts
  )
}
