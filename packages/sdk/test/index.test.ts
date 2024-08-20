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

runTest()
