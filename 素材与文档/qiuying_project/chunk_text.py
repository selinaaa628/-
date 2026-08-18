import re
import json
from pathlib import Path

class ArtTextChunker:
    def __init__(self, max_len=400, min_len=250, overlap=40):
        self.max_len = max_len
        self.min_len = min_len
        self.overlap = overlap
        
    def split_into_sentences(self, text):
        text = re.sub(r'([。！？；!?])', r'\1\n', text)
        sentences = [s.strip() for s in text.split('\n') if s.strip()]
        return sentences

    def chunk_text_with_overlap(self, text, prefix):
        prefix_len = len(prefix)
        actual_max_len = self.max_len - prefix_len
        
        sentences = self.split_into_sentences(text)
        chunks = []
        
        current_chunk_sentences = []
        current_len = 0
        
        for sentence in sentences:
            sentence_len = len(sentence)
            if sentence_len > actual_max_len:
                if current_chunk_sentences:
                    chunks.append("".join(current_chunk_sentences))
                    current_chunk_sentences = []
                    current_len = 0
                for i in range(0, sentence_len, actual_max_len - self.overlap):
                    chunks.append(sentence[i:i + actual_max_len])
                continue

            if current_len + sentence_len > actual_max_len and current_len >= self.min_len - prefix_len:
                chunks.append("".join(current_chunk_sentences))
                overlap_sentences = []
                overlap_len = 0
                for s in reversed(current_chunk_sentences):
                    if overlap_len + len(s) <= self.overlap * 1.5: 
                        overlap_sentences.insert(0, s)
                        overlap_len += len(s)
                    else:
                        break
                current_chunk_sentences = overlap_sentences
                current_len = overlap_len
            
            current_chunk_sentences.append(sentence)
            current_len += sentence_len
            
        if current_chunk_sentences:
            chunks.append("".join(current_chunk_sentences))
            
        return chunks

    def process_document(self, input_path, output_path):
        with open(input_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        current_artwork = ""
        current_album = ""
        current_album_id = "default_album"
        current_category = ""
        
        current_text_block = []
        final_chunks = []
        chunk_counter = 1

        def flush_text_block():
            nonlocal chunk_counter
            if not current_text_block:
                return
            
            text_content = "".join(current_text_block).strip()
            if not text_content:
                return
                
            prefix = f"{current_artwork} - {current_album} - {current_category}："
            sliced_texts = self.chunk_text_with_overlap(text_content, prefix)
            
            for slice_txt in sliced_texts:
                chunk_id = f"{current_album_id}_{chunk_counter:03d}"
                final_chunks.append({
                    "id": chunk_id,
                    "text": prefix + slice_txt
                })
                chunk_counter += 1
                
            current_text_block.clear()

        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            if line.startswith('# '):
                flush_text_block()
                current_artwork = line.replace('# ', '').strip()
            elif line.startswith('## '):
                flush_text_block()
                parts = line.replace('## ', '').split('|')
                current_album = parts[0].strip()
                if len(parts) > 1:
                    current_album_id = parts[1].strip()
                else:
                    current_album_id = "album"
                chunk_counter = 1 
            elif line.startswith('### '):
                flush_text_block()
                current_category = line.replace('### ', '').strip()
            else:
                current_text_block.append(line)

        flush_text_block()

        output_data = {"chunks": final_chunks}
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
            
        print(f"✅ 成功切割出 {len(final_chunks)} 个 Chunk！")
        print(f"📂 文件已保存至: {output_path}")

if __name__ == '__main__':
    # 初始化切割器
    chunker = ArtTextChunker(max_len=350, min_len=200, overlap=40)
    
    # 明确指定我们刚刚保存的两个文件路径
    input_file = "仇英.md" 
    output_file = "仇英_metadata.json"
    
    if Path(input_file).exists():
        print(f"正在处理文档: {input_file} ...")
        chunker.process_document(input_file, output_file)
    else:
        print(f"❌ 找不到文件 {input_file}，请确保它和脚本在同一个文件夹下。")