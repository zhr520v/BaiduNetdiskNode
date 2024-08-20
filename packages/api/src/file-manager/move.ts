import { AxiosRequestConfig } from 'axios'
import { IBody, IQuery, httpFileManager } from './file-manager'

export function httpMove(
  inQuery: Omit<IQuery, 'opera'>,
  inBody: IBody,
  inOpts?: AxiosRequestConfig
) {
  return httpFileManager(
    Object.assign({}, inQuery, {
      opera: 'move',
    }),
    inBody,
    inOpts
  )
}
