
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input"; 
import { CameraPreview } from '@/components/gaze-ad/camera-preview';
import { AdVideoPlayer } from '@/components/gaze-ad/ad-video-player';
import { calibrateGaze } from '@/ai/flows/calibrate-gaze';
import { analyzeGaze } from '@/ai/flows/analyze-gaze';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, Target, Eye, EyeOff, Play, Pause, AlertTriangle, CheckCircle2, Focus, RefreshCcw, Image as ImageIcon } from 'lucide-react';
import { cn } from "@/lib/utils";

const GAZE_ANALYSIS_INTERVAL = 2000; // 2 seconds
const AD_VIDEO_SRC = "https://www.w3schools.com/html/mov_bbb.mp4";

const MOVEMENT_DETECTION_INTERVAL = 500;
const MOVEMENT_DETECTION_DOWNSCALE_WIDTH = 16;
const MOVEMENT_DETECTION_DOWNSCALE_HEIGHT = 12;
const MOVEMENT_THRESHOLD = 3000;
const IMAGE_CAPTCHA_LENGTH = 4;


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
  svgContent += `<rect width="100%" height="100%" fill="#f0f0f0"/>`;

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
    const rotation = Math.random() * 30 - 15;
    const color = colors[Math.floor(Math.random() * colors.length)];
    svgContent += `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="${color}" transform="rotate(${rotation}, ${x}, ${y})">${char}</text>`;
  }
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
    id: Date.now().toString(),
    text,
    imageDataUri,
  };
};


export default function GazeAdPageContent() {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);
  const [isLooking, setIsLooking] = useState<boolean | null>(null);
  const [isWindowFocused, setIsWindowFocused] = useState<boolean>(true);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCameraStarting, setIsCameraStarting] = useState<boolean>(false);
  const [previousMovementFrame, setPreviousMovementFrame] = useState<number[] | null>(null);
  const [isCameraPreviewReady, setIsCameraPreviewReady] = useState<boolean>(false);

  const [imageCaptchaChallenge, setImageCaptchaChallenge] = useState<ImageCaptchaChallenge | null>(null);
  const [imageCaptchaInput, setImageCaptchaInput] = useState<string>('');
  const [imageCaptchaVerified, setImageCaptchaVerified] = useState<boolean>(false);
  const [imageCaptchaError, setImageCaptchaError] = useState<string | null>(null);
  
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const adVideoRef = useRef<HTMLVideoElement>(null);
  const gazeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const movementIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  const captureFrame = useCallback((videoElement: HTMLVideoElement | null): string | null => {
    if (!videoElement || videoElement.readyState < videoElement.HAVE_METADATA || videoElement.videoWidth === 0) {
        console.warn("Video element not ready or has no dimensions for captureFrame.");
        return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg');
  }, []);

  const requestCameraAccess = useCallback(async () => {
    if (cameraStream) return; 
    setIsCameraStarting(true);
    setCurrentError(null);
    setHasPermission(null);
    setIsCameraPreviewReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setHasPermission(true);
    } catch (err) {
      console.error("Camera access denied:", err);
      setCurrentError("Camera access denied. Please enable camera permissions in your browser settings.");
      setHasPermission(false);
    } finally {
      setIsCameraStarting(false);
    }
  }, [cameraStream]);

  useEffect(() => {
    if(hasPermission === null && !isCameraStarting) {
       requestCameraAccess();
    }
    
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    if (typeof document !== 'undefined') {
      setIsWindowFocused(document.hasFocus());
    }

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (gazeIntervalRef.current) {
        clearInterval(gazeIntervalRef.current);
      }
      if (movementIntervalRef.current) {
        clearInterval(movementIntervalRef.current);
      }
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [requestCameraAccess, cameraStream, hasPermission, isCameraStarting]);

  useEffect(() => {
    if (hasPermission && isCameraPreviewReady && !imageCaptchaChallenge && !isCalibrated && !imageCaptchaVerified) {
      setImageCaptchaChallenge(generateImageCaptchaChallenge());
    }
  }, [hasPermission, isCameraPreviewReady, imageCaptchaChallenge, isCalibrated, imageCaptchaVerified]);

  useEffect(() => {
    if (
      imageCaptchaChallenge &&
      imageCaptchaInput.length === IMAGE_CAPTCHA_LENGTH &&
      !imageCaptchaVerified &&
      isCameraPreviewReady &&
      !isLoading 
    ) {
      if (imageCaptchaInput.toUpperCase() === imageCaptchaChallenge.text.toUpperCase()) {
        setImageCaptchaVerified(true);
        setImageCaptchaError(null);
        toast({
          title: "Verification Successful",
          description: "You can now proceed with calibration.",
          variant: "default",
        });
      } else {
        setImageCaptchaError("Incorrect characters. Please try again.");
        setImageCaptchaInput(''); 
        setImageCaptchaChallenge(generateImageCaptchaChallenge()); 
        toast({title: "Verification Failed", description: "Incorrect characters. Please try again.", variant: "destructive"});
      }
    }
  }, [imageCaptchaInput, imageCaptchaChallenge, imageCaptchaVerified, isCameraPreviewReady, isLoading, toast]);


  const handleCalibration = async () => {
    if (!imageCaptchaVerified) {
      toast({ title: "Verification Required", description: "Please complete the verification step before calibrating.", variant: "destructive"});
      return;
    }
    if (!isCameraPreviewReady) {
      toast({ title: "Camera Not Ready", description: "Please wait for the camera preview to load.", variant: "destructive"});
      return;
    }

    setCurrentError(null);
    setIsLoading(true);
    const imageDataUrl = captureFrame(videoPreviewRef.current);
    if (!imageDataUrl) {
      setCurrentError("Failed to capture image for calibration.");
      setIsLoading(false);
      return;
    }

    try {
      await calibrateGaze({ photoDataUri: imageDataUrl });
      setIsCalibrated(true);
      toast({
        title: "Calibration Successful",
        description: "Gaze tracking is now active.",
        variant: "default",
        action: <CheckCircle2 className="text-green-500" />,
      });
    } catch (err) {
      console.error("Calibration failed:", err);
      setCurrentError("AI calibration failed. Please try again.");
      toast({
        title: "Calibration Failed",
        description: "Could not calibrate gaze. Please ensure your face is clear and well-lit.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const performGazeCheck = useCallback(async () => {
    if (isLoading) return; 
    
    const imageDataUrl = captureFrame(videoPreviewRef.current);
    if (!imageDataUrl) {
      console.warn("Failed to capture image for gaze analysis.");
      return;
    }
    
    setIsLoading(true); 
    try {
      const result = await analyzeGaze({ photoDataUri: imageDataUrl });
      setIsLooking(result.isLookingAtScreen);
    } catch (err) {
      console.error("Gaze analysis failed:", err);
      if (isLooking !== null) { 
        toast({
            title: "Gaze Analysis Error",
            description: "Could not determine gaze. Tracking will continue.",
            variant: "destructive",
            duration: 3000,
        });
      }
      setIsLooking(null); 
    } finally {
      setIsLoading(false);
    }
  }, [captureFrame, toast, isLoading, isLooking]); 

  useEffect(() => {
    if (isCalibrated && cameraStream) {
      gazeIntervalRef.current = setInterval(performGazeCheck, GAZE_ANALYSIS_INTERVAL);
    } else {
      if (gazeIntervalRef.current) {
        clearInterval(gazeIntervalRef.current);
        gazeIntervalRef.current = null;
      }
    }
    return () => {
      if (gazeIntervalRef.current) {
        clearInterval(gazeIntervalRef.current);
      }
    };
  }, [isCalibrated, cameraStream, performGazeCheck]);

  const processFrameForMovement = useCallback(async (
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
        if (!ctx) {
          resolve([]);
          return;
        }
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const grayscalePixelData = [];
        for (let i = 0; i < imgData.data.length; i += 4) {
          const r = imgData.data[i];
          const g = imgData.data[i + 1];
          const b = imgData.data[i + 2];
          grayscalePixelData.push(Math.round(0.299 * r + 0.587 * g + 0.114 * b));
        }
        resolve(grayscalePixelData);
      };
      img.onerror = () => {
        console.warn("Error loading image for movement detection");
        resolve([]);
      }
      img.src = imageDataUrl;
    });
  }, []);

  const detectMovementAndTriggerGazeCheck = useCallback(async () => {
    if (!videoPreviewRef.current || !isCalibrated || isLoading || !isCameraPreviewReady) return;

    const imageDataUrl = captureFrame(videoPreviewRef.current);
    if (!imageDataUrl) return;

    const currentFrameData = await processFrameForMovement(
      imageDataUrl,
      MOVEMENT_DETECTION_DOWNSCALE_WIDTH,
      MOVEMENT_DETECTION_DOWNSCALE_HEIGHT
    );

    if (previousMovementFrame && currentFrameData.length > 0 && previousMovementFrame.length === currentFrameData.length) {
      let diffSum = 0;
      for (let i = 0; i < currentFrameData.length; i++) {
        diffSum += Math.abs(currentFrameData[i] - previousMovementFrame[i]);
      }

      if (diffSum > MOVEMENT_THRESHOLD) {
        console.log(`High movement detected (diff: ${diffSum}), triggering immediate gaze check.`);
        performGazeCheck();
      }
    }
    setPreviousMovementFrame(currentFrameData.length > 0 ? currentFrameData : null);
  }, [captureFrame, previousMovementFrame, isCalibrated, performGazeCheck, processFrameForMovement, isLoading, isCameraPreviewReady]);

  useEffect(() => {
    if (isCalibrated && cameraStream) {
      movementIntervalRef.current = setInterval(detectMovementAndTriggerGazeCheck, MOVEMENT_DETECTION_INTERVAL);
    } else {
      if (movementIntervalRef.current) {
        clearInterval(movementIntervalRef.current);
        movementIntervalRef.current = null;
      }
      setPreviousMovementFrame(null); 
    }
    return () => {
      if (movementIntervalRef.current) {
        clearInterval(movementIntervalRef.current);
      }
    };
  }, [isCalibrated, cameraStream, detectMovementAndTriggerGazeCheck]);

  const renderGazeStatus = () => {
    if (!isCalibrated) return null;
    let statusText = "Gaze: Analyzing...";
    let Icon = Loader2;
    let iconColor = "text-muted-foreground";

    if (!isLoading && isLooking === true) {
      statusText = "Gaze: Looking at screen";
      Icon = Eye;
      iconColor = "text-green-500";
    } else if (!isLoading && isLooking === false) {
      statusText = "Gaze: Not looking at screen";
      Icon = EyeOff;
      iconColor = "text-red-500";
    } else if (isLoading && isLooking !== null) { 
        statusText = isLooking ? "Gaze: Looking at screen (updating...)" : "Gaze: Not looking at screen (updating...)";
        Icon = Loader2;
    }

    const focusStatusText = isWindowFocused ? "Window: Focused" : "Window: Not Focused";
    const FocusIcon = isWindowFocused ? Focus : AlertTriangle;
    const focusIconColor = isWindowFocused ? "text-green-500" : "text-yellow-500";

    return (
      <div className="mt-2 space-y-1">
        <div className="flex items-center space-x-2 text-sm">
          <Icon className={cn("h-5 w-5", iconColor, isLoading ? "animate-spin" : "animate-none")} />
          <span>{statusText}</span>
        </div>
         <div className="flex items-center space-x-2 text-sm">
          <FocusIcon className={cn("h-5 w-5", focusIconColor)} />
          <span>{focusStatusText}</span>
        </div>
      </div>
    );
  };
  
  if (hasPermission === null && isCameraStarting) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-foreground">Requesting camera access...</p>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center"><AlertTriangle className="mr-2 h-6 w-6 text-destructive" />Camera Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{currentError || "Camera access is required for this application to work."}</AlertDescription>
          </Alert>
          <p className="mt-4 text-sm text-muted-foreground">
            Please grant camera permission in your browser settings and try again.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={requestCameraAccess} className="w-full" disabled={isCameraStarting}>
            <Camera className="mr-2 h-4 w-4" /> Retry Camera Access
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  if (hasPermission === true && !cameraStream && isCameraStarting) {
     return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-foreground">Initializing camera...</p>
      </div>
    );
  }

  const shouldAdPlay = isLooking === true && isWindowFocused;

  return (
    <div className="w-full max-w-3xl space-y-6">
      <h1 className="text-4xl font-bold text-center text-primary">GazeAd - How it Works</h1>
      <p className="text-center text-muted-foreground">
        This demo shows how AI can detect if you are looking at the screen. Calibrate first, then watch the video.
      </p>

      {currentError && !isCalibrated && ( 
         <Alert variant="destructive">
           <AlertTriangle className="h-4 w-4" />
           <AlertTitle>Error</AlertTitle>
           <AlertDescription>{currentError}</AlertDescription>
         </Alert>
       )}

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Camera className="mr-2 h-6 w-6 text-primary" /> Camera Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {cameraStream ? (
            <CameraPreview 
              videoRef={videoPreviewRef} 
              stream={cameraStream} 
              isStarting={isCameraStarting && !cameraStream}
              onLoadedData={() => setIsCameraPreviewReady(true)}
            />
          ) : (
             <div className="w-[320px] h-[240px] bg-muted rounded-md flex items-center justify-center">
                <p className="text-muted-foreground">{isCameraStarting ? "Initializing camera..." : (hasPermission ? "Waiting for camera preview..." : "Camera not available.")}</p>
             </div>
          )}
        </CardContent>
      </Card>

      {!isCalibrated && cameraStream && isCameraPreviewReady && (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center"><Target className="mr-2 h-6 w-6 text-accent" />Gaze Calibration</CardTitle>
            <CardDescription>
              To ensure accurate gaze tracking, please look directly at your screen.
              Make sure your face is well-lit and clearly visible in the camera preview above.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!imageCaptchaVerified && imageCaptchaChallenge ? (
              <div className="flex flex-col items-center space-y-3 p-4 bg-muted rounded-md">
                <p className="text-sm text-foreground">Verify you're present by typing the characters in the image:</p>
                <div className="flex items-center space-x-2">
                    <div className="p-1 bg-background rounded border border-border shadow-sm select-none">
                        <img src={imageCaptchaChallenge.imageDataUri} alt="CAPTCHA challenge" className="w-[180px] h-[60px] object-contain rounded-sm" />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => {setImageCaptchaChallenge(generateImageCaptchaChallenge()); setImageCaptchaInput(''); setImageCaptchaError(null);}} title="New challenge">
                        <RefreshCcw className="h-5 w-5 text-muted-foreground hover:text-primary"/>
                    </Button>
                </div>
                <Input 
                  type="text" 
                  value={imageCaptchaInput}
                  onChange={(e) => setImageCaptchaInput(e.target.value.toUpperCase())}
                  placeholder="Type characters here"
                  maxLength={IMAGE_CAPTCHA_LENGTH}
                  className="w-full max-w-xs text-center"
                  aria-label="Enter CAPTCHA characters"
                />
                {imageCaptchaError && <p className="text-xs text-destructive">{imageCaptchaError}</p>}
              </div>
            ) : imageCaptchaVerified ? (
              <p className="text-sm text-green-600 text-center">Verification successful. You can now calibrate.</p>
            ) : (
               <div className="flex flex-col items-center space-y-2 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin"/>
                <p>Waiting for camera to display verification step...</p>
               </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleCalibration} disabled={isLoading || !cameraStream || !imageCaptchaVerified || !isCameraPreviewReady} className="w-full bg-accent hover:bg-accent/90">
              {isLoading && imageCaptchaVerified ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Target className="mr-2 h-4 w-4" />}
              {isCalibrated ? "Re-Calibrate My Gaze" : "Calibrate My Gaze"}
            </Button>
          </CardFooter>
        </Card>
      )}

      {isCalibrated && (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              {shouldAdPlay ? <Play className="mr-2 h-6 w-6 text-green-500" /> : <Pause className="mr-2 h-6 w-6 text-red-500" />}
              Advertisement
            </CardTitle>
            <CardDescription>This video will play when you look at the screen and the window is focused. It will pause otherwise.</CardDescription>
            {renderGazeStatus()}
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <AdVideoPlayer
              videoRef={adVideoRef}
              src={AD_VIDEO_SRC}
              isPlaying={shouldAdPlay}
            />
             <Button onClick={() => {
                setIsCalibrated(false); 
                setImageCaptchaVerified(false); 
                setImageCaptchaChallenge(isCameraPreviewReady ? generateImageCaptchaChallenge() : null); 
                setImageCaptchaInput('');
                setCurrentError(null);
                setImageCaptchaError(null);
                if (gazeIntervalRef.current) clearInterval(gazeIntervalRef.current);
                if (movementIntervalRef.current) clearInterval(movementIntervalRef.current);
             }} 
             variant="outline" 
             className="mt-4">
                Reset Calibration & Verification
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
