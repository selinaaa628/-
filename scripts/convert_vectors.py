import json
import faiss
import numpy as np
from pathlib import Path

# Paths
vectors_json = Path(r"C:\Users\94632\Desktop\qiuying_vectors.json")
out_dir = Path(r"c:\Users\94632\Desktop\中国古画鉴赏系统\data\qiuying_album\vector_store")

def convert():
    print(f"Reading {vectors_json} ...")
    with open(vectors_json, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    if not data:
        print("Empty vector file")
        return
        
    dim = len(data[0]["vector"])
    print(f"Loaded {len(data)} chunks. Vector dimension: {dim}")
    
    # Extract matrices and texts
    vecs = []
    chunks = []
    for i, item in enumerate(data):
        vecs.append(item["vector"])
        # We need to construct the standard chunk structure for index_texts.json
        chunks.append({
            "id": item.get("id", f"chunk_{i:03d}"),
            "text": item.get("text", "")
        })
        
    matrix = np.array(vecs).astype("float32")
    
    # Build FAISS index (Inner Product for cosine similarity usually)
    index = faiss.IndexFlatIP(dim)
    index.add(matrix)
    print(f"FAISS index built with {index.ntotal} vectors.")
    
    # Save outputs (fixing FAISS unicode path issue)
    out_dir.mkdir(parents=True, exist_ok=True)
    
    index_bytes = faiss.serialize_index(index)
    index_path = out_dir / "index.faiss"
    index_path.write_bytes(index_bytes.tobytes())
    
    texts_path = out_dir / "index_texts.json"
    with open(texts_path, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)
        
    print(f"[OK] FAISS index -> {index_path}")
    print(f"[OK] Texts -> {texts_path}")

if __name__ == "__main__":
    convert()
