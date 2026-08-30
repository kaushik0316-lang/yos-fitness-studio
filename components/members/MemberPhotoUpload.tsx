"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { toTitleCase } from "@/lib/utils/titleCase";

type Props = {
  memberId: string;
  fullName: string;
  photoUrl: string | null;
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export function MemberPhotoUpload({ memberId, fullName, photoUrl }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(photoUrl);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("memberId", memberId);

      const res = await fetch("/api/members/photo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      setPreview(data.url);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setPreview(photoUrl); // revert preview on error
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative group focus:outline-none"
        title="Click to upload photo"
      >
        {/* Avatar / photo */}
        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white text-xl font-extrabold shadow-lg shadow-orange-200/60 flex-shrink-0">
          {preview ? (
            <Image src={preview} alt={fullName} width={80} height={80} className="w-full h-full object-cover" unoptimized />
          ) : (
            <span>{getInitials(fullName)}</span>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading
            ? <Loader2 className="h-6 w-6 text-white animate-spin" />
            : <Camera className="h-6 w-6 text-white" />
          }
        </div>
        {/* Camera badge — always visible when no photo */}
        {!preview && !uploading && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md">
            <Camera className="h-3 w-3 text-orange-500" />
          </div>
        )}
      </button>

      {error && <p className="text-xs text-red-500 font-medium text-center max-w-[120px]">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
