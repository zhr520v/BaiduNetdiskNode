# Baidu Netdisk Sdk

基于 baidu-netdisk-api 的再次封装, 提供更加一体化的操作方式。

<p style="background: #F0F099; padding: 10px; border-left: 3px solid #B5B588; color: #FF0000;">本项目属于 PureESM, 只能使用 ES Import 导入.</p>

## 安装

```
pnpm add baidu-netdisk-sdk
```

## 使用方法

```typescript
import { Netdisk } from 'baidu-netdisk-sdk'

const netdisk = new Netdisk({
  access_token: '',
  app_name: '开发者申请的 app_name',
})

const uploadData = await netdisk.upload({
  local: '本地文件路径',
  remote: '网盘文件路径',
  encrypt: '加密文本',
})
```

## 项目测试

```
git clone https://github.com/keenghost/BaiduNetdiskNode.git BaiduNetdiskNode
cd BaiduNetdiskNode && pnpm i
touch packages/sdk/tmp/test.config.json // 填写自己的 access_token 和 app_name
pnpm test sdk
```

## 方法列表

- #### static getCodeUrl(options)

  获取授权链接, 跳转到该链接可进行授权, 获取授权码.

- #### static async code2Token(options)

  将授权码转换为 access_token 和 refresh_token.

- #### static async refreshToken(options)

  用 refresh_token 获取新的 access_token 和 refresh_token.

- #### async getUserInfo()

  获取用户信息, 包括基本信息和网盘信息.

- #### async getFileList(options)

  获取网盘文件列表.

- #### async getFileListRecursion(options)

  递归获取网盘文件列表, 递归模式需手动设置 recursion 参数为 1.

- #### async getFileInfo(options)

  获取文件信息, 可批量获取.

- #### async createFolder(options)

  创建文件夹.

- #### async copyFolderOrFile(options)

  复制单个文件夹或文件.

- #### async copyFoldersOrFiles(options)

  复制多个文件夹或文件.

- #### async moveFolderOrFile(options)

  移动单个文件夹或文件.

- #### async moveFoldersOrFiles(options)

  移动多个文件夹或文件.

- #### async renameFolderOrFile(options)

  重命名单个文件夹或文件.

- #### async renameFoldersOrFiles(options)

  重命名多个文件夹或文件.

- #### async deleteFolderOrFile(options)

  删除单个文件夹或文件.

- #### async deleteFoldersOrFiles(options)

  删除多个文件夹或文件.

- #### async upload(options)

  上传单个文件. 使用 Promise 一次性状态.

- #### uploadTask(options)

  上传单个文件. 返回上传任务, 可进一步控制.

- #### async download(options)

  下载单个文件. 使用 Promise 一次性状态.

- #### downloadTask(options)

  下载单个文件. 返回下载任务, 可进一步控制.

- #### updateAccessToken(options)

  更新 Netdisk 实例的 access_token.
