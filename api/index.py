import sys
import os

# 将 backend 目录加入到 sys.path 中，以便能正确导入 app 包
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

# 从 backend.main 导入 fastapi 实例
from backend.main import app
