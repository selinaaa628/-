import sys
import os

root_dir = os.path.dirname(os.path.dirname(__file__))
# 加入根目录以支持 from backend.main 导入
sys.path.insert(0, root_dir)
# 加入 backend 目录以支持内部 from app.api 导入
sys.path.insert(0, os.path.join(root_dir, "backend"))

# 从 backend.main 导入 fastapi 实例
from backend.main import app
