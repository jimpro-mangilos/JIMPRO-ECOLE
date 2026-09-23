import { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';

/**
 * Capture de photo : caméra (getUserMedia) OU upload de fichier.
 * Renvoie un File (JPEG) via onCapture — l'appelant l'upload ensuite.
 */
export default function CameraCapture({ onCapture, compact = false, portrait = false }: { onCapture: (file: File) => void; compact?: boolean; portrait?: boolean }) {
  const [mode, setMode] = useState<'idle' | 'camera'>('idle');
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function startCamera() {
    setCameraError('');
    setMode('camera');
    // Portrait (photo d'identité) : hauteur > largeur. Paysage par défaut : 640×480.
    const base = portrait
      ? { width: { ideal: 720 }, height: { ideal: 1280 }, aspectRatio: { ideal: 9 / 16 } }
      : { width: { ideal: 640 }, height: { ideal: 480 } };
    try {
      // Caméra ARRIÈRE par défaut (photographier une personne/carte), avec repli
      // sur la caméra avant si l'appareil n'en a pas.
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { ...base, facingMode: 'environment' }, audio: false });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: { ...base, facingMode: 'user' }, audio: false });
      }
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
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (portrait) {
      // Recadrage portrait 3:4 centré (photo d'identité), quelle que soit l'orientation du capteur.
      const RATIO = 3 / 4;
      let sw = vw;
      let sh = vh;
      if (vw / vh > RATIO) sw = Math.floor(vh * RATIO);
      else sh = Math.floor(vw / RATIO);
      const sx = Math.floor((vw - sw) / 2);
      const sy = Math.floor((vh - sh) / 2);
      canvas.width = 720;
      canvas.height = 960;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    } else {
      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);
    }
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
            {portrait ? (
              <div className="mx-auto w-full max-w-[260px] aspect-[3/4]">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-56 object-cover" />
            )}
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
