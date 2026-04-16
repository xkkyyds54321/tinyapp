# 开发环境配置指南

## 前置要求

- 微信开发者工具 ≥ 1.06
- Node.js ≥ 16（用于本地调试云函数）
- 微信小程序账号（已开通云开发）
- 腾讯云账号（用于 COS）

---

## 步骤 1：克隆项目

```bash
git clone <your-repo-url>
cd tiny_app
```

## 步骤 2：导入微信开发者工具

1. 打开微信开发者工具
2. 「导入项目」→ 选择 `tiny_app` 根目录
3. 填入 AppID（测试号也可以用于开发）
4. 勾选「使用云开发」

## 步骤 3：修改环境配置

编辑 `miniprogram/config/env.js`，填入你的云开发环境 ID 和 COS 配置：

```js
dev: {
  ENV_ID: 'your-env-id-here',
  COS_BUCKET: 'your-bucket-name-1234567890',
  COS_REGION: 'ap-guangzhou',
  SIGN_URL_EXPIRE_SECONDS: 600
}
```

## 步骤 4：配置云函数环境变量

在微信云开发控制台 → 云函数，为 `photos`、`export`、`backup` 分别配置：

```
COS_SECRET_ID=xxx
COS_SECRET_KEY=xxx
COS_BUCKET=your-bucket-1234567890
COS_REGION=ap-guangzhou
SIGN_URL_EXPIRE_SECONDS=600
```

## 步骤 5：安装云函数依赖并部署

```bash
# 分别进入各云函数目录安装依赖（本地开发调试用）
cd cloudfunctions/photos && npm install
cd ../export && npm install
cd ../backup && npm install
```

在微信开发者工具中右键各云函数文件夹 → **「上传并部署（云端安装依赖）」**

## 步骤 6：初始化数据库

参考 [database.md](./database.md) 创建集合和索引。

## 步骤 7：运行

在微信开发者工具中点击「编译」即可在模拟器中运行。

---

## 本地开发注意事项

- 小程序模拟器中调用云函数走真实网络，需保证云函数已部署
- 修改小程序代码后自动热重载，修改云函数需重新上传
- 建议开发期间使用 `dev` 环境，避免污染生产数据
