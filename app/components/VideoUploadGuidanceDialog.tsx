"use client";
import { useEffect, useId, useRef } from "react";
import { VIDEO_UPLOAD_GUIDANCE } from "@/lib/videoGuidance";
export default function VideoUploadGuidanceDialog({ onClose, onContinue }: { onClose: () => void; onContinue: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} aria-labelledby={id} onCancel={onClose} style={{ border: "1px solid #cbd5e1", borderRadius: 14, padding: 22, width: "min(600px, calc(100vw - 32px))", maxHeight: "85vh", overflowY: "auto", color: "#0f172a", boxSizing: "border-box" }}>
    <h2 id={id} style={{ margin: "0 0 8px", fontSize: 21 }}>Show coaches what matters</h2>
    <p style={{ margin: "0 0 16px", color: "#475569" }}>A clear view of your skills matters more than a long highlight reel.</p>
    <ul style={{ paddingLeft: 20, display: "grid", gap: 12, lineHeight: 1.5 }}>
      {VIDEO_UPLOAD_GUIDANCE.map(tip => <li key={tip.label}><strong>{tip.label}:</strong> {tip.text}</li>)}
    </ul>
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
      <button type="button" onClick={onClose} style={{ padding: "10px 16px", border: "1px solid #cbd5e1", background: "white", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
      <button type="button" autoFocus onClick={() => { dialog.current?.close(); onContinue(); }} style={{ padding: "10px 16px", border: "1px solid #caa042", background: "#caa042", color: "#0f172a", borderRadius: 8, fontWeight: 800, cursor: "pointer" }}>Continue to upload</button>
    </div>
  </dialog>;
}
