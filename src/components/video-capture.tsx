"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { CAPTURE_TIPS } from "@/lib/utils";
import { Camera, Upload, Video } from "lucide-react";

export function VideoCapture({
  roomId,
  onUploaded,
}: {
  roomId: string;
  onUploaded: (jobId: string) => void;
}) {
  const [mode, setMode] = useState<"idle" | "recording" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
    } catch {
      setError("Camera access denied. Use file upload instead.");
    }
  }

  async function startRecording() {
    if (!streamRef.current) {
      await startCamera();
    }
    const stream = streamRef.current;
    if (!stream) return;

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: getSupportedMimeType() });
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      await uploadBlob(blob, `capture-${Date.now()}.webm`);
    };
    recorder.start();
    setMode("recording");
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setMode("idle");
  }

  async function uploadBlob(blob: Blob, filename: string) {
    setMode("uploading");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("video", blob, filename);
      formData.append("roomId", roomId);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Upload failed");
      }
      onUploaded(data.jobId);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed"
      );
      setMode("idle");
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    await uploadBlob(file, file.name);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <video
          ref={videoPreviewRef}
          autoPlay
          muted
          playsInline
          className="aspect-video w-full rounded-lg bg-black object-cover"
        />
        {previewUrl ? (
          <video
            src={previewUrl}
            controls
            className="mt-4 aspect-video w-full rounded-lg bg-black"
          />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={startCamera} variant="secondary">
          <Camera className="mr-2 h-4 w-4" />
          Enable camera
        </Button>
        {mode === "recording" ? (
          <Button type="button" onClick={stopRecording} variant="danger">
            <Video className="mr-2 h-4 w-4" />
            Stop recording
          </Button>
        ) : (
          <Button type="button" onClick={startRecording} disabled={mode === "uploading"}>
            <Video className="mr-2 h-4 w-4" />
            Record room video
          </Button>
        )}
        <label className="inline-flex cursor-pointer">
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={mode === "uploading"}
          />
          <span className="inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700">
            <Upload className="mr-2 h-4 w-4" />
            Upload video file
          </span>
        </label>
      </div>

      {mode === "uploading" ? (
        <p className="text-sm text-blue-300">Uploading and starting processing…</p>
      ) : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Capture tips</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
          {CAPTURE_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function getSupportedMimeType() {
  const types = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "video/webm";
}
