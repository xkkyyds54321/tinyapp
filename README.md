# 情侣空间 - 微信小程序

一个仅供两人使用的微信小程序，支持情侣绑定、照片上传、纪念日、留言，并以 **"长期可恢复"** 为核心设计持久化方案。

---

## 功能列表

- ✅ 情侣绑定（创建空间 + 绑定码加入）
- ✅ 相册（上传到 COS、列表、详情、软删除、回收站恢复）
- ✅ 纪念日（增删改查 + 在一起天数 / 倒计时）
- ✅ 留言（发送、查看、删除自己留言）
- ✅ 个人中心（情侣信息、数据导出、回收站入口）
- ✅ 每日自动备份（数据库快照 + COS 照片清单）

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 客户端 | 微信小程序原生框架 |
| 后端 | 微信云开发云函数 |
| 数据库 | 微信云开发数据库（仅存元数据）|
| 文件存储 | 腾讯云 COS（照片原图、缩略图、导出包、备份）|
| 访问控制 | 云函数签发临时签名 URL（10 分钟有效）|

---

## 目录结构

```
tiny_app/
├── miniprogram/
│   ├── app.js                    # 小程序入口，初始化云开发
│   ├── app.json                  # 页面路由、tabBar
│   ├── app.wxss                  # 全局样式
│   ├── config/
│   │   ├── env.js                # 环境配置（dev/prod）
│   │   ├── constants.js          # 全局常量
│   │   └── error-codes.js        # 统一错误码
│   ├── utils/
│   │   ├── request.js            # 云函数调用封装
│   │   ├── auth.js               # 登录态缓存
│   │   ├── date.js               # 日期格式化工具
│   │   ├── guard.js              # 路由守卫
│   │   └── toast.js              # 提示工具
│   ├── services/
│   │   ├── auth.js               # 鉴权 service
│   │   ├── couple.js             # 情侣绑定 service
│   │   ├── photos.js             # 照片 service（含 COS 上传）
│   │   ├── anniversaries.js      # 纪念日 service
│   │   ├── messages.js           # 留言 service
│   │   └── exports.js            # 导出 service
│   └── pages/
│       ├── bind/                 # 绑定页
│       ├── home/                 # 首页
│       ├── gallery/              # 相册（列表 / 详情 / 回收站）
│       ├── anniversaries/        # 纪念日
│       ├── messages/             # 留言
│       └── profile/              # 个人中心
├── cloudfunctions/
│   ├── auth/                     # 鉴权云函数
│   ├── couple/                   # 情侣绑定云函数
│   ├── photos/                   # 照片云函数（含 COS 集成）
│   ├── anniversaries/            # 纪念日云函数
│   ├── messages/                 # 留言云函数
│   ├── export/                   # 数据导出云函数
│   └── backup/                   # 每日备份云函数（定时触发）
└── docs/
    ├── setup.md                  # 开发环境配置
    ├── database.md               # 数据库集合与索引
    └── backup-and-restore.md     # 备份恢复说明
```

---

## 快速开始

### 1. 导入项目

1. 打开微信开发者工具
2. 选择「导入项目」，选择本项目根目录
3. 填入你的小程序 AppID（在 [微信公众平台](https://mp.weixin.qq.com) 注册获取）

### 2. 配置云开发环境

1. 在微信开发者工具顶部菜单 → 云开发 → 开通云环境
2. 记下你的 **环境 ID**（格式如 `your-env-abc123`）
3. 修改 `miniprogram/config/env.js`：

```js
const ENV = {
  dev: {
    ENV_ID: 'your-dev-env-id',   // ← 填入你的云开发环境 ID
    COS_BUCKET: 'your-bucket-1234567890',
    COS_REGION: 'ap-guangzhou',
    SIGN_URL_EXPIRE_SECONDS: 600
  },
  prod: {
    ENV_ID: 'your-prod-env-id',
    COS_BUCKET: 'your-bucket-prod-1234567890',
    COS_REGION: 'ap-guangzhou',
    SIGN_URL_EXPIRE_SECONDS: 600
  }
}
```

### 3. 配置腾讯云 COS

1. 登录 [腾讯云 COS 控制台](https://console.cloud.tencent.com/cos)
2. 创建存储桶（选择私有读写）
3. 开启**版本控制**：存储桶 → 高级配置 → 版本控制 → 开启
4. 记录：桶名称（如 `couple-1234567890`）、所在地域（如 `ap-guangzhou`）
5. 在 [CAM 控制台](https://console.cloud.tencent.com/cam/capi) 创建子账号，授予该桶读写权限，获取 **SecretId** 和 **SecretKey**

### 4. 配置云函数环境变量

在微信云开发控制台 → 云函数 → 选择函数 → 环境变量，为以下云函数配置环境变量：

需要配置环境变量的云函数：`photos`、`export`、`backup`

| 变量名 | 说明 |
|--------|------|
| `COS_BUCKET` | 存储桶名称，如 `couple-1234567890` |
| `COS_REGION` | 地域，如 `ap-guangzhou` |
| `COS_SECRET_ID` | CAM 子账号 SecretId |
| `COS_SECRET_KEY` | CAM 子账号 SecretKey |
| `SIGN_URL_EXPIRE_SECONDS` | 签名 URL 有效期（秒），推荐 `600` |

> ⚠️ 密钥只配置在云函数环境变量中，**不要写入前端代码**

### 5. 初始化数据库集合

详见 [docs/database.md](./docs/database.md)，需创建以下集合：

```
users / couples / photos / anniversaries / messages / exports / backup_jobs
```

### 6. 部署云函数

在微信开发者工具中，右键每个云函数目录 → 「上传并部署（云端安装依赖）」：

```
cloudfunctions/auth
cloudfunctions/couple
cloudfunctions/photos          ← 需要 cos-nodejs-sdk-v5
cloudfunctions/anniversaries
cloudfunctions/messages
cloudfunctions/export          ← 需要 cos-nodejs-sdk-v5
cloudfunctions/backup          ← 需要 cos-nodejs-sdk-v5，配置定时触发器
```

### 7. 配置备份定时触发器

在云开发控制台 → 云函数 → backup → 触发管理 → 新增触发器：

- 触发类型：定时触发
- Cron 表达式：`0 0 3 * * * *`（每天凌晨 3 点）

---

## 生产部署流程

1. 将 `miniprogram/config/env.js` 中 `CURRENT_ENV` 改为 `'prod'`
2. 在微信公众平台配置正式版 AppID
3. 重新部署所有云函数（选择正式环境）
4. 在微信开发者工具上传代码 → 提交审核

---

## 常见问题

**Q: 照片上传失败怎么办？**  
A: 检查 COS 环境变量是否配置、存储桶权限是否正确、前端 uploadUrl 是否有效。

**Q: 绑定码显示"无效"？**  
A: 绑定码区分大写，建议复制粘贴。有效期 7 天，过期需重新创建情侣空间。

**Q: 删除照片后怎么找回？**  
A: 进入相册页 → 右上角「回收站」→ 点击照片旁的「恢复」按钮。

**Q: 如何迁移到另一个云环境？**  
A: 先在个人中心导出数据，下载 JSON 文件。COS 上的原图可通过 COS 控制台下载。详见 [docs/backup-and-restore.md](./docs/backup-and-restore.md)。
