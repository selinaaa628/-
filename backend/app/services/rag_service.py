"""
RAG 服务 — 基于 FAISS 向量检索 + DeepSeek LLM 生成回答
支持按 painting_id 动态加载向量库（热插拔）
"""
import json
import os
import logging
from typing import List, Dict, Optional, Tuple

import numpy as np
from openai import AsyncOpenAI

from app.models.schemas import AskRequest, AskResponse, Citation

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# 简易文档存储（替代完整 FAISS 索引的轻量方案）
# ─────────────────────────────────────────────
class DocumentStore:
    """内存文档存储，支持基于关键词的简易检索"""

    def __init__(self):
        self.documents: List[Dict] = []
        self.painting_id: Optional[str] = None

    def load_from_directory(self, painting_id: str, vector_store_path: str, annotations_path: str):
        """从画作数据目录加载文档"""
        self.painting_id = painting_id
        self.documents = []

        # 加载知识库文档（如有）
        knowledge_dir = os.path.join(vector_store_path, "documents")
        if os.path.isdir(knowledge_dir):
            for fname in os.listdir(knowledge_dir):
                if fname.endswith(".json"):
                    fpath = os.path.join(knowledge_dir, fname)
                    try:
                        with open(fpath, encoding="utf-8") as f:
                            doc = json.load(f)
                        if isinstance(doc, list):
                            self.documents.extend(doc)
                        elif isinstance(doc, dict):
                            self.documents.append(doc)
                    except Exception as e:
                        logger.warning(f"加载知识文档失败 {fpath}: {e}")

        # 从标注数据自动生成文档
        if os.path.exists(annotations_path):
            try:
                with open(annotations_path, encoding="utf-8") as f:
                    annotations = json.load(f)
                for ann in annotations:
                    doc = {
                        "source_id": ann.get("annotation_id", "unknown"),
                        "title": f"画面标注：{ann.get('label', '未知')}",
                        "content": f"{ann.get('short_description', '')} {ann.get('long_description', '')}",
                        "type": ann.get("type", ""),
                        "related_topics": ann.get("related_topics", [])
                    }
                    self.documents.append(doc)
            except Exception as e:
                logger.warning(f"加载标注数据失败: {e}")

        # 加载元数据
        metadata_path = annotations_path.replace("annotations.json", "metadata.json")
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, encoding="utf-8") as f:
                    metadata = json.load(f)
                doc = {
                    "source_id": "metadata",
                    "title": f"画作基本信息：{metadata.get('title_zh', '')}",
                    "content": (
                        f"画作名称：{metadata.get('title_zh', '')}（{metadata.get('title_en', '')}），"
                        f"作者：{metadata.get('artist', '')}，朝代：{metadata.get('dynasty', '')}，"
                        f"年代：{metadata.get('date', '')}，收藏：{metadata.get('collection', '')}，"
                        f"类型：{metadata.get('genre', '')}，材质：{metadata.get('medium', '')}，"
                        f"尺寸：{metadata.get('dimensions', '')}。"
                        f"描述：{metadata.get('description', '')}"
                    ),
                    "type": "metadata",
                    "related_topics": metadata.get("tags", [])
                }
                self.documents.append(doc)

                # ★ 加载 metadata.json 中的 chunks（核心知识库）
                chunks = metadata.get("chunks", [])
                for i, chunk in enumerate(chunks):
                    text = chunk.get("text", "").strip()
                    if text:
                        self.documents.append({
                            "source_id": chunk.get("id", f"chunk_{i:03d}"),
                            "title": f"知识文档：{text[:20]}…",
                            "content": text,
                            "type": "knowledge",
                            "related_topics": metadata.get("tags", [])
                        })
                if chunks:
                    logger.info(f"从 metadata.json chunks 加载了 {len(chunks)} 条知识文本")

            except Exception as e:
                logger.warning(f"加载元数据失败: {e}")

        # 同时尝试从 vector_store/index_texts.json 加载
        vector_dir = os.path.dirname(vector_store_path) if vector_store_path.endswith('.faiss') else vector_store_path
        index_texts_path = os.path.join(vector_dir, "index_texts.json")
        if os.path.exists(index_texts_path):
            try:
                with open(index_texts_path, encoding="utf-8") as f:
                    text_chunks = json.load(f)
                for i, chunk in enumerate(text_chunks):
                    text = chunk.get("text", "").strip() if isinstance(chunk, dict) else str(chunk).strip()
                    if text:
                        # 去重：检查是否已从 metadata chunks 加载过
                        existing_texts = {d.get("content", "") for d in self.documents}
                        if text not in existing_texts:
                            self.documents.append({
                                "source_id": chunk.get("id", f"idx_{i:03d}") if isinstance(chunk, dict) else f"idx_{i:03d}",
                                "title": f"索引文档：{text[:20]}…",
                                "content": text,
                                "type": "knowledge",
                                "related_topics": []
                            })
                logger.info(f"从 index_texts.json 补充加载知识文本")
            except Exception as e:
                logger.warning(f"加载 index_texts.json 失败: {e}")

        logger.info(f"画作 '{painting_id}' 已加载 {len(self.documents)} 条知识文档")

    def search(self, query: str, top_k: int = 5) -> List[Tuple[Dict, float]]:
        """基于关键词匹配的简易检索（可替换为 FAISS 向量检索）"""
        if not self.documents:
            return []

        results = []
        query_lower = query.lower()
        query_chars = set(query_lower)

        for doc in self.documents:
            content = doc.get("content", "").lower()
            title = doc.get("title", "").lower()
            topics = " ".join(doc.get("related_topics", [])).lower()
            full_text = f"{title} {content} {topics}"

            # 计算简易相关度分数
            score = 0.0
            # 完整短语匹配
            if query_lower in full_text:
                score += 0.5
            # 字符级匹配
            matched_chars = sum(1 for c in query_chars if c in full_text)
            char_ratio = matched_chars / max(len(query_chars), 1)
            score += char_ratio * 0.3
            # 关键词匹配（按字分词）
            query_words = [w for w in query_lower if w.strip()]
            word_matches = sum(1 for w in query_words if w in full_text)
            score += (word_matches / max(len(query_words), 1)) * 0.2

            if score > 0.1:
                results.append((doc, min(score, 1.0)))

        # 按分数降序排列
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]


class RAGService:
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.deepseek.com",
        model: str = "deepseek-chat",
        top_k: int = 5,
        similarity_threshold: float = 0.6,
    ):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model
        self.top_k = top_k
        self.similarity_threshold = similarity_threshold
        self._stores: Dict[str, DocumentStore] = {}
        self._agents: Dict = {}

    def load_agents(self, agents_path: str):
        """加载 AI 角色配置"""
        if os.path.exists(agents_path):
            with open(agents_path, encoding="utf-8") as f:
                data = json.load(f)
            self._agents = data.get("agents", {})
            logger.info(f"已加载 {len(self._agents)} 个 AI 角色配置")

    def load_vector_store(self, painting_id: str, vector_store_path: str, annotations_path: str):
        """按画作 ID 动态加载知识库"""
        if painting_id in self._stores:
            return
        store = DocumentStore()
        store.load_from_directory(painting_id, vector_store_path, annotations_path)
        self._stores[painting_id] = store

    def _get_agent_prompt(self, agent_id: str, language: str = "zh") -> str:
        """根据 agent_id 动态获取系统 Prompt"""
        agent = self._agents.get(agent_id, {})
        prompt_key = f"system_prompt_{language}" if f"system_prompt_{language}" in agent else "system_prompt_zh"
        return agent.get(prompt_key, "你是一位中国古代书画鉴赏专家。请基于提供的资料回答用户问题，并使用[Source: 标题]格式标注引用来源。")

    async def ask(self, request: AskRequest) -> AskResponse:
        """RAG 检索 + LLM 生成回答"""
        painting_id = request.painting_id
        
        # 懒加载
        if painting_id not in self._stores:
            from app.services.manifest_service import get_manifest_service
            svc = get_manifest_service()
            try:
                vector_path = svc.get_vector_index_path(painting_id)
                annotations_path = svc.get_annotations_path(painting_id)
                self.load_vector_store(painting_id, vector_path, annotations_path)
            except Exception as e:
                logger.error(f"Failed to lazy load vector store for {painting_id}: {e}")

        store = self._stores.get(painting_id)

        if not store or not store.documents:
            return AskResponse(
                answer="当前画作的知识库尚未加载。请稍后重试。",
                citations=[],
                related_annotations=[],
                follow_up_questions=[],
                agent_id=request.agent_id,
                painting_id=painting_id,
            )

        # 1. 检索相关文档
        search_results = store.search(request.question, self.top_k)

        # 2. 相似度阈值过滤 (调低阈值，因为简易字词匹配分数往往在 0.2-0.5 之间)
        if not search_results or search_results[0][1] < 0.15:
            return AskResponse(
                answer="现有文献资料不足以回答该问题，请尝试提问其他内容。",
                citations=[],
                related_annotations=[],
                follow_up_questions=["请问这幅画的构图有什么特点？", "这幅画的历史背景是什么？"],
                agent_id=request.agent_id,
                painting_id=painting_id,
            )

        # 3. 构建上下文
        context_parts = []
        citations = []
        related_annotations = set()

        for doc, score in search_results:
            context_parts.append(f"[{doc.get('title', '未知来源')}]: {doc.get('content', '')}")
            citations.append(Citation(
                source_id=doc.get("source_id", "unknown"),
                title=doc.get("title", "未知来源"),
                relevance_score=round(score, 3),
            ))
            src_id = doc.get("source_id", "")
            if src_id.startswith("region_"):
                related_annotations.add(src_id)

        context = "\n\n".join(context_parts)

        # 4. 如果有标注上下文，加入提示
        annotation_context = ""
        if request.annotation_id:
            annotation_context = f"\n用户当前正在查看的画面区域标注 ID: {request.annotation_id}，请优先围绕该区域展开回答。"

        # 5. 组装 Prompt
        system_prompt = self._get_agent_prompt(request.agent_id, request.language)
        user_prompt = f"""以下是与这幅画相关的参考资料：

{context}
{annotation_context}

用户提问：{request.question}

请根据以上参考资料回答，注意：
1. 回答需简明扼要，尽量控制篇幅，并合理分段，保证阅读体验舒适
2. 请自然流畅地回答，绝对不要在正文中出现任何 [Source: xxx] 或类似的引用标记
3. 如果资料不足以回答，请明确说明
4. 在回答末尾提供 2-3 个延伸问题建议"""

        # 6. 调用 DeepSeek LLM
        agent_config = self._agents.get(request.agent_id, {})
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=agent_config.get("temperature", 0.7),
                max_tokens=agent_config.get("max_tokens", 1000),
            )
            answer = response.choices[0].message.content or "抱歉，生成回答时出现问题。"
        except Exception as e:
            logger.error(f"LLM 调用失败: {e}")
            answer = f"AI 服务暂时不可用，请稍后重试。（错误信息：{str(e)[:100]}）"

        # 强制清除可能残留的 [Source: xxx] 标记
        import re
        answer = re.sub(r'\[Source:.*?\]', '', answer)

        # 7. 提取追问建议
        follow_ups = self._extract_follow_ups(answer)

        return AskResponse(
            answer=answer,
            citations=citations,
            related_annotations=list(related_annotations),
            follow_up_questions=follow_ups,
            agent_id=request.agent_id,
            painting_id=painting_id,
        )

    def _extract_follow_ups(self, answer: str) -> List[str]:
        """从回答中提取追问建议"""
        follow_ups = []
        lines = answer.split("\n")
        capture = False
        for line in lines:
            stripped = line.strip()
            if "延伸" in stripped or "追问" in stripped or "建议" in stripped:
                capture = True
                continue
            if capture and stripped:
                cleaned = stripped.lstrip("0123456789.-）)、 ·•")
                if cleaned and len(cleaned) > 4:
                    follow_ups.append(cleaned)
        if not follow_ups:
            follow_ups = [
                "这幅画的构图有什么独到之处？",
                "画中运用了哪些独特的笔墨技法？",
            ]
        return follow_ups[:3]


# 单例
_rag_service_instance: Optional[RAGService] = None


def get_rag_service() -> RAGService:
    if _rag_service_instance is None:
        raise RuntimeError("RAGService 未初始化")
    return _rag_service_instance


def init_rag_service(
    api_key: str,
    base_url: str,
    model: str,
    top_k: int = 5,
    similarity_threshold: float = 0.6,
) -> RAGService:
    global _rag_service_instance
    _rag_service_instance = RAGService(
        api_key=api_key,
        base_url=base_url,
        model=model,
        top_k=top_k,
        similarity_threshold=similarity_threshold,
    )
    return _rag_service_instance
