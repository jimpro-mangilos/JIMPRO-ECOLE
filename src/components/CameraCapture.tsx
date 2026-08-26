import { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';

/**
 * Capture de photo : caméra (getUserMedia) OU upload de fichier.
 * Renvoie un File (JPEG) via onCapture — l'appelant l'upload ensuite.
 */
export default function CameraCapture({ onCapture, compact = false }: { onCapture: (file: File) => void; compact?: boolean }) {
  const [mode, setMode] = useState<'idle' | 'camera'>('idle');
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function startCamera() {
    setCameraError('');
    setMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      streamRef.current = stream;
      // attendre que le flux soit prêt
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch (e: any) {
      setCameraError("Caméra inaccessible : " + (e?.message || 'autorisation refusée'));
      setMode('idle');
    }
  }

  function stopCamera() {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setMode('idle');
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) { setCameraError("La caméra n'est pas prête. Réessayez."); return; }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) onCapture(new File([blob], 'photo-camera.jpg', { type: 'image/jpeg' }));
      stopCamera();
    }, 'image/jpeg', 0.92);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onCapture(f);
    e.target.value = '';
  }

  return (
    <div>
      {mode === 'camera' ? (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-56 object-cover" />
            {cameraError && <p className="text-xs text-red-300 p-2">{cameraError}</p>}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={capture} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"><Camera className="w-3.5 h-3.5" /> Capturer</button>
            <button type="button" onClick={stopCamera} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300"><X className="w-3.5 h-3.5" /> Annuler</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={startCamera} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"><Camera className="w-3.5 h-3.5" /> {compact ? 'Photo' : 'Prendre une photo'}</button>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300"><Upload className="w-3.5 h-3.5" /> {compact ? 'Upload' : 'Importer une photo'}</button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        </div>
      )}
    </div>
  );
}
