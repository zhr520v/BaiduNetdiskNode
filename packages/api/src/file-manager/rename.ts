import { AxiosRequestConfig } from 'axios'
import { IBody, IQuery, httpFileManager } from './file-manager'

export function httpRename(
  query: Omit<IQuery, 'opera'>,
  body: IBody,
  options?: AxiosRequestConfig
) {
  return httpFileManager(
    Object.assign({}, query, {
      opera: 'rename',
    }),
    body,
    options
  )
}
