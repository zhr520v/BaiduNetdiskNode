import fsExt from 'fs-extra'
import { expect, it, runTest } from '../../../utils/test-suite'
import Netdisk from '../index'

/**
 * test.config.json
 * {
 *   "app_name": "string",
 *   "access_token": "string"
 * }
 */
const config: {
  app_name: string
  access_token: string
} = JSON.parse(fsExt.readFileSync('tmp/test.config.json', 'utf8'))

const netdisk = new Netdisk({
  app_name: config.app_name,
  access_token: config.access_token,
})

it('CreateFolder', async () => {
  const data = await netdisk.createFolder({
    path: `/apps/${config.app_name}/BaiduNetdiskSdkTest`,
    opts: {
      verifyExists: true,
    },
  })

  expect(data).toHaveProperties('category')
})

it('GetUserInfo', async () => {
  const data = await netdisk.getUserInfo()

  expect(data).toHaveProperties(
    'avatar_url',
    'baidu_name',
    'expire',
    'free',
    'netdisk_name',
    'total',
    'uk',
    'used',
    'vip_type'
  )

  expect(data.netdisk_name).toBeTruthy()
})

it('GetFileList', async () => {
  const data = await netdisk.getFileList({
    dir: '/',
  })

  expect(data.length).toBeGreaterThan(0)

  for (const item of data) {
    expect(item).toHaveProperties(
      'category',
      'fs_id',
      'isdir',
      'local_ctime',
      'local_mtime',
      'path',
      'server_ctime',
      'server_filename',
      'server_mtime',
      'size'
    )
  }
})

it('GetFileListRecursion', async () => {
  const data = await netdisk.getFileListRecursion({
    path: '/apps',
    opts: {
      recursion: 1,
      infinite: true,
    },
  })

  expect(data.length).toBeGreaterThan(0)

  for (const item of data) {
    expect(item).toHaveProperties(
      'category',
      'fs_id',
      'isdir',
      'local_ctime',
      'local_mtime',
      'md5',
      'server_ctime',
      'server_mtime',
      'size'
    )
  }
})

runTest()
