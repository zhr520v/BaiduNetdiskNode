# Baidu Netdisk Sdk

基于 baidu-netdisk-api 的再次封装，提供更加一体化的操作方式，支持多线程。

<p style="background: #E6F2FF; padding: 10px; border-left: 6px solid #3B82F6; color: #0F172A;">⚠️ 本项目属于 PureESM, 只能使用 ES Import 导入</p>

## 安装

```
pnpm add baidu-netdisk-sdk
```

## 使用方法

```typescript
import { Netdisk } from 'baidu-netdisk-sdk'

// 创建实例
const netdisk = new Netdisk({
  access_token: '你的access_token',
  app_name: '开发者申请的 app_name',
  threads: 3, // 设置并行线程数，默认为1
})

// 上传文件示例
const uploadData = await netdisk.upload({
  local: '本地文件路径',
  remote: '网盘文件路径',
  encrypt: '加密文本', // 可选
  threads: 2, // 可针对单次上传覆盖全局线程设置
})

// 下载文件示例
const downloadData = await netdisk.download({
  remote: '网盘文件路径',
  local: '本地保存路径',
  decrypt: '解密文本', // 可选
  threads: 3, // 可针对单次下载覆盖全局线程设置
})
```

## 项目测试

```
git clone https://github.com/keenghost/BaiduNetdiskNode.git BaiduNetdiskNode
cd BaiduNetdiskNode && pnpm i
touch packages/sdk/tmp/test.config.json // 填写自己的 access_token 和 app_name
pnpm test sdk
```

## API 列表

### 授权相关

- #### static getCodeUrl(options)

  获取授权链接，跳转到该链接可进行授权，获取授权码。

  - **Parameters**:
    ```typescript
    {
      client_id: string  // 应用的API Key，开发者中心获取
      redirect_uri: string  // 回调URI，需与应用注册的回调地址一致
      scope?: string  // 授权权限范围，默认为"basic,netdisk"
    }
    ```
  - **Response**: `string` - 授权链接

- #### static async code2Token(options)

  将授权码转换为 access_token 和 refresh_token。

  - **Parameters**:
    ```typescript
    {
      code: string // 授权码，用户授权后获得
      client_id: string // 应用的API Key
      client_secret: string // 应用的Secret Key
      redirect_uri: string // 回调URI，需与申请code时一致
    }
    ```
  - **Response**:
    ```typescript
    {
      access_token: string // 访问令牌
      refresh_token: string // 刷新令牌
      expires_in: number // 过期时间(秒)，一般为30天
      scope: string // 授权权限范围
    }
    ```

- #### static async refreshToken(options)

  用 refresh_token 获取新的 access_token 和 refresh_token。

  - **Parameters**:
    ```typescript
    {
      refresh_token: string // 刷新令牌
      client_id: string // 应用的API Key
      client_secret: string // 应用的Secret Key
    }
    ```
  - **Response**:
    ```typescript
    {
      access_token: string // 新的访问令牌
      refresh_token: string // 新的刷新令牌
      expires_in: number // 过期时间(秒)
      scope: string // 授权权限范围
    }
    ```

### 用户信息

- #### async getUserInfo()

  获取用户信息，包括基本信息和网盘空间使用情况。

  - **Response**:
    ```typescript
    {
      baidu_name: string // 百度用户名
      netdisk_name: string // 网盘用户名
      avatar_url: string // 头像URL
      vip_type: number // VIP类型，0:普通用户，1:普通会员，2:超级会员
      uk: number // 用户ID，网盘用户唯一标识
      total: number // 总空间大小(字节)
      used: number // 已使用空间大小(字节)
      free: number // 剩余空间大小(字节)
    }
    ```

### 文件管理

- #### async getFileList(options)

  获取网盘文件列表，支持分页获取。

  - **Parameters**:
    ```typescript
    {
      dir: string  // 目录路径，以 / 开头的绝对路径
      order?: string  // 排序字段，time:修改时间，name:文件名，size:文件大小
      desc?: number  // 排序方式，0:升序，1:降序
      start?: number  // 起始位置，从0开始
      limit?: number  // 获取数量，默认1000
      web?: string  // 是否获取web端显示缩略图地址，"1":是
    }
    ```
  - **Response**:
    ```typescript
    {
      list: Array<{
        fs_id: number // 文件ID
        path: string // 文件路径
        server_filename: string // 文件名
        size: number // 文件大小(字节)
        server_mtime: number // 服务器修改时间
        server_ctime: number // 服务器创建时间
        local_mtime: number // 本地修改时间
        local_ctime: number // 本地创建时间
        isdir: number // 是否为目录，0:文件，1:目录
        category: number // 文件类型
        md5: string // 文件MD5值(文件夹为空)
      }>
      has_more: number // 是否有更多文件，0:否，1:是
    }
    ```

- #### async getFileListRecursion(options)

  递归获取网盘文件列表，可一次性获取所有子文件。

  - **Parameters**:
    ```typescript
    {
      path: string  // 目录路径，以 / 开头的绝对路径
      recursion?: number  // 是否递归获取所有子目录文件，0:否，1:是
      web?: string  // 是否获取web端显示缩略图地址，"1":是
    }
    ```
  - **Response**: 同 getFileList

- #### async getFileInfo(options)

  获取文件信息，可批量获取。

  - **Parameters**:
    ```typescript
    {
      fsids: number[] | number  // 文件ID列表或单个文件ID
      thumb?: number  // 是否需要缩略图，0:不需要，1:需要
      dlink?: number  // 是否需要下载链接，0:不需要，1:需要
    }
    ```
  - **Response**:
    ```typescript
    {
      list: Array<{
        fs_id: number // 文件ID
        path: string // 文件路径
        server_filename: string // 文件名
        size: number // 文件大小(字节)
        server_mtime: number // 服务器修改时间
        server_ctime: number // 服务器创建时间
        local_mtime: number // 本地修改时间
        local_ctime: number // 本地创建时间
        isdir: number // 是否为目录，0:文件，1:目录
        category: number // 文件类型
        md5: string // 文件MD5值
        thumbs?: {
          // 缩略图信息(仅当thumb=1时返回)
          icon: string // 缩略图地址
          url1: string // 小图地址
          url2: string // 中图地址
          url3: string // 大图地址
        }
        dlink?: string // 下载链接(仅当dlink=1时返回)
      }>
    }
    ```

- #### async createFolder(options)

  创建文件夹，支持递归创建。

  - **Parameters**:
    ```typescript
    {
      path: string  // 文件夹路径，以 / 开头的绝对路径
      rtype?: number  // 冲突处理类型，0:不覆盖(默认)，1:覆盖同名文件，2:自动重命名，3:覆盖同名目录
    }
    ```
  - **Response**:
    ```typescript
    {
      fs_id: number // 文件夹ID
      path: string // 文件夹路径
      ctime: number // 创建时间，UNIX时间戳
      mtime: number // 修改时间，UNIX时间戳
      isdir: number // 固定为1
    }
    ```

- #### async copyFolderOrFile(options)

  复制单个文件夹或文件。

  - **Parameters**:
    ```typescript
    {
      from: string  // 源文件路径
      to: string  // 目标目录
      newname?: string  // 新文件名，默认使用原文件名
      ondup?: string  // 重名处理策略，fail:报错，newcopy:重命名，overwrite:覆盖
      async?: number  // 是否异步执行，0:同步，1:异步
    }
    ```
  - **Response**:
    ```typescript
    {
      taskid?: number  // 异步任务ID(仅async=1时返回)
      info?: Array<{  // 操作结果(仅async=0时返回)
        errno: number  // 错误码，0表示成功
        path: string  // 文件路径
      }>
    }
    ```

- #### async copyFoldersOrFiles(options)

  复制多个文件夹或文件。

  - **Parameters**:
    ```typescript
    {
      list: Array<{
        from: string  // 源文件路径
        to: string  // 目标目录
        newname?: string  // 新文件名
      }>
      ondup?: string  // 重名处理策略
      async?: number  // 是否异步执行
    }
    ```
  - **Response**: 同 copyFolderOrFile

- #### async moveFolderOrFile(options)

  移动单个文件夹或文件。

  - **Parameters**: 同 copyFolderOrFile
  - **Response**: 同 copyFolderOrFile

- #### async moveFoldersOrFiles(options)

  移动多个文件夹或文件。

  - **Parameters**: 同 copyFoldersOrFiles
  - **Response**: 同 copyFolderOrFile

- #### async renameFolderOrFile(options)

  重命名单个文件夹或文件。

  - **Parameters**:
    ```typescript
    {
      path: string  // 文件路径
      newname: string  // 新文件名
      async?: number  // 是否异步执行
    }
    ```
  - **Response**: 同 copyFolderOrFile

- #### async renameFoldersOrFiles(options)

  重命名多个文件夹或文件。

  - **Parameters**:
    ```typescript
    {
      list: Array<{
        path: string  // 文件路径
        newname: string  // 新文件名
      }>
      async?: number  // 是否异步执行
    }
    ```
  - **Response**: 同 copyFolderOrFile

- #### async deleteFolderOrFile(options)

  删除单个文件夹或文件。

  - **Parameters**:
    ```typescript
    {
      path: string  // 文件路径
      async?: number  // 是否异步执行
    }
    ```
  - **Response**: 同 copyFolderOrFile

- #### async deleteFoldersOrFiles(options)

  删除多个文件夹或文件。

  - **Parameters**:
    ```typescript
    {
      list: Array<string>  // 文件路径列表
      async?: number  // 是否异步执行
    }
    ```
  - **Response**: 同 copyFolderOrFile

### 文件上传与下载

- #### async upload(options)

  上传单个文件。使用 Promise 一次性返回状态。

  - **Parameters**:
    ```typescript
    {
      local: string  // 本地文件路径
      remote: string  // 网盘文件路径，以 / 开头的绝对路径
      encrypt?: string  // 加密文本，可选
      ondup?: string  // 重名处理策略
      rtype?: number  // 冲突处理类型
    }
    ```
  - **Response**: 上传成功后的文件信息

- #### uploadTask(options)

  上传单个文件。返回上传任务，可进一步控制。

  - **Parameters**: 同 upload
  - **Response**: 上传任务对象，包含控制方法和事件

- #### async download(options)

  下载单个文件。使用 Promise 一次性返回状态。

  - **Parameters**:
    ```typescript
    {
      remote: string  // 网盘文件路径
      local: string  // 本地保存路径
      decrypt?: string  // 解密文本，可选
    }
    ```
  - **Response**: 下载成功后的文件信息

- #### downloadTask(options)

  下载单个文件。返回下载任务，可进一步控制。

  - **Parameters**: 同 download
  - **Response**: 下载任务对象，包含控制方法和事件

### 其他

- #### updateAccessToken(options)

  更新 Netdisk 实例的 access_token。

  - **Parameters**:
    ```typescript
    {
      access_token: string // 新的访问令牌
    }
    ```
  - **Response**: void
