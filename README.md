# ❖ 中国古画智能鉴赏系统 (Intelligent Ancient Chinese Painting Appreciation System)

![License](https://img.shields.io/badge/license-MIT-blue)
![React](https://img.shields.io/badge/Frontend-React%20%7C%20Vite-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)
![AI](https://img.shields.io/badge/AI-DeepSeek%20%7C%20RAG-FF6B6B)

一个基于大语言模型与 RAG（检索增强生成）技术的全栈交互式艺术鉴赏平台。本项目旨在利用现代数字化与人工智能技术，为用户提供沉浸式、对话式的数字化艺术展览体验，打破传统博物馆的玻璃阻隔，让古画“活”起来。

---

## ✨ 核心特性 (Features)

- 🔍 **超清细节探索**：集成 OpenSeadragon，支持千兆像素级（Gigapixel）画作的无损深度缩放与平滑漫游。
- 🤖 **AI 智能问答 (RAG)**：接入大语言模型，结合本地向量知识库（FAISS），实现对画作背景、流派、印章、题跋的精准语境解答。
- 🎯 **动态智能导览**：预设游览路径（Tour），系统可自动控制视角平移与缩放，结合 AI 语音进行专业讲解。
- 📌 **多维知识标注**：支持针对画作特定区域的热点交互，点击即可展示文物考证与局部鉴赏详情。

## 🛠️ 技术栈 (Tech Stack)

### 前端 (Frontend)
- **框架**: React 19 + TypeScript + Vite
- **核心库**: OpenSeadragon (超高分辨率图像查看)
- **动画与交互**: GSAP (动效控制), Three.js (预留 VR/3D 支持)

### 后端 (Backend)
- **框架**: FastAPI (Python 3.10+)
- **AI 与大模型**: OpenAI SDK (对接 DeepSeek/本地模型)
- **RAG 检索引擎**: `sentence-transformers` (本地向量化 `bge-small-zh-v1.5`), FAISS (向量数据库)

---

## 📁 目录结构 (Project Structure)

```text
├── frontend/               # React 前端代码
│   ├── src/                # 源码目录 (组件、服务、类型)
│   ├── public/             # 静态公共资源
│   └── vite.config.ts      # Vite 配置文件
├── backend/                # FastAPI 后端代码
│   ├── app/                # 核心 API 与 RAG 服务逻辑
│   ├── main.py             # 后端启动入口
│   └── requirements.txt    # Python 依赖清单
├── data/                   # 本地数据目录 (需自行准备画作与知识库文件)
│   ├── manifest.json       # 整体数据索引配置
│   └── <painting_id>/      # 独立画作数据包 (图片, json, faiss索引)
├── docker-compose.yml      # Docker 编排配置
└── Dockerfile              # 后端服务容器构建文件
```

---

## 🚀 快速启动 (Quick Start)

### 1. 准备本地数据
请确保项目根目录下存在 `data` 文件夹，并包含 `manifest.json` 与相关画作数据。

### 2. 启动后端服务 (Backend)

```bash
cd backend
# 建议使用虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量 (复制示例并填入你的 API KEY)
cp .env.example .env

# 启动 FastAPI 服务
python main.py
```
*后端将在 `http://localhost:8000` 运行。*

### 3. 启动前端服务 (Frontend)

重新打开一个终端窗口：

```bash
cd frontend

# 安装 Node.js 依赖包
npm install

# 启动 Vite 开发服务器
npm run dev
```
*前端将在 `http://localhost:5173` 运行，尽情体验吧！*

---

## ☁️ 云端部署 (Deployment)

本项目支持且推荐**前后端分离部署**：

1. **后端 (Zeabur / Render 等 Docker 平台)**
   由于包含机器学习模型，推荐使用提供根目录 `Dockerfile` 的方式进行一键部署，并配置对应的环境变量（如 `DEEPSEEK_API_KEY` 和 `FRONTEND_URL`）。
2. **前端 (Vercel / Netlify)**
   可以直接将 `frontend` 文件夹部署至 Vercel，并在环境变量中配置 `VITE_API_BASE_URL` 指向你的后端域名即可。

---

## 📄 协议 (License)
本项目采用 [MIT License](LICENSE) 开源协议。
