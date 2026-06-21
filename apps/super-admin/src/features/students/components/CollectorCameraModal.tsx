'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FiCamera, FiRefreshCw, FiX } from 'react-icons/fi';

interface CollectorCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  uploading?: boolean;
}

export default function CollectorCameraModal({
  isOpen,
  onClose,
  onCapture,
  uploading = false,
}: CollectorCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(
    async (facing: 'user' | 'environment') => {
      stopCamera();
      setCameraError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera is not supported in this browser.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        if (facing === 'environment') {
          setFacingMode('user');
          await startCamera('user');
          return;
        }
        setCameraError(
          'Unable to access camera. Allow camera permission in your browser, or upload a photo instead.'
        );
      }
    },
    [stopCamera]
  );

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setPreviewUrl(null);
      setCameraError(null);
      setFacingMode('environment');
      return;
    }

    setPreviewUrl(null);
    startCamera('environment');

    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  const handleFlipCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    setPreviewUrl(canvas.toDataURL('image/jpeg', 0.92));
    stopCamera();
  };

  const handleRetake = () => {
    setPreviewUrl(null);
    startCamera(facingMode);
  };

  const handleUsePhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(
          new File([blob], `collector-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          })
        );
      },
      'image/jpeg',
      0.92
    );
  };

  const handleClose = () => {
    stopCamera();
    setPreviewUrl(null);
    onClose();
  };

  return (
    <AppModal open={isOpen} onClose={handleClose}>
      <div className="flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">Capture collector photo</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Close camera"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {cameraError ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {cameraError}
            </p>
          ) : previewUrl ? (
            <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
              <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          <div className="flex flex-wrap gap-2 justify-between">
            <div className="flex gap-2">
              {!previewUrl && !cameraError && (
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  className="border px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50"
                >
                  <FiRefreshCw size={15} />
                  Flip camera
                </button>
              )}
              {previewUrl && (
                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={uploading}
                  className="border px-3 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Retake
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="border px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              {!previewUrl && !cameraError ? (
                <button
                  type="button"
                  onClick={handleCapture}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700 flex items-center gap-2"
                >
                  <FiCamera size={16} />
                  Capture
                </button>
              ) : previewUrl ? (
                <button
                  type="button"
                  onClick={handleUsePhoto}
                  disabled={uploading}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {uploading ? 'Saving...' : 'Use photo'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </AppModal>
  );
}
