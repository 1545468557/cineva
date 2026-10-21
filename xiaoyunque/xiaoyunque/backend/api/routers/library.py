"""素材库（资产页）持久化路由。

前端资产页原先只有演示数据 + 一次性内存状态：收藏、回收站、上传全都刷新即丢。
这里给一份最小的本机持久化：单一 JSON 文件，原子写入，串行化锁。
"""

import json
import logging
import os
import tempfile
import threading
import time
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from config import settings
from path_security import resolve_allowed_local_file

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Library"])

LIBRARY_PATH = os.path.join(settings.CODE_DIR, "data", "library.json")
_LOCK = threading.RLock()

MAX_NAME_LEN = 120
MAX_TAG_COUNT = 8
MAX_TAG_LEN = 32


class LibraryAssetIn(BaseModel):
    name: str = Field(default="", max_length=MAX_NAME_LEN)
    kind: str = Field(default="其他", max_length=16)
    cover: str = Field(default="", max_length=2048)
    tags: List[str] = Field(default_factory=list)
    model: str = Field(default="—", max_length=120)
    origin: str = Field(default="本机生成", max_length=16)
    source: str = Field(default="upload", max_length=32)


class LibraryAssetPatch(BaseModel):
    name: Optional[str] = Field(default=None, max_length=MAX_NAME_LEN)
    kind: Optional[str] = Field(default=None, max_length=16)
    tags: Optional[List[str]] = None
    starred: Optional[bool] = None
    trashed: Optional[bool] = None


def _ensure_dir() -> None:
    os.makedirs(os.path.dirname(LIBRARY_PATH), exist_ok=True)


def _load() -> Dict[str, Any]:
    _ensure_dir()
    if not os.path.exists(LIBRARY_PATH):
        return {"version": 1, "assets": []}
    try:
        with open(LIBRARY_PATH, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, json.JSONDecodeError):
        logger.warning("Library file unreadable, starting a fresh store", exc_info=True)
        return {"version": 1, "assets": []}
    if not isinstance(data, dict) or not isinstance(data.get("assets"), list):
        return {"version": 1, "assets": []}
    data.setdefault("version", 1)
    return data


def _save(data: Dict[str, Any]) -> None:
    _ensure_dir()
    directory = os.path.dirname(LIBRARY_PATH)
    fd, tmp_path = tempfile.mkstemp(prefix="library-", suffix=".tmp", dir=directory)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp_path, LIBRARY_PATH)
    except Exception:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise


def _clean_tags(tags: Optional[List[str]]) -> List[str]:
    if not tags:
        return []
    cleaned: List[str] = []
    for tag in tags:
        text = str(tag or "").strip()[:MAX_TAG_LEN]
        if text and text not in cleaned:
            cleaned.append(text)
        if len(cleaned) >= MAX_TAG_COUNT:
            break
    return cleaned


def _sanitize_cover(cover: str) -> str:
    """封面只接受站内相对路径、http(s) 链接，或允许目录内的本机文件。"""
    value = str(cover or "").strip()
    if not value:
        return ""
    if value.startswith("/"):
        return value
    if value.startswith("http://") or value.startswith("https://"):
        return value
    try:
        return resolve_allowed_local_file(value, [settings.TEMP_DIR, settings.RESULT_DIR])
    except ValueError:
        return ""


def _public(asset: Dict[str, Any]) -> Dict[str, Any]:
    """把本机绝对路径转成前端可直接加载的 /code/ 静态地址。"""
    cover = str(asset.get("cover") or "")
    if cover and not cover.startswith(("/", "http://", "https://")):
        try:
            relative = os.path.relpath(cover, settings.CODE_DIR).replace(os.sep, "/")
            cover = f"/code/{relative}"
        except ValueError:
            cover = ""
    return {**asset, "cover": cover}


@router.get("/api/library/assets")
async def list_assets(include_trashed: bool = False):
    with _LOCK:
        data = _load()
    assets = data["assets"]
    if not include_trashed:
        assets = [item for item in assets if not item.get("trashed")]
    assets = sorted(assets, key=lambda item: item.get("createdAt", 0), reverse=True)
    return {"success": True, "assets": [_public(item) for item in assets]}


@router.post("/api/library/assets")
async def create_asset(payload: LibraryAssetIn):
    cover = _sanitize_cover(payload.cover)
    if not cover:
        raise HTTPException(status_code=400, detail="封面地址无效或不在允许的上传目录中")
    name = payload.name.strip() or os.path.basename(cover) or "未命名素材"
    record = {
        "id": uuid.uuid4().hex[:16],
        "name": name[:MAX_NAME_LEN],
        "kind": payload.kind or "其他",
        "cover": cover,
        "tags": _clean_tags(payload.tags),
        "model": payload.model or "—",
        "origin": payload.origin or "本机生成",
        "source": payload.source or "upload",
        "starred": False,
        "trashed": False,
        "trashedAt": None,
        "createdAt": time.time(),
    }
    with _LOCK:
        data = _load()
        data["assets"].append(record)
        _save(data)
    logger.info("Library asset created: id=%s name=%s", record["id"], record["name"])
    return {"success": True, "asset": _public(record)}


@router.patch("/api/library/assets/{asset_id}")
async def update_asset(asset_id: str, payload: LibraryAssetPatch):
    with _LOCK:
        data = _load()
        target = next((item for item in data["assets"] if item.get("id") == asset_id), None)
        if target is None:
            raise HTTPException(status_code=404, detail="素材不存在")
        if payload.name is not None:
            target["name"] = payload.name.strip()[:MAX_NAME_LEN] or target.get("name", "")
        if payload.kind is not None:
            target["kind"] = payload.kind
        if payload.tags is not None:
            target["tags"] = _clean_tags(payload.tags)
        if payload.starred is not None:
            target["starred"] = bool(payload.starred)
        if payload.trashed is not None:
            target["trashed"] = bool(payload.trashed)
            target["trashedAt"] = time.time() if payload.trashed else None
        _save(data)
        result = _public(target)
    return {"success": True, "asset": result}


@router.delete("/api/library/assets/{asset_id}")
async def purge_asset(asset_id: str):
    """彻底删除（回收站里的「永久删除」）。"""
    with _LOCK:
        data = _load()
        before = len(data["assets"])
        data["assets"] = [item for item in data["assets"] if item.get("id") != asset_id]
        if len(data["assets"]) == before:
            raise HTTPException(status_code=404, detail="素材不存在")
        _save(data)
    return {"success": True}


@router.delete("/api/library/assets")
async def empty_trash():
    with _LOCK:
        data = _load()
        kept = [item for item in data["assets"] if not item.get("trashed")]
        removed = len(data["assets"]) - len(kept)
        data["assets"] = kept
        _save(data)
    return {"success": True, "removed": removed}
