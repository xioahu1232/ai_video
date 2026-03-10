# 🚀 Vercel 部署完整指南

## 📋 您需要的环境变量清单

**复制以下内容到 Vercel 的 Environment Variables 配置页面：**

| 变量名 | 值 |
|--------|-----|
| `COZE_API_KEY` | `sat_ZEpnXym6yEQuqg7rlGATEvytkD5JBNDOPl1M2WSpPKOMvPUbLgwApW3DJ5yEWqMh` |
| `COZE_SUPABASE_URL` | `https://br-zesty-foal-2d1a28a5.supabase2.aidap-global.cn-beijing.volces.com` |
| `COZE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjMzNTM2Njc5ODIsInJvbGUiOiJhbm9uIn0.r0kee_OldAo0T3GiSN9qo6M681gteK8lYuBganuuAhE` |
| `ADMIN_EMAIL` | `admin@changfeng.com` |
| `ADMIN_PASSWORD` | `Admin@2024` |

---

## 🔧 步骤一：注册 GitHub（约 5 分钟）

1. 访问 https://github.com
2. 点击 "Sign up" 注册账号
3. 验证邮箱

---

## 📦 步骤二：创建 GitHub 仓库（约 2 分钟）

1. 登录 GitHub
2. 点击右上角 **"+"** → **"New repository"**
3. 填写：
   - Repository name: `ai-video-generator`（或其他名称）
   - 选择 **Private**（私有仓库）
   - **不要勾选** "Add a README file"
4. 点击 **"Create repository"**

---

## 📤 步骤三：下载并上传代码

### 方式 A：我帮您打包代码（推荐）

告诉我您注册好了，我可以帮您：
1. 打包代码为 ZIP 文件
2. 您下载后上传到 GitHub

### 方式 B：使用 Git 命令

如果您熟悉 Git，在本地执行：
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/您的用户名/仓库名.git
git push -u origin main
```

---

## 🌐 步骤四：Vercel 部署（约 5 分钟）

1. 访问 https://vercel.com
2. 点击 **"Sign Up"** → 选择 **"Continue with GitHub"**
3. 授权后，点击 **"Add New..."** → **"Project"**
4. 选择您刚创建的 GitHub 仓库
5. 点击 **"Import"**
6. **展开 "Environment Variables"**，添加上面的 5 个环境变量
7. 点击 **"Deploy"**
8. 等待 2-3 分钟

---

## ✅ 部署成功后

您会获得一个永久访问地址，例如：
- `https://ai-video-generator.vercel.app`
- 或 `https://ai-video-generator-您的用户名.vercel.app`

**以后每次更新代码推送到 GitHub，Vercel 会自动重新部署！**

---

## ⚠️ 重要提醒

1. **不要把 `.env.local` 上传到 GitHub**（已在 .gitignore 中排除）
2. **生产环境建议修改管理员密码**
3. Vercel 免费版每月 100GB 流量，足够测试使用

---

## 🆘 遇到问题？

告诉我具体情况，我会帮您排查：
- 部署失败 → 提供 Build Logs 截图
- 页面报错 → 提供浏览器控制台截图
