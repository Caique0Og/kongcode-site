import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/** Mostra as fotos de um produto em tamanho grande, com setas e miniaturas. */
export function ImageLightbox({
  images,
  title,
  index,
  onClose,
}: {
  images: string[];
  title: string;
  index: number | null;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(index ?? 0);
  useEffect(() => {
    if (index != null) setCurrent(index);
  }, [index]);

  const total = images.length;
  const go = (step: number) => setCurrent((c) => (c + step + total) % total);

  useEffect(() => {
    if (index == null || total < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <Dialog open={index != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl gap-3 p-3 sm:p-4">
        <DialogTitle className="sr-only">Fotos de {title}</DialogTitle>
        <div className="relative flex items-center justify-center">
          <img
            src={images[current]}
            alt={`${title}, foto ${current + 1} de ${total}`}
            className="max-h-[75vh] w-full rounded object-contain"
          />
          {total > 1 && (
            <>
              <button
                type="button"
                aria-label="Foto anterior"
                onClick={() => go(-1)}
                className="absolute left-2 rounded-full bg-background/80 p-2 hover:bg-background"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Próxima foto"
                onClick={() => go(1)}
                className="absolute right-2 rounded-full bg-background/80 p-2 hover:bg-background"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
        </div>
        {total > 1 && (
          <div className="flex justify-center gap-2 overflow-x-auto">
            {images.map((src, i) => (
              <button
                type="button"
                key={src}
                aria-label={`Ver foto ${i + 1}`}
                onClick={() => setCurrent(i)}
                className={`shrink-0 overflow-hidden rounded border-2 ${i === current ? "border-primary" : "border-transparent opacity-70"}`}
              >
                <img src={src} alt="" className="h-14 w-14 object-cover" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
