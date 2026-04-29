"use client";

import {useEffect, useId, useMemo, useRef, useState} from "react";
import {ImagePlus, Loader2, UploadCloud} from "lucide-react";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

type ImageUploadProps = {
  disabled?: boolean;
  onUploaded: (url: string | null) => void;
  value: string | null;
};

function isAllowedFile(file: File) {
  return ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number]);
}

function validateFile(file: File) {
  if (!isAllowedFile(file)) {
    throw new Error("Please upload a JPG, PNG, or WebP image.");
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new Error("Images must be 5MB or smaller.");
  }
}

export function ImageUpload({disabled = false, onUploaded, value}: ImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const previewUrl = useMemo(() => localPreviewUrl ?? value, [localPreviewUrl, value]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  function resetPreview(nextPreviewUrl: string | null) {
    setLocalPreviewUrl((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }

      return nextPreviewUrl;
    });
  }

  function openFilePicker() {
    if (disabled || isUploading) {
      return;
    }

    inputRef.current?.click();
  }

  async function uploadFile(file: File) {
    try {
      validateFile(file);
      resetPreview(URL.createObjectURL(file));
      setIsUploading(true);
      setProgress(0);

      const formData = new FormData();
      formData.append("file", file);

      const payload = await new Promise<{url: string}>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", "/api/admin/homepage/upload");
        request.responseType = "json";
        request.upload.onprogress = (event) => {
          if (!event.lengthComputable) {
            return;
          }

          setProgress(Math.round((event.loaded / event.total) * 100));
        };
        request.onerror = () => reject(new Error("The upload could not be completed."));
        request.onload = () => {
          const response = request.response as {message?: string; url?: string} | null;

          if (request.status < 200 || request.status >= 300 || !response?.url) {
            reject(new Error(response?.message ?? "The upload could not be completed."));
            return;
          }

          resolve({url: response.url});
        };
        request.send(formData);
      });

      onUploaded(payload.url);
      resetPreview(payload.url);
      setProgress(100);
      toast.success("Image uploaded", {
        description: "The image is now available for this homepage section."
      });
    } catch (error) {
      resetPreview(null);
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Please try another image."
      });
    } finally {
      setIsUploading(false);
      window.setTimeout(() => setProgress(0), 500);
    }
  }

  async function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await uploadFile(file);
    event.target.value = "";
  }

  async function handleDrop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    await uploadFile(file);
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        accept=".jpg,.jpeg,.png,.webp"
        className="sr-only"
        disabled={disabled || isUploading}
        id={inputId}
        onChange={handleInputChange}
        type="file"
      />

      <button
        className={cn(
          "group relative flex min-h-[220px] w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#e8e0d0] bg-[#f7f3ec] px-5 py-6 text-center transition-colors",
          isDragging ? "border-[#c9a84c] bg-[#f0ebe0]" : "hover:border-[#c9a84c]",
          disabled || isUploading ? "cursor-not-allowed opacity-80" : "cursor-pointer"
        )}
        disabled={disabled || isUploading}
        onClick={openFilePicker}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        type="button"
      >
        {previewUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{backgroundImage: `url(${previewUrl})`}}
          />
        ) : null}
        <div className="absolute inset-0 bg-[rgba(17,29,21,0.15)]" />
        <div className="relative z-10 flex max-w-sm flex-col items-center gap-3 text-[#1c3d2e]">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/85 text-[#1c3d2e] shadow-sm">
            {isUploading ? (
              <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
            ) : previewUrl ? (
              <ImagePlus aria-hidden="true" className="h-5 w-5" />
            ) : (
              <UploadCloud aria-hidden="true" className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">
              {isUploading ? "Uploading image..." : "Drag an image here or click to browse"}
            </p>
            <p className="text-xs leading-5 text-[#1c3d2e]/70">
              JPG, PNG, or WebP up to 5MB
            </p>
          </div>
        </div>
      </button>

      {isUploading || progress > 0 ? (
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-[#e8e0d0]">
            <div
              className="h-full rounded-full bg-[#c9a84c] transition-[width]"
              style={{width: `${progress}%`}}
            />
          </div>
          <p className="text-xs text-[#7a9a85]">{progress}% uploaded</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          disabled={disabled || isUploading}
          onClick={openFilePicker}
          type="button"
          variant="outline"
        >
          {previewUrl ? "Replace image" : "Choose image"}
        </Button>
        {value ? (
          <Button
            disabled={disabled || isUploading}
            onClick={() => {
              onUploaded(null);
              resetPreview(null);
            }}
            type="button"
            variant="ghost"
          >
            Clear image
          </Button>
        ) : null}
      </div>
    </div>
  );
}
