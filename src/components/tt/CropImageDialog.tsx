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

function imgNaturalSize(img: HTMLImageElement | null, width: number, height: number) {
  if (!img?.naturalWidth || !img.naturalHeight) return 1;
  return Math.max(width / img.naturalWidth, height / img.naturalHeight);
}

export function CropImageDialog({
  open,
  onOpenChange,
  file,
  aspect = 1,
  title,
  onSave,
}: CropImageDialogProps) {
  const [src, setSrc] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  // Portrait wallpapers match the phone-shaped app viewport; square icons stay square.
  const boxWidth = aspect === 1 ? 260 : 280;
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

  const getCropGeometry = () => {
    const img = imageRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return null;

    // Use exactly the same "cover" scale for the preview and exported image.
    const baseScale = Math.max(boxWidth / img.naturalWidth, boxHeight / img.naturalHeight);
    const scale = baseScale * zoom;
    const renderedW = img.naturalWidth * scale;
    const renderedH = img.naturalHeight * scale;
    const left = (boxWidth - renderedW) / 2 + offset.x;
    const top = (boxHeight - renderedH) / 2 + offset.y;

    return { img, scale, left, top, renderedW, renderedH };
  };

  const save = () => {
    const geometry = getCropGeometry();
    if (!geometry) return;

    const { img, scale, left, top } = geometry;
    const sourceW = boxWidth / scale;
    const sourceH = boxHeight / scale;

    // Convert the exact preview rectangle back into source-image coordinates.
    const sourceX = Math.max(0, Math.min(img.naturalWidth - sourceW, -left / scale));
    const sourceY = Math.max(0, Math.min(img.naturalHeight - sourceH, -top / scale));

    const outW = aspect === 1 ? 512 : 1080;
    const outH = aspect === 1 ? 512 : 1920;
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, outW, outH);

    onSave(canvas.toDataURL("image/jpeg", 0.9));
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
                onLoad={() => { setOffset({ x: 0, y: 0 }); }}
                className="pointer-events-none absolute max-w-none select-none"
                style={(() => {
                  const baseScale = imgNaturalSize(imageRef.current, boxWidth, boxHeight);
                  return {
                    width: imageRef.current ? imageRef.current.naturalWidth * baseScale * zoom : "auto",
                    height: imageRef.current ? imageRef.current.naturalHeight * baseScale * zoom : "auto",
                    maxWidth: "none",
                    left: "50%",
                    top: "50%",
                    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                  };
                })()}
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
