"use client";

import {LoaderCircle, UploadCloud} from "lucide-react";
import {useState} from "react";
import {useTranslations} from "next-intl";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {type VisaDocumentType, type VisaUploadedDocument} from "../types";
import {
  formatVisaDocumentDate,
  formatVisaUploadedFileSize
} from "../lib/formatters";

type VisaDocumentUploadFieldProps = {
  accept: string;
  applicationId: string;
  description: string;
  documentType: VisaDocumentType;
  existingUploads: VisaUploadedDocument[];
  isRequired: boolean;
  label: string;
  locale: string;
  onUploadComplete: (upload: VisaUploadedDocument) => void;
};

function uploadVisaDocumentWithProgress(
  applicationId: string,
  documentType: VisaDocumentType,
  file: File,
  onProgress: (value: number) => void
) {
  return new Promise<VisaUploadedDocument>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.set("applicationId", applicationId);
    formData.set("documentType", documentType);
    formData.set("file", file);

    xhr.open("POST", "/api/visa/uploads");
    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress(Math.round((event.loaded / event.total) * 100));
    });
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) {
        return;
      }

      try {
        const payload = JSON.parse(xhr.responseText) as
          | {message?: string}
          | VisaUploadedDocument;

        if (xhr.status < 200 || xhr.status >= 300) {
          reject(
            new Error(
              "message" in payload && typeof payload.message === "string"
                ? payload.message
                : "Unable to upload the visa document."
            )
          );
          return;
        }

        resolve(payload as VisaUploadedDocument);
      } catch {
        reject(new Error("Unable to upload the visa document."));
      }
    };
    xhr.onerror = () => reject(new Error("Unable to upload the visa document."));
    xhr.send(formData);
  });
}

export function VisaDocumentUploadField({
  accept,
  applicationId,
  description,
  documentType,
  existingUploads,
  isRequired,
  label,
  locale,
  onUploadComplete
}: VisaDocumentUploadFieldProps) {
  const t = useTranslations("Visa.uploads");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFileSelection(file: File | undefined) {
    if (!file) {
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    setProgress(0);

    try {
      const upload = await uploadVisaDocumentWithProgress(
        applicationId,
        documentType,
        file,
        setProgress
      );

      onUploadComplete(upload);
      toast.success(t("successTitle"), {
        description: t("successDescription", {fileName: upload.fileName})
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("errorFallback");

      setErrorMessage(message);
      toast.error(t("errorTitle"), {
        description: message
      });
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  }

  return (
    <div className="rounded-lg border border-border/80 bg-background/70 p-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">{label}</h3>
          <span className="rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            {isRequired ? t("required") : t("optional")}
          </span>
        </div>
        <p className="text-sm leading-7 text-muted-foreground">{description}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
          {isUploading ? (
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud aria-hidden="true" className="h-4 w-4" />
          )}
          {isUploading ? t("uploading") : t("uploadAction")}
          <input
            type="file"
            accept={accept}
            className="sr-only"
            disabled={isUploading}
            onChange={(event) => {
              void handleFileSelection(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </label>
        <p className="text-xs text-muted-foreground">{t("supportedFormats")}</p>
      </div>

      {isUploading ? (
        <div className="mt-4 space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-border/70">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{width: `${progress}%`}}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("progressLabel", {progress})}</p>
        </div>
      ) : null}

      {errorMessage ? <p className="mt-4 text-sm text-destructive">{errorMessage}</p> : null}

      <div className="mt-4 space-y-3">
        {existingUploads.length > 0 ? (
          existingUploads.map((upload) => (
            <div
              key={upload.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-card/80 p-4 text-sm"
            >
              <div>
                <p className="font-medium text-foreground">{upload.fileName}</p>
                <p className="text-muted-foreground">
                  {formatVisaUploadedFileSize(upload.byteSize)} |{" "}
                  {formatVisaDocumentDate(upload, locale)}
                </p>
              </div>
              <Button asChild variant="outline" className="rounded-lg px-5">
                <a href={upload.accessPath} target="_blank" rel="noreferrer">
                  {t("previewAction")}
                </a>
              </Button>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
        )}
      </div>
    </div>
  );
}
