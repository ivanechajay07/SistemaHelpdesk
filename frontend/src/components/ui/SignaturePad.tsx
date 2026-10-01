import React, { useEffect, useRef, useState } from 'react';
import { PenLine, RotateCcw } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (dataUrl: string | null) => void;
  defaultValue?: string | null;
}

export default function SignaturePad({
  label,
  placeholder = 'Firme aquí',
  disabled = false,
  onChange,
  defaultValue,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    if (defaultValue) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasContent(true);
      };
      img.src = defaultValue;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasContent(false);
    }
  }, [defaultValue]);

  const getPosition = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.preventDefault();
    drawingRef.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPosition(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPosition(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let has = false;
    for (let i = 3; i < pixelData.length; i += 4) {
      if (pixelData[i] !== 0) {
        has = true;
        break;
      }
    }
    setHasContent(has);
    onChange?.(has ? canvas.toDataURL('image/png') : null);
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
    onChange?.(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <PenLine className="w-3.5 h-3.5" /> {label} *
        </label>
        {hasContent && !disabled && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}
      </div>
      <div
        className={`relative rounded-xl overflow-hidden border-2 bg-white dark:bg-slate-50 transition-colors ${
          hasContent ? 'border-emerald-400' : 'border-slate-200 dark:border-slate-700'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={700}
          height={220}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          style={{ touchAction: 'none' }}
          className="block w-full h-auto cursor-crosshair"
        />
        {!hasContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-slate-300 dark:text-slate-500 text-sm italic">{placeholder}</span>
          </div>
        )}
      </div>
    </div>
  );
}