#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
build_vector_index.py
=====================
Reads chunks from data/demo_painting/metadata.json,
embeds them with sentence-transformers,
and writes a FAISS index to data/demo_painting/vector_store/.

Key fix: uses faiss.serialize_index() + Python's open() to avoid the
FAISS C++ FileIOWriter crashing on Unicode (Chinese) paths on Windows.

Usage:
    python scripts/build_vector_index.py
    python scripts/build_vector_index.py --metadata data/demo_painting/metadata.json --outdir data/demo_painting/vector_store
"""

import argparse
import json
import sys
from pathlib import Path

try:
    import numpy as np
    import faiss
    from sentence_transformers import SentenceTransformer
    from tqdm import tqdm
except ImportError as e:
    print(f"[ERROR] Missing dependency: {e}")
    print("Run: pip install sentence-transformers faiss-cpu numpy tqdm")
    sys.exit(1)

MODEL_NAME = "Qwen/Qwen3-Embedding-0.6B"


def load_chunks(metadata_path: Path) -> list:
    with metadata_path.open(encoding="utf-8") as f:
        meta = json.load(f)
    chunks = [c for c in meta.get("chunks", []) if c.get("text", "").strip()]
    if not chunks:
        print(f"[ERROR] No 'chunks' found in {metadata_path}")
        sys.exit(1)
    print(f"[INFO] Loaded {len(chunks)} text chunks")
    return chunks


def embed_texts(texts: list) -> tuple[np.ndarray, int]:
    print(f"[INFO] Loading model: {MODEL_NAME} (may take a while if downloading...)")
    # Trust remote code is required for some newer models like Qwen
    model = SentenceTransformer(MODEL_NAME, trust_remote_code=True)
    vecs = []
    for t in tqdm(texts, desc="Embedding", unit="chunk"):
        vecs.append(model.encode(t, normalize_embeddings=True))
    matrix = np.stack(vecs).astype("float32")
    
    # Get dimension from model
    dim = model.get_sentence_embedding_dimension()
    if not dim:
        dim = matrix.shape[1]
        
    print(f"[INFO] Embedding matrix shape: {matrix.shape}, Dimension: {dim}")
    return matrix, dim


def build_index(matrix: np.ndarray, dim: int) -> faiss.Index:
    index = faiss.IndexFlatIP(dim)
    index.add(matrix)
    print(f"[INFO] FAISS index built with {index.ntotal} vectors (dim={dim})")
    return index


def save_outputs(index: faiss.Index, chunks: list, outdir: Path):
    outdir.mkdir(parents=True, exist_ok=True)

    # ── KEY FIX ──────────────────────────────────────────────────────
    # faiss.write_index(index, path_str) uses a C++ FileIOWriter that
    # cannot handle Unicode / CJK characters in Windows paths.
    # Instead, serialize to bytes in memory and write with Python's open().
    index_bytes = faiss.serialize_index(index)          # returns numpy uint8 array
    index_path  = outdir / "index.faiss"
    index_path.write_bytes(index_bytes.tobytes())       # Python handles Unicode paths
    # ─────────────────────────────────────────────────────────────────

    texts_path = outdir / "index_texts.json"
    with texts_path.open("w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)

    print(f"[OK] FAISS index  -> {index_path}")
    print(f"[OK] Chunk texts  -> {texts_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--metadata", default="data/demo_painting/metadata.json")
    parser.add_argument("--outdir",   default="data/demo_painting/vector_store")
    args = parser.parse_args()

    root      = Path(__file__).parent.parent          # project root
    meta_path = (root / args.metadata).resolve()
    out_path  = (root / args.outdir).resolve()

    print("=" * 60)
    print("  Ancient Painting System - FAISS Index Builder")
    print("=" * 60)
    print(f"  Input : {meta_path}")
    print(f"  Output: {out_path}")
    print()

    if not meta_path.exists():
        print(f"[ERROR] File not found: {meta_path}")
        sys.exit(1)

    chunks = load_chunks(meta_path)
    texts  = [c["text"] for c in chunks]
    matrix, dim = embed_texts(texts)
    index  = build_index(matrix, dim)
    save_outputs(index, chunks, out_path)

    print()
    print("=" * 60)
    print("  Done! You can now start the backend server.")
    print("=" * 60)


if __name__ == "__main__":
    main()
