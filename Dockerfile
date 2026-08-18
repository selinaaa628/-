FROM python:3.10-slim

# 设置工作目录
WORKDIR /app

# 设置环境变量，避免 Python 写 .pyc 文件并关闭缓冲
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 复制 backend 的 requirements 文件
COPY backend/requirements.txt ./backend/requirements.txt

# 安装依赖
RUN pip install --no-cache-dir -r backend/requirements.txt

# 下载 sentence-transformers 模型的预加载脚本（可选，加快冷启动）
# 提前下载模型，避免每次启动都在线下载
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-small-zh-v1.5')"

# 复制整个 backend 代码和 data 数据目录
COPY backend/ ./backend/
COPY data/ ./data/

# 设置端口
EXPOSE 8000

# 从 /app 目录运行 uvicorn
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
