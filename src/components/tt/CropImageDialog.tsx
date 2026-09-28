import { useEffect, useRef, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

type CropImageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  aspect?: number;
  title: string;
  onSave: (dataUrl: string) => void;
};

export function CropImageDialog({
  open,
  onOpenChange,
  file,
  aspect = 1,
  title,
  onSave,
}: CropImageDialogProps) {
  const [src, setSrc] = useState("");
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const boxWidth = 300;
  const boxHeight = boxWidth / aspect;

  useEffect(() => {
    if (!file) {
      setSrc("");
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const save = () => {
    const img = imageRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return;
    const baseScale = Math.max(boxWidth / img.naturalWidth, boxHeight / img.naturalHeight);
    const scale = baseScale * zoom;
    const renderedW = img.naturalWidth * scale;
    const renderedH = img.naturalHeight * scale;
    const left = (boxWidth - renderedW) / 2 + offset.x;
    const top = (boxHeight - renderedH) / 2 + offset.y;
    const sourceX = Math.max(0, Math.min(img.naturalWidth - boxWidth / scale, -left / scale));
    const sourceY = Math.max(0, Math.min(img.naturalHeight - boxHeight / scale, -top / scale));
    const sourceW = boxWidth / scale;
    const sourceH = boxHeight / scale;
    const canvas = document.createElement("canvas");
    const outW = aspect === 1 ? 512 : 900;
    const outH = Math.round(outW / aspect);
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, outW, outH);
    onSave(canvas.toDataURL("image/jpeg", 0.88));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Drag the picture to position it, then use the slider to zoom.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div
            className="relative overflow-hidden rounded-2xl bg-black/80 touch-none"
            style={{ width: boxWidth, height: boxHeight }}
            onPointerDown={(e) => {
              setDragging(true);
              dragStart.current = { x: e.clientX, y: e.clientY };
              offsetStart.current = offset;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!dragging) return;
              setOffset({
                x: offsetStart.current.x + e.clientX - dragStart.current.x,
                y: offsetStart.current.y + e.clientY - dragStart.current.y,
              });
            }}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
          >
            {src && (
              <img
                ref={imageRef}
                src={src}
                alt="Crop preview"
                draggable={false}
                onLoad={(e) => { setOffset({ x: 0, y: 0 }); setNatural({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight }); }}
                className="pointer-events-none absolute max-w-none select-none"
                style={{
                  width: "auto",
                  height: "auto",
                  minWidth: "100%",
                  minHeight: "100%",
                  maxWidth: "none",
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
                  left: "50%",
                  top: "50%",
                }}
              />
            )}
            <div className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-white/80" />
          </div>
          <div className="flex w-full items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}><RotateCcw className="size-4" /></Button>
            <Slider value={[zoom]} min={1} max={3} step={0.01} onValueChange={([v]) => setZoom(v ?? 1)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" className="rounded-2xl" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="rounded-2xl" onClick={save}><Check className="size-4" /> Use image</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
