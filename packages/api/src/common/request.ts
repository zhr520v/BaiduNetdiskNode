import axios, { type AxiosRequestConfig } from 'axios'
import { type IBaiduApiError } from '../../types.js'

const __ERR_MAP__: { [key: string]: string } = {
  '-1': '权益已过期',
  '-3': '文件不存在',
  '-6': '身份验证失败',
  '-7': '文件或目录名错误或无权访问',
  '-8': '文件或目录已存在',
  '-9': '文件或目录不存在',
  '2': '参数错误',
  '6': '不允许接入用户数据',
  '10': '转存文件已经存在',
  '11': '用户不存在(uid不存在)',
  '12': '批量转存出错',
  '111': '有其他异步任务正在执行',
  '133': '播放广告',
  '255': '转存数量太多',
  '2131': '该分享不存在',
  '31023': '参数错误',
  '31024': '没有访问权限',
  '31034': '命中接口频控',
  '31045': 'access_token验证未通过',
  '31061': '文件已存在',
  '31062': '文件名无效',
  '31064': '上传路径错误',
  '31066': '文件名不存在',
  '31190': '文件不存在',
  '31299': '第一个分片的大小小于4MB',
  '31301': '非音视频文件',
  '31304': '视频格式不支持播放',
  '31326': '命中防盗链',
  '31338': '当前视频码率太高暂不支持流畅播放',
  '31339': '非法媒体文件',
  '31341': '视频正在转码',
  '31346': '视频转码失败',
  '31347': '当前视频太长，暂不支持在线播放',
  '31355': '参数异常',
  '31360': 'url过期',
  '31362': '签名错误',
  '31363': '分片缺失',
  '31364': '超出分片大小限制',
  '31365': '文件总大小超限',
  '31649': '字幕不存在',
  '42202': '文件个数超过相册容量上限',
  '42203': '相册不存在',
  '42210': '部分文件添加失败',
  '42211': '获取图片分辨率失败',
  '42212': '共享目录文件上传者信息查询失败',
  '42213': '共享目录鉴权失败',
  '42214': '获取文件详情失败',
  '42905': '查询用户名失败',
  '50002': '播单id不存在',
}

export async function request<T>(
  inAxiosConf: AxiosRequestConfig,
  inRestConf: {
    errMap: { [key: string]: string }
  }
) {
  try {
    const res = await axios.request<T>(inAxiosConf)
    const data = res.data as { errno?: number; errmsg?: string }

    if (typeof data === 'object' && data && data.errno) {
      const errmsg =
        data.errmsg ||
        inRestConf.errMap[`${data.errno}`] ||
        __ERR_MAP__[`${data.errno}`] ||
        'none'

      const customErr = new Error(`errno: ${data.errno}, errmsg: ${errmsg}`) as IBaiduApiError
      customErr.errno = data.errno
      customErr.errmsg = errmsg
      customErr.res_data = data
      customErr.active = true

      throw customErr
    }

    return res
  } catch (inError) {
    const err = inError as IBaiduApiError & {
      response?: { data: { errno: number; errmsg: string } }
    }

    if (err.active) {
      throw inError
    }

    if (typeof err.response === 'object' && typeof err.response.data === 'object') {
      const res_data = err.response.data
      const errmsg =
        res_data.errmsg ||
        inRestConf.errMap[`${res_data.errno}`] ||
        __ERR_MAP__[`${res_data.errno}`] ||
        err.message ||
        'none'

      const newErr = new Error(`errno: ${res_data.errno}, errmsg: ${errmsg}`) as IBaiduApiError
      newErr.errno = res_data.errno
      newErr.errmsg = errmsg
      newErr.res_data = res_data
      newErr.active = true

      throw newErr
    }

    throw inError
  }
}
