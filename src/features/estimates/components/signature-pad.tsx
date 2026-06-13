"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/hooks/use-translation";

interface SignaturePadProps {
  onSign: (dataUrl: string, name: string) => void;
  pending?: boolean;
}

/**
 * Captura de assinatura em <canvas> (pointer events). Exporta PNG como data
 * URL — gravado direto no doc (sem Storage ainda). Mantém resolução baixa
 * para o data URL caber folgado no limite do documento Firestore.
 */
export function SignaturePad({ onSign, pending = false }: SignaturePadProps) {
  const dict = useTranslation();
  const s = dict.estimates.signature;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
  }, []);

  function pos(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = pos(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  }

  function end() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  function submit() {
    const canvas = canvasRef.current;
    if (!canvas || !hasInk) return;
    onSign(canvas.toDataURL("image/png"), name.trim());
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="sign-name">{s.nameLabel}</Label>
        <Input
          id="sign-name"
          value={name}
          placeholder={s.namePlaceholder}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{s.drawLabel}</Label>
        <canvas
          ref={canvasRef}
          width={480}
          height={160}
          className="w-full touch-none rounded-md border bg-white"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={clear} disabled={!hasInk}>
          {s.clear}
        </Button>
        <Button type="button" onClick={submit} disabled={!hasInk || pending}>
          {pending ? dict.common.loading : s.confirm}
        </Button>
      </div>
    </div>
  );
}
