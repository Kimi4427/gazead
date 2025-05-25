
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CameraPreview } from '@/components/gaze-ad/camera-preview';
import { Input } from '@/components/ui/input';
import { calibrateGaze } from '@/ai/flows/calibrate-gaze';
import { analyzeGaze } from '@/ai/flows/analyze-gaze';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, Target, Eye, EyeOff, AlertTriangle, CheckCircle2, Focus, SkipForward, RefreshCcw, Play, Pause, Volume2, VolumeX, Volume1, Maximize, Minimize, Image as ImageIcon } from 'lucide-react';
import { cn } from "@/lib/utils";
import adConfigData from '@/config/ad-config.json';

const MAIN_VIDEO_SRC = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"; // Sintel DASH stream
const GAZE_ANALYSIS_INTERVAL = 2000;
const MOVEMENT_DETECTION_INTERVAL = 500;
const MOVEMENT_DETECTION_DOWNSCALE_WIDTH = 16;
const MOVEMENT_DETECTION_DOWNSCALE_HEIGHT = 12;
const MOVEMENT_THRESHOLD = 3000;
const IMAGE_CAPTCHA_LENGTH = 4;

interface AdBreakConfig {
  id: string;
  triggerTime: number;
  adSrc: string;
  skipTime?: number | null;
}

const AD_BREAKS: AdBreakConfig[] = adConfigData as AdBreakConfig[];

interface ImageCaptchaChallenge {
  id: string;
  text: string;
  imageDataUri: string;
}

const generateRandomString = (length: number) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const generateSvgDataUri = (text: string): string => {
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="60" viewBox="0 0 180 60">`;
  svgContent += `<rect width="100%" height="100%" fill="#f0f0f0"/>`; // Light gray background

  // Add some random lines for noise
  for (let i = 0; i < 5; i++) {
    svgContent += `<line x1="${Math.random() * 180}" y1="${Math.random() * 60}" x2="${Math.random() * 180}" y2="${
      Math.random() * 60
    }" stroke="#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}" stroke-width="1"/>`;
  }

  const colors = ['#d6336c', '#ae3ec9', '#7048e8', '#4263eb', '#1c7ed6', '#0ca678', '#37b24d', '#f59f00'];
  const startX = 20;
  const charSpacing = 35;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const x = startX + i * charSpacing + (Math.random() * 10 - 5);
    const y = 35 + (Math.random() * 10 - 5);
    const rotation = Math.random() * 30 - 15; // Rotate between -15 and 15 degrees
    const color = colors[Math.floor(Math.random() * colors.length)];
    svgContent += `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="${color}" transform="rotate(${rotation}, ${x}, ${y})">${char}</text>`;
  }
   // Add more noise lines over the text
  for (let i = 0; i < 3; i++) {
    svgContent += `<line x1="${Math.random() * 180}" y1="${Math.random() * 60}" x2="${Math.random() * 180}" y2="${
      Math.random() * 60
    }" stroke="#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}" stroke-width="1" opacity="0.7"/>`;
  }
  svgContent += `</svg>`;
  return `data:image/svg+xml;base64,${btoa(svgContent)}`;
};


const generateImageCaptchaChallenge = (): ImageCaptchaChallenge => {
  const text = generateRandomString(IMAGE_CAPTCHA_LENGTH);
  const imageDataUri = generateSvgDataUri(text);
  return {
    id: Date.now().toString(), // Simple unique ID
    text,
    imageDataUri,
  };
};


export default function HomePageWithGazeAd() {
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const adVideoRef = useRef<HTMLVideoElement>(null);
  const adVideoPreviewRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const skipAdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const adGazeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const adMovementIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isAdBreakActive, setIsAdBreakActive] = useState(false);
  const [currentAdConfig, setCurrentAdConfig] = useState<AdBreakConfig | null>(null);
  const [playedAdBreakIds, setPlayedAdBreakIds] = useState<Set<string>>(new Set());

  const [adCameraStream, setAdCameraStream] = useState<MediaStream | null>(null);
  const [adHasPermission, setAdHasPermission] = useState<boolean | null>(null);
  const [isAdPreviewReady, setIsAdPreviewReady] = useState(false);
  const [adIsCalibrated, setAdIsCalibrated] = useState<boolean>(false);
  const [adIsLooking, setAdIsLooking] = useState<boolean | null>(null);
  const [adIsWindowFocused, setAdIsWindowFocused] = useState<boolean>(true);
  const [adCurrentError, setAdCurrentError] = useState<string | null>(null);
  const [adIsLoading, setAdIsLoading] = useState<boolean>(false);
  const [adIsCameraStarting, setAdIsCameraStarting] = useState<boolean>(false);
  const [adPreviousMovementFrame, setAdPreviousMovementFrame] = useState<number[] | null>(null);
  
  const [skipAdCountdown, setSkipAdCountdown] = useState<number | null>(null);

  const [adImageCaptchaChallenge, setAdImageCaptchaChallenge] = useState<ImageCaptchaChallenge | null>(null);
  const [adImageCaptchaInput, setAdImageCaptchaInput] = useState<string>('');
  const [adImageCaptchaVerified, setAdImageCaptchaVerified] = useState<boolean>(false);
  const [adImageCaptchaError, setAdImageCaptchaError] = useState<string | null>(null);
  
  const [isMainVideoPlaying, setIsMainVideoPlaying] = useState(false);
  const [mainVideoCurrentTime, setMainVideoCurrentTime] = useState(0);
  const [mainVideoDuration, setMainVideoDuration] = useState(0);
  const [mainVideoVolume, setMainVideoVolume] = useState(1);
  const [isMainVideoMuted, setIsMainVideoMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const { toast } = useToast();
  
  const shouldAdPlay = adImageCaptchaVerified && adIsCalibrated && adIsLooking === true && adIsWindowFocused;

  const requestAdCameraAccess = useCallback(async () => {
    if (adCameraStream || adIsCameraStarting) return;
    setAdIsCameraStarting(true);
    setAdCurrentError(null);
    setAdHasPermission(null);
    setIsAdPreviewReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setAdCameraStream(stream);
      setAdHasPermission(true);
    } catch (err) {
      console.error("Ad camera access denied:", err);
      setAdCurrentError("Camera access denied. Please enable camera permissions to watch the ad.");
      setAdHasPermission(false);
      toast({ title: "Camera Required", description: "Camera access is needed for the ad experience.", variant: "destructive" });
    } finally {
      setAdIsCameraStarting(false);
    }
  }, [adCameraStream, adIsCameraStarting, toast, setAdCurrentError, setAdHasPermission, setIsAdPreviewReady, setAdIsCameraStarting]);

  const adCaptureFrame = useCallback((videoElement: HTMLVideoElement | null): string | null => {
    if (!videoElement || videoElement.readyState < videoElement.HAVE_METADATA || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      console.warn("adCaptureFrame: Video element not ready or has no dimensions for capture.");
      return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn("adCaptureFrame: Failed to get 2d context from canvas.");
      return null;
    }
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg');
  }, []);

  const handleAdCalibration = useCallback(async () => {
    if (!isAdPreviewReady) {
      setAdCurrentError("Camera preview not ready for calibration. Please wait.");
      toast({ title: "Calibration Failed", description: "Camera preview was not ready.", variant: "destructive" });
      return;
    }
    setAdCurrentError(null);
    setAdIsLoading(true);
    const imageDataUrl = adCaptureFrame(adVideoPreviewRef.current);

    if (!imageDataUrl) {
      setAdCurrentError("Failed to capture image for ad calibration.");
      toast({ title: "Calibration Capture Failed", description: "Camera preview might not be ready.", variant: "destructive" });
      setAdIsLoading(false);
      return;
    }

    try {
      await calibrateGaze({ photoDataUri: imageDataUrl });
      setAdIsCalibrated(true);
      if (currentAdConfig && currentAdConfig.skipTime !== null && currentAdConfig.skipTime !== undefined) {
        setSkipAdCountdown(currentAdConfig.skipTime);
      }
      toast({ title: "Calibration Successful!", description: "Ad attention tracking active.", variant: "default", duration: 3000, action: <CheckCircle2 className="text-green-500" /> });
    } catch (err) {
      console.error("Ad calibration error:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during calibration.";
      setAdCurrentError(`AI calibration failed. Error: ${errorMessage}`);
      toast({ title: "Calibration Failed", variant: "destructive", description: errorMessage });
      setAdIsCalibrated(false);
    } finally {
      setAdIsLoading(false);
    }
  }, [adCaptureFrame, toast, isAdPreviewReady, currentAdConfig, setAdCurrentError, setAdIsLoading, setAdIsCalibrated, setSkipAdCountdown]);

  const performAdGazeCheck = useCallback(async () => {
    if (adIsLoading || !adVideoPreviewRef.current || !isAdPreviewReady) return;
    const imageDataUrl = adCaptureFrame(adVideoPreviewRef.current);
    if (!imageDataUrl) {
      console.warn("Ad gaze check: Failed to capture frame.");
      return;
    }
    setAdIsLoading(true);
    try {
      const result = await analyzeGaze({ photoDataUri: imageDataUrl });
      setAdIsLooking(result.isLookingAtScreen);
    } catch (err) {
      console.error("Ad gaze analysis failed:", err);
      if (adIsLooking !== null) {
        toast({ title: "Gaze Analysis Error", variant: "destructive", description: "Could not determine if you're looking.", duration: 3000 });
      }
      setAdIsLooking(null); 
    } finally {
      setAdIsLoading(false);
    }
  }, [adCaptureFrame, toast, adIsLoading, adIsLooking, isAdPreviewReady, setAdIsLoading, setAdIsLooking]);

  const adProcessFrameForMovement = useCallback(async (
    imageDataUrl: string,
    targetWidth: number,
    targetHeight: number
  ): Promise<number[]> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve([]); return; }
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const grayscalePixelData = [];
        for (let i = 0; i < imgData.data.length; i += 4) {
          const r = imgData.data[i]; const g = imgData.data[i + 1]; const b = imgData.data[i + 2];
          grayscalePixelData.push(Math.round(0.299 * r + 0.587 * g + 0.114 * b));
        }
        resolve(grayscalePixelData);
      };
      img.onerror = () => { console.warn("Error loading image for ad movement detection"); resolve([]); }
      img.src = imageDataUrl;
    });
  }, []);

  const adDetectMovementAndTriggerGazeCheck = useCallback(async () => {
    if (!adVideoPreviewRef.current || !adIsCalibrated || adIsLoading || !isAdPreviewReady) return;
    const imageDataUrl = adCaptureFrame(adVideoPreviewRef.current);
    if (!imageDataUrl) return;

    const currentFrameData = await adProcessFrameForMovement(
      imageDataUrl,
      MOVEMENT_DETECTION_DOWNSCALE_WIDTH,
      MOVEMENT_DETECTION_DOWNSCALE_HEIGHT
    );

    if (adPreviousMovementFrame && currentFrameData.length > 0 && adPreviousMovementFrame.length === currentFrameData.length) {
      let diffSum = 0;
      for (let i = 0; i < currentFrameData.length; i++) {
        diffSum += Math.abs(currentFrameData[i] - adPreviousMovementFrame[i]);
      }
      if (diffSum > MOVEMENT_THRESHOLD) {
        performAdGazeCheck();
      }
    }
    setAdPreviousMovementFrame(currentFrameData.length > 0 ? currentFrameData : null);
  }, [adCaptureFrame, adPreviousMovementFrame, adIsCalibrated, performAdGazeCheck, adProcessFrameForMovement, adIsLoading, isAdPreviewReady, setAdPreviousMovementFrame]);

  const resumeMainVideo = useCallback(() => {
    setIsAdBreakActive(false);
    if (currentAdConfig) {
      setPlayedAdBreakIds(prev => new Set(prev).add(currentAdConfig.id));
    }
    if (mainVideoRef.current && mainVideoRef.current.paused) {
      mainVideoRef.current.play().catch(e => console.error("Error resuming main video:", e));
    }
    setAdImageCaptchaVerified(false);
    setAdImageCaptchaChallenge(null);
    setAdImageCaptchaInput('');
    setAdImageCaptchaError(null);
    setCurrentAdConfig(null);
    setAdIsCalibrated(false);
    setAdIsLooking(null);
    setAdCurrentError(null);
    setIsAdPreviewReady(false);
    setSkipAdCountdown(null);
    if (skipAdTimerRef.current) clearTimeout(skipAdTimerRef.current);

    if (adCameraStream) {
      adCameraStream.getTracks().forEach(track => track.stop());
      setAdCameraStream(null);
      setAdHasPermission(null);
    }
  }, [currentAdConfig, adCameraStream, setPlayedAdBreakIds, setCurrentAdConfig, setAdIsCalibrated, setAdIsLooking, setAdCurrentError, setIsAdPreviewReady, setSkipAdCountdown, setAdCameraStream, setAdHasPermission, setAdImageCaptchaVerified, setAdImageCaptchaChallenge, setAdImageCaptchaInput, setAdImageCaptchaError]);

  const handleAdVideoEnded = useCallback(() => {
    resumeMainVideo();
  }, [resumeMainVideo]);

  const scheduleHideControls = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isMainVideoPlaying) { 
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isMainVideoPlaying]);

  const handleMouseEnterVideo = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) { 
      clearTimeout(controlsTimeoutRef.current);
    }
  }, []);

  const handleMouseLeaveVideo = useCallback(() => {
    scheduleHideControls();
  }, [scheduleHideControls]);
  
  const handleMouseMoveVideo = useCallback(() => {
    setShowControls(true);
    scheduleHideControls(); 
  }, [scheduleHideControls]);

  const togglePlayPause = useCallback(() => {
    if (mainVideoRef.current) {
      if (mainVideoRef.current.paused || mainVideoRef.current.ended) {
        mainVideoRef.current.play();
      } else {
        mainVideoRef.current.pause();
      }
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (mainVideoRef.current && mainVideoRef.current.duration !== Infinity && !isNaN(mainVideoRef.current.duration)) {
      setMainVideoDuration(mainVideoRef.current.duration);
    }
  }, [setMainVideoDuration]);

  const handlePlay = useCallback(() => {
    setIsMainVideoPlaying(true);
    scheduleHideControls();
  }, [scheduleHideControls, setIsMainVideoPlaying]);

  const handlePause = useCallback(() => {
    setIsMainVideoPlaying(false);
    if (controlsTimeoutRef.current) { 
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true); 
  }, [setIsMainVideoPlaying, setShowControls]);
  
  const handleTimeUpdateEvent = useCallback(() => {
    if (isAdBreakActive || !mainVideoRef.current ) return;
    
    const currentTime = mainVideoRef.current.currentTime;
    setMainVideoCurrentTime(currentTime);

    if (mainVideoDuration > 0) {
        for (const adBreak of AD_BREAKS) {
            if (currentTime >= adBreak.triggerTime && !playedAdBreakIds.has(adBreak.id)) {
                if (mainVideoRef.current) mainVideoRef.current.pause();
                setCurrentAdConfig(adBreak);
                setIsAdBreakActive(true);
                setAdIsCalibrated(false); 
                setAdCurrentError(null);
                setAdIsLooking(null);
                setIsAdPreviewReady(false);
                setAdPreviousMovementFrame(null);
                setAdImageCaptchaVerified(false);
                setAdImageCaptchaChallenge(generateImageCaptchaChallenge());
                setAdImageCaptchaInput('');
                setAdImageCaptchaError(null);
                setSkipAdCountdown(adBreak.skipTime ?? null); 
                requestAdCameraAccess(); 
                break; 
            }
        }
    }
  }, [isAdBreakActive, playedAdBreakIds, requestAdCameraAccess, mainVideoDuration, setMainVideoCurrentTime, setCurrentAdConfig, setIsAdBreakActive, setAdIsCalibrated, setAdCurrentError, setAdIsLooking, setIsAdPreviewReady, setAdPreviousMovementFrame, setSkipAdCountdown, setAdImageCaptchaChallenge, setAdImageCaptchaInput, setAdImageCaptchaError, setAdImageCaptchaVerified]);


  const handleVideoVolumeChangeEvent = useCallback(() => {
    if (mainVideoRef.current) {
      setMainVideoVolume(mainVideoRef.current.volume);
      setIsMainVideoMuted(mainVideoRef.current.muted);
    }
  }, [setMainVideoVolume, setIsMainVideoMuted]);

  const handleSeekInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mainVideoRef.current) {
      const newTime = parseFloat(e.target.value);
      mainVideoRef.current.currentTime = newTime;
      // setMainVideoCurrentTime(newTime); // Rely on timeupdate event
    }
  };

  const handleVolumeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mainVideoRef.current) {
      const newVolume = parseFloat(e.target.value);
      mainVideoRef.current.volume = newVolume;
      mainVideoRef.current.muted = newVolume === 0;
    }
  };

  const toggleMute = useCallback(() => {
    if (mainVideoRef.current) {
      const currentVideo = mainVideoRef.current;
      const newMutedState = !currentVideo.muted;
      currentVideo.muted = newMutedState;
      if (!newMutedState && currentVideo.volume === 0) { 
        currentVideo.volume = 0.5; 
      }
    }
  }, []);

  const toggleFullScreen = useCallback(() => {
    const elem = playerContainerRef.current;
    if (!elem) return;

    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);


  // --- useEffect Hooks ---
  
  // Main video event listeners
  useEffect(() => {
    const videoEl = mainVideoRef.current;
    if (!videoEl) return;

    videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoEl.addEventListener('durationchange', handleLoadedMetadata); 
    videoEl.addEventListener('play', handlePlay);
    videoEl.addEventListener('pause', handlePause);
    videoEl.addEventListener('volumechange', handleVideoVolumeChangeEvent);
    videoEl.addEventListener('timeupdate', handleTimeUpdateEvent);

    if (videoEl.readyState >= HTMLMediaElement.HAVE_METADATA) { // Use constant for clarity
      handleLoadedMetadata();
    }
    
    return () => {
      videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoEl.removeEventListener('durationchange', handleLoadedMetadata);
      videoEl.removeEventListener('play', handlePlay);
      videoEl.removeEventListener('pause', handlePause);
      videoEl.removeEventListener('volumechange', handleVideoVolumeChangeEvent);
      videoEl.removeEventListener('timeupdate', handleTimeUpdateEvent);
    };
  }, [handleLoadedMetadata, handlePlay, handlePause, handleVideoVolumeChangeEvent, handleTimeUpdateEvent]);


  // Window focus for ad
  useEffect(() => {
    const handleFocus = () => setAdIsWindowFocused(true);
    const handleBlur = () => setAdIsWindowFocused(false);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    if (typeof document !== 'undefined') {
      setAdIsWindowFocused(document.hasFocus());
    }
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Ad camera request if ad break starts
  useEffect(() => {
    if (isAdBreakActive && currentAdConfig && adHasPermission === null && !adCameraStream && !adIsCameraStarting) {
      requestAdCameraAccess();
    }
  }, [isAdBreakActive, currentAdConfig, adHasPermission, adCameraStream, adIsCameraStarting, requestAdCameraAccess]);

  // Generate image captcha when ad camera is ready
  useEffect(() => {
    if (isAdBreakActive && currentAdConfig && adHasPermission && adCameraStream && isAdPreviewReady && !adImageCaptchaChallenge && !adImageCaptchaVerified) {
      setAdImageCaptchaChallenge(generateImageCaptchaChallenge());
    }
  }, [isAdBreakActive, currentAdConfig, adHasPermission, adCameraStream, isAdPreviewReady, adImageCaptchaChallenge, adImageCaptchaVerified]);
  
  // Automatic Ad Image Captcha Verification & Calibration
  useEffect(() => {
    if (
      isAdBreakActive &&
      adImageCaptchaChallenge && 
      adImageCaptchaInput.length === IMAGE_CAPTCHA_LENGTH && 
      !adImageCaptchaVerified && 
      isAdPreviewReady && 
      !adIsLoading 
    ) {
      if (adImageCaptchaInput.toUpperCase() === adImageCaptchaChallenge.text.toUpperCase()) {
        setAdImageCaptchaVerified(true);
        setAdImageCaptchaError(null);
        toast({title: "Verification Successful!", description: "Starting calibration...", variant: "default", duration: 2000});
        handleAdCalibration(); 
      } else {
        setAdImageCaptchaError('Incorrect characters. Please try again.');
        setAdImageCaptchaInput(''); 
        setAdImageCaptchaChallenge(generateImageCaptchaChallenge()); 
        toast({title: "Verification Failed", description: "Incorrect characters. Please try again.", variant: "destructive"})
      }
    }
  }, [isAdBreakActive, adImageCaptchaInput, adImageCaptchaChallenge, adImageCaptchaVerified, isAdPreviewReady, adIsLoading, handleAdCalibration, toast, setAdImageCaptchaError, setAdImageCaptchaInput, setAdImageCaptchaChallenge, setAdCurrentError, setAdImageCaptchaVerified]);


  // Skip Ad Countdown Timer - only counts when ad should be playing
  useEffect(() => {
    if (skipAdTimerRef.current) {
      clearTimeout(skipAdTimerRef.current);
      skipAdTimerRef.current = null;
    }
    if (isAdBreakActive && currentAdConfig && currentAdConfig.skipTime && adIsCalibrated && typeof skipAdCountdown === 'number' && skipAdCountdown > 0) {
      const localShouldAdPlayForCountdown = adImageCaptchaVerified && adIsCalibrated && adIsLooking === true && adIsWindowFocused === true;
      if (localShouldAdPlayForCountdown) { 
        skipAdTimerRef.current = setTimeout(() => {
          setSkipAdCountdown(prev => (prev !== null ? Math.max(0, prev - 1) : null));
        }, 1000);
      }
    }
    return () => {
      if (skipAdTimerRef.current) {
        clearTimeout(skipAdTimerRef.current);
      }
    };
  }, [skipAdCountdown, adIsCalibrated, isAdBreakActive, adIsLooking, adIsWindowFocused, currentAdConfig, adImageCaptchaVerified]);


  // Cleanup ad resources when ad break is not active
  useEffect(() => {
    if (!isAdBreakActive) {
      if (adGazeIntervalRef.current) clearInterval(adGazeIntervalRef.current);
      if (adMovementIntervalRef.current) clearInterval(adMovementIntervalRef.current);
    }
  }, [isAdBreakActive]);

  // Ad gaze and movement detection intervals
  useEffect(() => {
    if (adIsCalibrated && adImageCaptchaVerified && adCameraStream && isAdBreakActive) {
      adGazeIntervalRef.current = setInterval(performAdGazeCheck, GAZE_ANALYSIS_INTERVAL);
      adMovementIntervalRef.current = setInterval(adDetectMovementAndTriggerGazeCheck, MOVEMENT_DETECTION_INTERVAL);
    } else {
      if (adGazeIntervalRef.current) clearInterval(adGazeIntervalRef.current);
      if (adMovementIntervalRef.current) clearInterval(adMovementIntervalRef.current);
      adGazeIntervalRef.current = null;
      adMovementIntervalRef.current = null;
      setAdPreviousMovementFrame(null); 
    }
    return () => {
      if (adGazeIntervalRef.current) clearInterval(adGazeIntervalRef.current);
      if (adMovementIntervalRef.current) clearInterval(adMovementIntervalRef.current);
    };
  }, [adIsCalibrated, adImageCaptchaVerified, adCameraStream, performAdGazeCheck, isAdBreakActive, adDetectMovementAndTriggerGazeCheck]);

  // Ad video ended listener
  useEffect(() => {
    const videoEl = adVideoRef.current;
    if (videoEl && isAdBreakActive) {
      videoEl.addEventListener('ended', handleAdVideoEnded);
      return () => videoEl.removeEventListener('ended', handleAdVideoEnded);
    }
  }, [isAdBreakActive, handleAdVideoEnded]);

  // Ad video play/pause logic
  useEffect(() => {
    const adVideo = adVideoRef.current;
    if (adVideo && isAdBreakActive) {
      if (shouldAdPlay) {
        adVideo.muted = false; 
        adVideo.volume = 1.0;  
        adVideo.play().catch(err => console.warn("Error playing ad video:", err));
      } else {
        adVideo.pause();
      }
    }
  }, [shouldAdPlay, isAdBreakActive]); 
  
  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };
  
  const VolumeIcon = isMainVideoMuted || mainVideoVolume === 0 ? VolumeX : (mainVideoVolume < 0.5 ? Volume1 : Volume2);

  return (
    <div className="flex flex-col items-stretch w-full h-screen bg-black text-slate-100 p-0 overflow-hidden relative">
      <div
        ref={playerContainerRef}
        onMouseEnter={handleMouseEnterVideo}
        onMouseLeave={handleMouseLeaveVideo}
        onMouseMove={handleMouseMoveVideo}
        className={cn(
          "w-full h-full bg-black relative group",
          isAdBreakActive ? "hidden" : "block" 
        )}
      >
        <video
          ref={mainVideoRef}
          src={MAIN_VIDEO_SRC}
          className="block w-full h-full object-contain" 
          onClick={togglePlayPause} 
          onContextMenu={(e) => e.preventDefault()} 
          controls={false} 
          playsInline 
        />
        
        <div 
          className={cn(
            "absolute bottom-0 left-0 right-0 px-4 pb-2 pt-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 ease-in-out",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <input
            type="range"
            min="0"
            max={mainVideoDuration || 0}
            value={mainVideoCurrentTime}
            onChange={handleSeekInputChange}
            className="w-full h-1.5 mb-2 cursor-pointer accent-red-600 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red-600 [&::-moz-range-thumb]:border-none"
          />
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" onClick={togglePlayPause} className="text-white hover:bg-white/10 p-2">
                {isMainVideoPlaying ? <Pause size={28} /> : <Play size={28} />}
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-white/10 p-2">
                <VolumeIcon size={24}/>
              </Button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMainVideoMuted ? 0 : mainVideoVolume}
                onChange={handleVolumeInputChange}
                className="w-20 h-1.5 cursor-pointer accent-white bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-none"
              />
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono">
                {formatTime(mainVideoCurrentTime)} / {formatTime(mainVideoDuration)}
              </span>
              <Button variant="ghost" size="icon" onClick={toggleFullScreen} className="text-white hover:bg-white/10 p-2">
                {isFullScreen ? <Minimize size={24}/> : <Maximize size={24}/>}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isAdBreakActive && currentAdConfig && (
        <div className="absolute inset-0 w-full h-full bg-slate-900 text-slate-100 flex flex-col items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl aspect-video bg-black rounded-lg shadow-2xl overflow-hidden relative flex flex-col">
            <div className="flex-grow relative">
              <video 
                ref={adVideoRef} 
                src={currentAdConfig.adSrc || ''} 
                className="w-full h-full object-contain" 
                playsInline 
                controls={false} 
                onContextMenu={(e) => e.preventDefault()}
                onEnded={handleAdVideoEnded} 
              />

              {(adIsCameraStarting || (adHasPermission && !isAdPreviewReady && !adImageCaptchaVerified)) && !adCurrentError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20">
                  <Loader2 className="h-12 w-12 animate-spin text-sky-400 mb-4" />
                  <p className="text-lg font-semibold">{adIsCameraStarting ? "Initializing camera..." : "Waiting for camera preview..."}</p>
                </div>
              )}
              {adHasPermission === false && !adIsCameraStarting && ( 
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 p-4 text-center">
                  <AlertTriangle className="h-10 w-10 text-red-400 mb-3" />
                  <AlertTitle className="text-lg mb-1">Camera Access Denied</AlertTitle>
                  <AlertDescription className="text-sm mb-3">{adCurrentError || "Camera access is required for this ad."}</AlertDescription>
                  <Button onClick={requestAdCameraAccess} size="sm" className="bg-sky-500 hover:bg-sky-600 text-white">Retry Camera Access</Button>
                </div>
              )}
              {adCurrentError && adHasPermission !== false && ( 
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 p-4 text-center">
                  <AlertTriangle className="h-10 w-10 text-red-400 mb-3" />
                  <AlertTitle className="text-lg mb-1">Ad System Error</AlertTitle>
                  <AlertDescription className="text-sm mb-3">{adCurrentError}</AlertDescription>
                  {adImageCaptchaVerified && !adIsCalibrated && adHasPermission && adCameraStream && isAdPreviewReady && (
                    <Button onClick={handleAdCalibration} size="sm" className="bg-sky-500 hover:bg-sky-600 text-white mt-2" disabled={adIsLoading || !isAdPreviewReady}>
                      {adIsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Target className="mr-2 h-4 w-4" />}
                      Retry Calibration
                    </Button>
                  )}
                   {(!adImageCaptchaVerified || !adIsCalibrated) && currentAdConfig.skipTime !== null && currentAdConfig.skipTime !== undefined && (
                     <Button onClick={resumeMainVideo} variant="outline" size="sm" className="bg-slate-700 hover:bg-slate-600 text-white mt-2 px-3 py-1.5 text-xs rounded-sm">
                        Proceed Past Ad
                     </Button>
                  )}
                </div>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 flex flex-col space-y-3 z-10">
              {adHasPermission && adCameraStream && isAdPreviewReady && !adImageCaptchaVerified && adImageCaptchaChallenge && (
                <div className="flex flex-col items-center space-y-3 p-3 bg-slate-800/80 rounded-md">
                   <div className="flex items-center justify-center space-x-2 w-full">
                    <div className="p-2 bg-slate-700 rounded-md shadow-md select-none">
                        <img src={adImageCaptchaChallenge.imageDataUri} alt="CAPTCHA challenge" className="w-[180px] h-[60px] object-contain rounded-sm" />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setAdImageCaptchaChallenge(generateImageCaptchaChallenge())} title="New challenge">
                      <RefreshCcw className="h-5 w-5 text-slate-400 hover:text-sky-300" />
                    </Button>
                  </div>
                  <Input
                    type="text"
                    value={adImageCaptchaInput}
                    onChange={(e) => setAdImageCaptchaInput(e.target.value.toUpperCase())}
                    placeholder="Type characters here"
                    maxLength={IMAGE_CAPTCHA_LENGTH}
                    className="w-full max-w-xs text-center bg-slate-700 border-slate-600 placeholder-slate-500 text-white"
                  />
                  {adImageCaptchaError && <p className="text-xs text-red-400">{adImageCaptchaError}</p>}
                </div>
              )}

              <div className="flex items-end justify-between space-x-4">
                <div className="flex items-center space-x-3">
                  {adHasPermission && adCameraStream && ( 
                    <div className="w-28 h-[70px] rounded overflow-hidden shadow-md border-2 border-slate-700 bg-black"> 
                      <CameraPreview
                        videoRef={adVideoPreviewRef}
                        stream={adCameraStream}
                        width={112} 
                        height={84} 
                        className="!p-0 !shadow-none !border-0" 
                        onLoadedData={() => setIsAdPreviewReady(true)}
                        isStarting={adIsCameraStarting && !adCameraStream}
                      />
                    </div>
                  )}
                  {adImageCaptchaVerified && adIsCalibrated && (
                    <div className="text-xs space-y-0.5 text-slate-300">
                      <div className="flex items-center">
                        {adIsLoading && adIsLooking === null && !adCurrentError ? <Loader2 className="h-3 w-3 mr-1 animate-spin text-sky-300" /> : (adIsLooking ? <Eye className="h-3 w-3 mr-1 text-green-400" /> : (adIsLooking === false ? <EyeOff className="h-3 w-3 mr-1 text-red-400" /> : <Loader2 className="h-3 w-3 mr-1 animate-spin text-sky-300" />))}
                        Gaze: {adIsLoading && adIsLooking === null && !adCurrentError ? "Analyzing..." : (adIsLooking === null ? "N/A" : (adIsLooking ? "Looking" : "Not Looking"))}
                      </div>
                      <div className="flex items-center">
                        <Focus className={cn("h-3 w-3 mr-1", adIsWindowFocused ? "text-green-400" : "text-yellow-400")} />
                        Window: {adIsWindowFocused ? "Focused" : "Not Focused"}
                      </div>
                    </div>
                  )}
                  {adImageCaptchaVerified && !adIsCalibrated && adIsLoading && !adCurrentError && (
                    <div className="text-xs text-sky-300 flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Calibrating your attention...
                    </div>
                  )}
                </div>

                {currentAdConfig.skipTime !== null && currentAdConfig.skipTime !== undefined && adImageCaptchaVerified && adIsCalibrated && (
                  <Button 
                    onClick={resumeMainVideo} 
                    variant="outline" 
                    size="sm" 
                    className="bg-slate-200/80 text-slate-900 hover:bg-slate-100 px-3 py-1.5 text-xs rounded-sm" 
                    disabled={skipAdCountdown === null || skipAdCountdown > 0} 
                  >
                    <SkipForward className="mr-1.5 h-3.5 w-3.5" /> 
                    {skipAdCountdown !== null && skipAdCountdown > 0 ? `Skip Ad in ${skipAdCountdown}s` : "Skip Ad"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
