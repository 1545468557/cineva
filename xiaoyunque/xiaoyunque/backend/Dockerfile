FROM python:3.12-slim

# 系统依赖：
#   ffmpeg/ffprobe —— 视频合成与截帧（Post-production 阶段必需）
#   curl           —— 容器健康检查
#   fonts-noto-cjk —— 中文字幕/标题渲染，缺字体会出方块
#   libgl1/libglib2.0-0 —— Pillow / opencv 运行库
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        curl \
        fonts-noto-cjk \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# 先装依赖，利用 Docker 层缓存
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Playwright 的浏览器在容器里体积过大（~400MB），且后端仅用它做抓取类辅助，
# 这里跳过浏览器下载；需要时把下面两行取消注释。
# ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
# RUN python -m playwright install --with-deps chromium

COPY . .

# 容器内必须监听 0.0.0.0，否则外部无法访问
ENV HOST=0.0.0.0 \
    PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/api/health || exit 1

CMD ["python", "api_server.py"]
