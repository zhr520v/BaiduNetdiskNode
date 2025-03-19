import { config } from '../main/config.js'
import { type IContext, type IHttpConfigRes } from '../types/http.js'

export default async (ctx: IContext<IHttpConfigRes>) => {
  ctx.body = {
    tryTimes: config.get('tryTimes', true),
    tryDelta: config.get('tryDelta', true),
    maxUploadTasks: config.get('maxUploadTasks', true),
    maxDownloadTasks: config.get('maxDownloadTasks', true),
    maxFailedTasks: config.get('maxFailedTasks', true),
    uploadThreads: config.get('uploadThreads', true),
    downloadThreads: config.get('downloadThreads', true),
    noVerifyUpload: config.get('noVerifyUpload', true),
    noVerifyDownload: config.get('noVerifyDownload', true),
    noVerifyDownloadOnDisk: config.get('noVerifyDownloadOnDisk', true),
    downloadLocation: config.get('downloadLocation', true),
    username: config.get('username', true),
    password: config.get('password', true),
    port: config.get('port', true),
    token_secret: config.get('token_secret', true),
  }
}
