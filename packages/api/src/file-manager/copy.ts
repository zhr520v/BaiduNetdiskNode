import type { AxiosRequestConfig } from 'axios'
import { httpFileManager } from './file-manager'
import type { IBody, IQuery } from './file-manager'

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
