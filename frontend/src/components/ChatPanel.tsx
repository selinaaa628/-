// src/components/ChatPanel.tsx
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Annotation, Citation } from '../types/index';

interface Props {
  paintingId: string;
  selectedAnnotation: Annotation | null;
  onHighlightAnnotation: (annotationId: string) => void;
}

export default function ChatPanel({ paintingId, selectedAnnotation, onHighlightAnnotation }: Props) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; citations?: Citation[]; followUps?: string[] }>>([
    { role: 'assistant', content: '欢迎来到古画智能鉴赏系统！我是策展人，可以为您解读画作的构图、技法、历史背景等。请随意提问。' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (overrideInput?: string) => {
    const userMsg = overrideInput || input.trim();
    if (!userMsg) return;
    
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    if (!overrideInput) setInput('');
    setLoading(true);
    
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/ask`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            painting_id: paintingId, 
            agent_id: 'curator',
            question: userMsg,
            annotation_id: selectedAnnotation?.annotation_id || null,
            language: 'zh'
          }),
        }
      );
      const resData = await resp.json();
      
      if (resData.status === 'success' && resData.data) {
        setMessages((prev) => [...prev, { 
          role: 'assistant', 
          content: resData.data.answer,
          citations: resData.data.citations,
          followUps: resData.data.follow_up_questions
        }]);
      } else {
        throw new Error(resData.detail || '请求失败');
      }
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `系统错误，请稍后再试: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }; 

  // 当选中标注时，自动提问关于标注的内容
  useEffect(() => {
    if (selectedAnnotation) {
      const hint = `请解释画面的这个部分：“${selectedAnnotation.label}”（${selectedAnnotation.short_description}）。这有什么特殊的含义或技法吗？`;
      sendMessage(hint);
    }
  }, [selectedAnnotation]);

  return (
    <div className="chat-panel">
      <div className="messages" ref={containerRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`msg-wrapper ${msg.role}`}>
            <div className={`msg ${msg.role}`}> 
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
            {msg.citations && msg.citations.length > 0 && (
              <div className="citations">
                <span>参考来源：</span>
                {msg.citations.map((cit, i) => (
                  <span key={i} className="citation-chip">[{cit.source_id}] {cit.title}</span>
                ))}
              </div>
            )}
            {msg.followUps && msg.followUps.length > 0 && (
              <div className="follow-ups">
                {msg.followUps.map((q, i) => (
                  <button key={i} className="follow-up-btn" onClick={() => sendMessage(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="msg-wrapper assistant"><div className="msg assistant loading-indicator">思考中...</div></div>}
      </div>
      <div className="input-bar">
        <input
          type="text"
          placeholder="向策展人提问…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          disabled={loading}
        />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()}>
          发送
        </button>
      </div>
    </div>
  );
}
