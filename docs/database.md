# 数据库集合与索引配置

## 集合列表

在微信云开发控制台 → 数据库 → 添加集合，依次创建：

| 集合名 | 用途 |
|--------|------|
| `users` | 用户信息 |
| `couples` | 情侣空间 |
| `photos` | 照片元数据 |
| `anniversaries` | 纪念日 |
| `messages` | 留言 |
| `exports` | 导出任务记录 |
| `backup_jobs` | 备份任务记录 |

---

## 字段说明

### users
```json
{
  "_id": "string",
  "openid": "string",
  "nickname": "string",
  "avatarUrl": "string",
  "partnerOpenid": "string|null",
  "coupleId": "string|null",
  "createdAt": "number（毫秒时间戳）",
  "updatedAt": "number"
}
```

### couples
```json
{
  "_id": "string",
  "code": "string（6位绑定码）",
  "memberAOpenid": "string",
  "memberBOpenid": "string|null",
  "status": "pending|active|closed|expired",
  "createdAt": "number",
  "boundAt": "number|null",
  "updatedAt": "number"
}
```

### photos
```json
{
  "_id": "string（photoId）",
  "coupleId": "string",
  "uploadedBy": "string（openid）",
  "cosKey": "string（COS 原图路径）",
  "thumbnailKey": "string（COS 缩略图路径）",
  "originalName": "string",
  "size": "number（字节）",
  "mimeType": "string",
  "width": "number",
  "height": "number",
  "takenAt": "number|null",
  "createdAt": "number",
  "updatedAt": "number",
  "isDeleted": "boolean（默认 false）",
  "deletedAt": "number|null",
  "deletedBy": "string|null",
  "version": "number（默认 1）"
}
```

### anniversaries
```json
{
  "_id": "string",
  "coupleId": "string",
  "title": "string（最长 30 字）",
  "date": "string（YYYY-MM-DD）",
  "remark": "string（最长 200 字）",
  "createdBy": "string（openid）",
  "createdAt": "number",
  "updatedAt": "number",
  "isDeleted": "boolean（默认 false）"
}
```

### messages
```json
{
  "_id": "string",
  "coupleId": "string",
  "senderOpenid": "string",
  "content": "string（最长 300 字）",
  "createdAt": "number",
  "updatedAt": "number",
  "isDeleted": "boolean（默认 false）"
}
```

### exports
```json
{
  "_id": "string（exportId）",
  "coupleId": "string",
  "requestedBy": "string",
  "status": "pending|processing|done|failed",
  "fileKey": "string|null",
  "errorMessage": "string|null",
  "createdAt": "number",
  "updatedAt": "number"
}
```

### backup_jobs
```json
{
  "_id": "string",
  "jobDate": "string（yyyyMMdd）",
  "status": "pending|processing|done|failed",
  "dbSnapshotKey": "string|null",
  "photoManifestKey": "string|null",
  "errorMessage": "string|null",
  "createdAt": "number",
  "updatedAt": "number"
}
```

---

## 索引配置

在云开发控制台 → 数据库 → 对应集合 → 索引管理 → 添加索引：

### users 集合
| 字段 | 类型 |
|------|------|
| openid | 升序（唯一索引）|
| coupleId | 升序 |

### couples 集合
| 字段 | 类型 |
|------|------|
| code | 升序 |
| memberAOpenid | 升序 |
| memberBOpenid | 升序 |
| status | 升序 |

### photos 集合
| 字段组合 | 说明 |
|----------|------|
| coupleId + isDeleted + createdAt | 主查询索引（倒序时间）|

### anniversaries 集合
| 字段组合 | 说明 |
|----------|------|
| coupleId + isDeleted + date | 主查询索引 |

### messages 集合
| 字段组合 | 说明 |
|----------|------|
| coupleId + isDeleted + createdAt | 主查询索引 |

### exports 集合
| 字段组合 | 说明 |
|----------|------|
| coupleId + createdAt | 主查询索引 |

### backup_jobs 集合
| 字段 | 说明 |
|------|------|
| jobDate | 唯一索引 |

---

## 数据库权限

在云开发控制台 → 数据库 → 每个集合 → 权限设置：

**推荐所有集合设置为「仅创建者可读写」**（即 `auth`）。  
云函数运行在服务端，拥有最高权限，不受此限制。  
小程序前端不直接访问数据库，所有读写通过云函数进行。
