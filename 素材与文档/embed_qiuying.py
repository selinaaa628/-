import requests
import json

# --- 配置部分 ---
OLLAMA_URL = "http://localhost:11434/api/embed"
MODEL_NAME = "qwen3-embedding:0.6b"
JSON_FILE_PATH = "仇英_metadata.json"  # ✅ 已修改为你实际的文件名

def get_embedding(text):
    """
    调用 Ollama API 获取单段文本的向量
    """
    payload = {
        "model": MODEL_NAME,
        "input": text
    }
    try:
        # 发送 POST 请求
        response = requests.post(OLLAMA_URL, json=payload)
        response.raise_for_status()  # 如果请求失败，会抛出异常
        data = response.json()
        # 从返回的 JSON 中提取向量
        return data["embeddings"][0]
    except Exception as e:
        print(f"❌ 向量化失败: {e}")
        return None

def main():
    # 1. 读取本地 JSON 文件
    try:
        with open(JSON_FILE_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 兼容处理：如果 JSON 根目录是列表，直接使用；如果是字典，取 chunks
        if isinstance(data, list):
            chunks = data
        elif isinstance(data, dict):
            chunks = data.get('chunks', [])
        else:
            print("⚠️ JSON 文件格式无法识别。")
            return

        if not chunks:
            print("⚠️ JSON 文件中没有找到数据。")
            return
            
    except FileNotFoundError:
        print(f"⚠️ 找不到文件: {JSON_FILE_PATH}，请确认文件是否在当前目录下。")
        return
    except json.JSONDecodeError:
        print("⚠️ JSON 文件格式错误，请检查文件内容。")
        return

    print(f"✅ 成功加载 {len(chunks)} 个文本块，开始向量化...\n")

    # 2. 遍历每个文本块并进行向量化
    results = []
    for i, chunk in enumerate(chunks):
        # 安全获取 ID 和 文本，防止 KeyError
        if isinstance(chunk, dict):
            chunk_id = chunk.get('id', f'chunk_{i}')
            text = chunk.get('text', '')
        else:
            # 如果列表里直接是字符串
            chunk_id = f'chunk_{i}'
            text = str(chunk)

        if not text:
            print(f"⚠️ ID: {chunk_id} 的文本为空，跳过。")
            continue

        print(f"正在处理 [{i+1}/{len(chunks)}]: {chunk_id}...")
        vector = get_embedding(text)

        if vector:
            # 将 ID、原文和向量保存到一个字典中
            results.append({
                "id": chunk_id,
                "text": text,
                "vector": vector,
                "dimension": len(vector)
            })
            print(f"   ✅ 成功 | 向量维度: {len(vector)}")
        else:
            print(f"   ❌ 失败")

    # 3. 将结果保存到新文件
    if results:
        output_file = "qiuying_vectors.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"\n🎉 全部完成！共成功处理 {len(results)} 个文本块。")
        print(f"结果已保存到: {output_file}")
    else:
        print("\n❌ 所有文本块处理均失败。")

if __name__ == "__main__":
    main()