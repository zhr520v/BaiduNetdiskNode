import { AxiosRequestConfig } from 'axios'
import { IBody, IQuery, httpFileManager } from './file-manager'

export function httpDelete(
  query: Omit<IQuery, 'opera'>,
  body: IBody,
  options?: AxiosRequestConfig
) {
  return httpFileManager(
    Object.assign({}, query, {
      opera: 'delete',
    }),
    body,
    options
  )
}
