import { AxiosRequestConfig } from 'axios'
import { IBody, IQuery, httpFileManager } from './file-manager'

export function httpRename(
  inQuery: Omit<IQuery, 'opera'>,
  inBody: IBody,
  inOpts?: AxiosRequestConfig
) {
  return httpFileManager(
    Object.assign({}, inQuery, {
      opera: 'rename',
    }),
    inBody,
    inOpts
  )
}
