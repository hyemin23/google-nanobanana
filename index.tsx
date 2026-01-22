import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Render Error:', error);
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; background:#020617; color:#f87171; font-family:sans-serif; text-align:center; padding:40px;">
        <h2 style="font-weight:900;">BOOTSTRAP ERROR</h2>
        <p style="color:#64748b; font-size:14px; margin-top:10px;">라이브러리 로드에 실패했습니다. 캐시 삭제 후 새로고침 해주세요.</p>
        <pre style="background:#0f172a; padding:15px; border-radius:10px; font-size:10px; color:#94a3b8; margin-top:20px; text-align:left; border:1px solid #1e293b;">${error instanceof Error ? error.message : String(error)}</pre>
      </div>
    `;
  }
}