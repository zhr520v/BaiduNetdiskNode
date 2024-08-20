import { AxiosRequestConfig } from 'axios'
import { IBody, IQuery, httpFileManager } from './file-manager'

export function httpCopy(
  inQuery: Omit<IQuery, 'opera'>,
  inBody: IBody,
  inOpts?: AxiosRequestConfig
) {
  return httpFileManager(
    Object.assign({}, inQuery, {
      opera: 'copy',
    }),
    inBody,
    inOpts
  )
}
