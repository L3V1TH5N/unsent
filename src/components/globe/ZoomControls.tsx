// src/components/globe/ZoomControls.tsx
'use client'

interface Props {
  onZoomIn: () => void
  onZoomOut: () => void
}

export default function ZoomControls({ onZoomIn, onZoomOut }: Props) {
  return (
    <div className="zc" role="group" aria-label="Globe zoom controls">
      <button type="button" className="zb" onClick={onZoomIn} aria-label="Zoom in">+</button>
      <button type="button" className="zb" onClick={onZoomOut} aria-label="Zoom out">–</button>

      <style>{`
        .zc{
          position:absolute; right:1.5rem; bottom:5.4rem; z-index:10;
          display:flex; flex-direction:column; gap:.4rem;
        }
        .zb{
          width:34px; height:34px; border-radius:6px;
          background:rgba(4,8,4,.78); border:1px solid rgba(140,180,100,.35);
          color:rgba(210,230,180,.92); font-size:1.05rem; line-height:1; font-family:var(--font-body);
          cursor:pointer; backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
          display:flex; align-items:center; justify-content:center;
          transition:background .15s, border-color .15s, transform .12s;
        }
        .zb:hover{ background:rgba(100,160,60,.22); border-color:rgba(140,200,90,.6); transform:translateY(-1px); }
        .zb:active{ transform:translateY(0) scale(.94); }
        @media(max-width:768px){ .zc{ right:1rem; bottom:1.2rem; } }
      `}</style>
    </div>
  )
}