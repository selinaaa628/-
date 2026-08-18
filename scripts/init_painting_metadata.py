import json
import os

paintings = [
    {
        "id": "qy_guifei",
        "title_zh": "人物故事图册 - 贵妃晓妆",
        "title_en": "Guifei's Morning Makeup",
        "artist": "仇英",
        "dynasty": "明代",
        "date": "约 1537-1542",
        "collection": "故宫博物院",
        "genre": "人物画",
        "medium": "绢本设色",
        "dimensions": "41.4cm × 33.8cm",
        "description": "明代仇英《人物故事图册》之一。描绘了杨贵妃清晨在华清宫端正楼对镜理髻，宫女奏乐、采花和携琵琶的情景。",
        "tags": ["仇英", "明代", "仕女", "杨贵妃", "工笔重彩"]
    },
    {
        "id": "qy_gaoshan",
        "title_zh": "人物故事图册 - 高山流水",
        "title_en": "High Mountains and Flowing Water",
        "artist": "仇英",
        "dynasty": "明代",
        "date": "约 1537-1542",
        "collection": "故宫博物院",
        "genre": "人物画",
        "medium": "绢本设色",
        "dimensions": "41.4cm × 33.8cm",
        "description": "明代仇英《人物故事图册》之一。描绘了春秋时期俞伯牙与钟子期高山流水遇知音的故事。",
        "tags": ["仇英", "明代", "知音", "高山流水", "伯牙子期"]
    },
    {
        "id": "qy_xunyang",
        "title_zh": "人物故事图册 - 浔阳琵琶",
        "title_en": "Pipa on Xunyang River",
        "artist": "仇英",
        "dynasty": "明代",
        "date": "约 1537-1542",
        "collection": "故宫博物院",
        "genre": "人物画",
        "medium": "绢本设色",
        "dimensions": "41.4cm × 33.8cm",
        "description": "明代仇英《人物故事图册》之一。根据白居易《琵琶行》诗意创作，表现了浔阳江头夜送客的情景。",
        "tags": ["仇英", "明代", "白居易", "琵琶行", "送别"]
    }
]

base_dir = r"c:\Users\94632\Desktop\中国古画鉴赏系统\data"

for p in paintings:
    p_id = p.pop("id")
    # Add empty chunks to avoid error (we use shared FAISS for actual RAG)
    p["chunks"] = [] 
    
    dir_path = os.path.join(base_dir, p_id)
    os.makedirs(dir_path, exist_ok=True)
    
    with open(os.path.join(dir_path, "metadata.json"), "w", encoding="utf-8") as f:
        json.dump(p, f, ensure_ascii=False, indent=2)
        
    with open(os.path.join(dir_path, "annotations.json"), "w", encoding="utf-8") as f:
        json.dump([], f)
        
    with open(os.path.join(dir_path, "tour.json"), "w", encoding="utf-8") as f:
        json.dump({"title": "导览", "duration_minutes": 1, "steps": []}, f, ensure_ascii=False, indent=2)
        
print("All basic JSON files generated.")
