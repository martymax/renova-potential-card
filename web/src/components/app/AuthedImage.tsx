import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { getToken } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Načte chráněný obrázek (/uploads/*) s Bearer tokenem a zobrazí ho jako blob.
 *  <img src> sám hlavičku neposílá, proto fetch + object URL. */
export function AuthedImage({ url, alt, className }: { url: string; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objUrl: string | undefined;
    let active = true;
    setFailed(false);
    setSrc(null);
    fetch(url, { headers: { authorization: `Bearer ${getToken() ?? ""}` } })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((blob) => {
        if (!active) return;
        objUrl = URL.createObjectURL(blob);
        setSrc(objUrl);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [url]);

  if (failed) {
    return (
      <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)}>
        <ImageOff className="h-5 w-5" aria-hidden="true" />
      </div>
    );
  }
  if (!src) return <div className={cn("animate-pulse bg-muted", className)} />;
  return <img src={src} alt={alt} className={className} />;
}
