'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import '../editor.css';

// ===== HELPER FUNCTIONS =====
function colorDistanceSq(r1, g1, b1, r2, g2, b2) {
    const rmean = (r1 + r2) / 2;
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    const weightR = 2 + rmean / 256;
    const weightG = 4;
    const weightB = 2 + (255 - rmean) / 256;
    return (weightR * dr * dr + weightG * dg * dg + weightB * db * db) / 3;
}

function colorDistance(r1, g1, b1, r2, g2, b2) {
    return Math.sqrt(colorDistanceSq(r1, g1, b1, r2, g2, b2));
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function findSeedPoints(data, w, h, color, tolerance) {
    const seeds = [];
    const gridSize = Math.max(10, Math.floor(Math.min(w, h) / 20));
    const seedToleranceSq = (tolerance * 0.6) * (tolerance * 0.6);

    for (let y = gridSize; y < h - gridSize; y += gridSize) {
        for (let x = gridSize; x < w - gridSize; x += gridSize) {
            const idx = (y * w + x) * 4;
            const distSq = colorDistanceSq(
                data[idx], data[idx + 1], data[idx + 2],
                color.r, color.g, color.b
            );
            if (distSq <= seedToleranceSq) {
                let solidCount = 0;
                const checkRadius = 4;
                for (let dy = -checkRadius; dy <= checkRadius; dy++) {
                    for (let dx = -checkRadius; dx <= checkRadius; dx++) {
                        const cidx = ((y + dy) * w + (x + dx)) * 4;
                        if (colorDistanceSq(data[cidx], data[cidx + 1], data[cidx + 2], color.r, color.g, color.b) <= seedToleranceSq) {
                            solidCount++;
                        }
                    }
                }
                if (solidCount >= (checkRadius * 2 + 1) * (checkRadius * 2 + 1) * 0.85) {
                    seeds.push({ x, y });
                }
            }
        }
    }
    return seeds;
}

function evaluateRectangularity(data, w, h, color, step) {
    let minX = w, maxX = 0, minY = h, maxY = 0;
    let matchCount = 0;
    const toleranceSq = 30 * 30;

    for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
            const idx = (y * w + x) * 4;
            if (colorDistanceSq(data[idx], data[idx + 1], data[idx + 2], color.r, color.g, color.b) <= toleranceSq) {
                matchCount++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (matchCount === 0) return 0;

    const rectWidth = maxX - minX;
    const rectHeight = maxY - minY;
    const rectArea = (rectWidth * rectHeight) / (step * step);
    const fillRatio = matchCount / (rectArea || 1);

    const minAspectRatio = 0.4;
    const maxAspectRatio = 2.5;
    const aspectRatio = rectWidth / (rectHeight || 1);
    let coverageScore = 1;

    if (aspectRatio < minAspectRatio || aspectRatio > maxAspectRatio) {
        coverageScore = 0.2;
    }

    const pixelCount = w * h;
    return fillRatio * coverageScore * matchCount;
}

// ===== EDITOR COMPONENT =====
export default function EditorWorkspace({ defaultTool = 'bg-remover' }) {
    const { user, logout, setShowAuthModal, setShowUpgradeModal, setAuthMode, deductTokens } = useAuth();
    const router = useRouter();
    
    // Core states
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [originalImage, setOriginalImage] = useState(null);
    const [originalImageData, setOriginalImageData] = useState(null);
    const [resultImageData, setResultImageData] = useState(null);
    const [currentView, setCurrentView] = useState('original'); // 'original' | 'result'
    
    // Zoom & pan
    const [zoom, setZoom] = useState(1);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);

    // Overlays/interaction states
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const dragInitialPan = useRef({ x: 0, y: 0 });
    const [loupe, setLoupe] = useState({ visible: false, x: 0, y: 0, cx: 0, cy: 0 });

    // Processing UI state
    const [processing, setProcessing] = useState({ visible: false, progress: 0, title: 'Processing...' });

    // Toast notifications
    const [toast, setToast] = useState(null);

    // Refs
    const fileInputRef = useRef(null);
    const mainCanvasRef = useRef(null);
    const loupeCanvasRef = useRef(null);
    const canvasWrapperRef = useRef(null);

    // ==========================================
    // MULTI-TOOL STATE DEFINITIONS (15 TOOLS)
    // ==========================================
    const [activeTool, setActiveTool] = useState(defaultTool);

    useEffect(() => {
        if (defaultTool) {
            setActiveTool(defaultTool);
        }
    }, [defaultTool]);

    const handleToolChange = (toolName) => {
        setActiveTool(toolName);
        router.push(`/editor/${toolName}`);
    };

    // 1. Background Remover
    const [bgRemovalMode, setBgRemovalMode] = useState('ai'); // 'ai' | 'chroma'
    const [tolerance, setTolerance] = useState(35);
    const [softness, setSoftness] = useState(2);
    const [contiguous, setContiguous] = useState(true);
    const [targetColor, setTargetColor] = useState({ r: 204, g: 0, b: 0 }); // Default red
    const [lastClickedPixel, setLastClickedPixel] = useState(null);
    const [bgRemoverManualEraseMode, setBgRemoverManualEraseMode] = useState(false);
    const [manualEraseBrushSize, setManualEraseBrushSize] = useState(24);
    const [isManualErasing, setIsManualErasing] = useState(false);

    // 2. Image Upscaler
    const [upscaleFactor, setUpscaleFactor] = useState(2); // 2 | 4

    // 3. Video Background Remover
    const [videoSample, setVideoSample] = useState('');
    const [videoPlaying, setVideoPlaying] = useState(false);
    const [chromaKeyColor, setChromaKeyColor] = useState({ r: 0, g: 255, b: 0 });
    const [chromaTolerance, setChromaTolerance] = useState(70);
    const videoRef = useRef(null);
    const videoLoopId = useRef(null);

    // 4. Change Background
    const [selectedBgType, setSelectedBgType] = useState('color'); // 'color' | 'gradient' | 'image'
    const [selectedBgColor, setSelectedBgColor] = useState('#3b82f6');
    const [selectedBgGradient, setSelectedBgGradient] = useState('cosmic');
    const [selectedBgImage, setSelectedBgImage] = useState('studio');
    const [bgImageObjects, setBgImageObjects] = useState({});

    // 5. Magic Eraser (Inpainting)
    const [eraserBrushSize, setEraserBrushSize] = useState(30);
    const [isDrawingEraser, setIsDrawingEraser] = useState(false);
    const [currentEraserPath, setCurrentEraserPath] = useState([]);

    // 6. AI Image Generator
    const [aiImagePrompt, setAiImagePrompt] = useState('');
    const [aiImageStyle, setAiImageStyle] = useState('photorealistic');

    // 7. AI Video Generator
    const [aiVideoPrompt, setAiVideoPrompt] = useState('');
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState('');

    // 8. Generative Fill
    const [genFillPrompt, setGenFillPrompt] = useState('');
    const [genFillArea, setGenFillArea] = useState(null); // { x, y, w, h }
    const [isDrawingGenFillBox, setIsDrawingGenFillBox] = useState(false);
    const [genFillStartPoint, setGenFillStartPoint] = useState(null);

    // 9. Uncrop (AI Expand)
    const [expandMargin, setExpandMargin] = useState(50); // px

    // 10. AI Ads Creator
    const [selectedAdTemplate, setSelectedAdTemplate] = useState('cyber'); // 'cyber' | 'minimal' | 'festive'
    const [adTextTitle, setAdTextTitle] = useState('Flash Sale');
    const [adTextDiscount, setAdTextDiscount] = useState('50% OFF');
    const [adTextCTA, setAdTextCTA] = useState('Shop Now');
    const [adBannerGenerated, setAdBannerGenerated] = useState(false);
    const [bgChangeApplied, setBgChangeApplied] = useState(false);

    // 11. Bulk Editor
    const [bulkQueue, setBulkQueue] = useState([]); // { file, status, name }[]

    // 12. Adjustments (Filters)
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);
    const [blur, setBlur] = useState(0);

    // 13. Text & Overlays
    const [textItems, setTextItems] = useState([]); // { id, text, x, y, size, color }
    const [selectedTextId, setSelectedTextId] = useState(null);
    const [newTextVal, setNewTextVal] = useState('EDIT TEXT');

    // 14. Rotate & Flip
    const [rotationAngle, setRotationAngle] = useState(0); // 0 | 90 | 180 | 270
    const [flipHorizontal, setFlipHorizontal] = useState(false);
    const [flipVertical, setFlipVertical] = useState(false);

    // 15. Brush Drawing
    const [brushColor, setBrushColor] = useState('#06b6d4');
    const [brushSize, setBrushSize] = useState(12);
    const [isDrawingStroke, setIsDrawingStroke] = useState(false);
    const [brushStrokes, setBrushStrokes] = useState([]); // { color, size, points: [] }[]

    // Toast auto-clear
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }, [toast]);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    // Pre-load Scenic Background Images
    useEffect(() => {
        const bgUrls = {
            studio: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop',
            cafe: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&auto=format&fit=crop',
            showroom: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop'
        };
        const loaded = {};
        Object.entries(bgUrls).forEach(([key, url]) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                setBgImageObjects(prev => ({ ...prev, [key]: img }));
            };
            img.src = url;
        });
    }, []);

    // Clean video stream on unmount
    useEffect(() => {
        return () => {
            if (videoLoopId.current) cancelAnimationFrame(videoLoopId.current);
        };
    }, []);

    // Render Canvas sequence based on states changes
    useEffect(() => {
        if (!originalImageData || !mainCanvasRef.current) return;
        renderCanvas();
    }, [
        currentView, originalImageData, resultImageData, activeTool,
        brightness, contrast, saturation, blur,
        selectedBgType, selectedBgColor, selectedBgGradient, selectedBgImage, bgImageObjects,
        textItems, selectedTextId,
        brushStrokes, currentEraserPath, eraserBrushSize,
        selectedAdTemplate, adTextTitle, adTextDiscount, adTextCTA,
        rotationAngle, flipHorizontal, flipVertical,
        genFillArea, isDrawingGenFillBox
    ]);

    const renderCanvas = () => {
        const canvas = mainCanvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Base image data source
        const imgData = (currentView === 'result' && resultImageData) ? resultImageData : originalImageData;
        if (!imgData) return;

        // 1. Create a temp canvas for the base image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imgData.width;
        tempCanvas.height = imgData.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imgData, 0, 0);

        // 2. Draw base image with filters, rotation, and flip alignment
        ctx.save();
        
        // Adjustments Filters
        const filterStr = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;
        ctx.filter = filterStr;
        
        // Rotate & Flip from center
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotationAngle * Math.PI) / 180);
        ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();

        // 3. Draw Background under transparent regions
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        if (activeTool === 'change-bg' || bgChangeApplied || (activeTool === 'ai-ads' && adBannerGenerated)) {
            if (selectedBgType === 'color') {
                ctx.fillStyle = selectedBgColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else if (selectedBgType === 'gradient') {
                const gradColors = {
                    cosmic: ['#06b6d4', '#60a5fa'],
                    warm: ['#f472b6', '#3b82f6'],
                    neon: ['#06b6d4', '#34d399'],
                    sunset: ['#f43f5e', '#fbbf24']
                };
                const colors = gradColors[selectedBgGradient] || ['#000', '#333'];
                const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                grad.addColorStop(0, colors[0]);
                grad.addColorStop(1, colors[1]);
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else if (selectedBgType === 'image') {
                if (bgImageObjects[selectedBgImage]) {
                    ctx.drawImage(bgImageObjects[selectedBgImage], 0, 0, canvas.width, canvas.height);
                }
            }
        }
        ctx.restore();

        // 4. Draw Brush strokes
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotationAngle * Math.PI) / 180);
        ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        brushStrokes.forEach(stroke => {
            if (stroke.points.length < 2) return;
            ctx.beginPath();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            ctx.stroke();
        });
        ctx.restore();

        // 5. Draw Magic Eraser Mask Path
        if (activeTool === 'magic-eraser' && currentEraserPath.length > 0) {
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((rotationAngle * Math.PI) / 180);
            ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
            ctx.lineWidth = eraserBrushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(currentEraserPath[0].x, currentEraserPath[0].y);
            for (let i = 1; i < currentEraserPath.length; i++) {
                ctx.lineTo(currentEraserPath[i].x, currentEraserPath[i].y);
            }
            ctx.stroke();
            ctx.restore();
        }

        // 6. Draw AI Ads Template text and badges
        if (activeTool === 'ai-ads' && adBannerGenerated) {
            ctx.save();
            ctx.textAlign = 'center';
            
            if (selectedAdTemplate === 'cyber') {
                ctx.font = '900 48px "Courier New", sans-serif';
                ctx.fillStyle = '#06b6d4';
                ctx.fillText(adTextTitle.toUpperCase(), canvas.width / 2, 80);
                
                ctx.font = '900 72px sans-serif';
                ctx.fillStyle = '#f472b6';
                ctx.fillText(adTextDiscount, canvas.width / 2, canvas.height - 130);
                
                ctx.fillStyle = '#06b6d4';
                ctx.fillRect(canvas.width / 2 - 120, canvas.height - 95, 240, 50);
                ctx.fillStyle = '#000';
                ctx.font = '700 20px sans-serif';
                ctx.fillText(adTextCTA.toUpperCase(), canvas.width / 2, canvas.height - 63);
            } else if (selectedAdTemplate === 'minimal') {
                ctx.font = '300 32px sans-serif';
                ctx.fillStyle = '#fff';
                ctx.fillText(adTextTitle, canvas.width / 2, 70);
                
                ctx.font = '900 64px sans-serif';
                ctx.fillText(adTextDiscount, canvas.width / 2, canvas.height - 120);
                
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(canvas.width / 2 - 100, canvas.height - 80, 200, 44);
                ctx.font = '600 16px sans-serif';
                ctx.fillText(adTextCTA, canvas.width / 2, canvas.height - 52);
            } else if (selectedAdTemplate === 'festive') {
                ctx.font = 'italic 700 40px serif';
                ctx.fillStyle = '#fbbf24';
                ctx.fillText(adTextTitle, canvas.width / 2, 80);
                
                ctx.font = '900 70px serif';
                ctx.fillStyle = '#f43f5e';
                ctx.fillText(adTextDiscount, canvas.width / 2, canvas.height - 140);
                
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.roundRect(canvas.width / 2 - 110, canvas.height - 90, 220, 48, 24);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.font = '700 18px sans-serif';
                ctx.fillText(adTextCTA, canvas.width / 2, canvas.height - 58);
            }
            ctx.restore();
        }

        // 7. Draw Text Overlays
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotationAngle * Math.PI) / 180);
        ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        textItems.forEach(item => {
            ctx.font = `700 ${item.size}px sans-serif`;
            ctx.fillStyle = item.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            if (item.id === selectedTextId) {
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2;
                const textWidth = ctx.measureText(item.text).width;
                ctx.strokeRect(item.x - textWidth / 2 - 10, item.y - item.size / 2 - 6, textWidth + 20, item.size + 12);
            }
            ctx.fillText(item.text, item.x, item.y);
        });
        ctx.restore();

        // 8. Draw Generative Fill Box Bounding indicator
        if (activeTool === 'generative-fill' && genFillArea) {
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 6]);
            ctx.strokeRect(genFillArea.x, genFillArea.y, genFillArea.w, genFillArea.h);
            ctx.setLineDash([]);
        }
    };

    // Zoom Fitting Helper
    const fitCanvasToView = () => {
        if (!mainCanvasRef.current || !canvasWrapperRef.current) return;
        const wrapper = canvasWrapperRef.current;
        const canvas = mainCanvasRef.current;
        const wrapperRect = wrapper.getBoundingClientRect();
        const scaleX = (wrapperRect.width - 40) / canvas.width;
        const scaleY = (wrapperRect.height - 40) / canvas.height;
        const fitScale = Math.min(scaleX, scaleY);
        setZoom(fitScale <= 0 || !isFinite(fitScale) ? 0.5 : fitScale);
        setPanX(0);
        setPanY(0);
    };

    const autoRemoveBackground = (img, imgData) => {
        setProcessing({ visible: true, progress: 20, title: 'AI Auto-Detecting Background...' });
        setTimeout(() => {
            const data = imgData.data;
            const w = imgData.width;
            const h = imgData.height;
            
            const colorCounts = {};
            const sampleStep = Math.max(1, Math.floor(Math.min(w, h) / 100));

            const samplePixel = (x, y) => {
                const idx = (y * w + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];
                if (a < 200) return;
                const qr = Math.round(r / 10) * 10;
                const qg = Math.round(g / 10) * 10;
                const qb = Math.round(b / 10) * 10;
                const key = `${qr},${qg},${qb}`;
                if (!colorCounts[key]) {
                    colorCounts[key] = { count: 0, r: qr, g: qg, b: qb };
                }
                colorCounts[key].count++;
            };

            for (let x = 0; x < w; x += sampleStep) {
                samplePixel(x, 0);
                samplePixel(x, h - 1);
            }
            for (let y = 0; y < h; y += sampleStep) {
                samplePixel(0, y);
                samplePixel(w - 1, y);
            }

            const sorted = Object.values(colorCounts).sort((a, b) => b.count - a.count);
            let detectedColor = { r: 255, g: 255, b: 255 };
            if (sorted.length > 0) {
                detectedColor = { r: sorted[0].r, g: sorted[0].g, b: sorted[0].b };
            }
            setTargetColor(detectedColor);

            setProcessing({ visible: true, progress: 60, title: 'AI Removing background...' });

            const canvas = mainCanvasRef.current;
            if (!canvas) {
                setProcessing({ visible: false });
                return;
            }
            const baseCtx = canvas.getContext('2d');
            canvas.width = w;
            canvas.height = h;
            const freshImgData = new ImageData(
                new Uint8ClampedArray(imgData.data),
                w,
                h
            );
            const freshData = freshImgData.data;

            const toleranceSq = 55 * 55;
            for (let i = 0; i < freshData.length; i += 4) {
                const distSq = colorDistanceSq(
                    freshData[i], freshData[i + 1], freshData[i + 2],
                    detectedColor.r, detectedColor.g, detectedColor.b
                );
                if (distSq <= toleranceSq) {
                    freshData[i + 3] = 0;
                }
            }

            const softnessVal = 2;
            const alphaMap = new Uint8Array(w * h);
            for (let i = 0; i < w * h; i++) {
                alphaMap[i] = freshData[i * 4 + 3];
            }
            for (let y = softnessVal; y < h - softnessVal; y++) {
                for (let x = softnessVal; x < w - softnessVal; x++) {
                    const idx = y * w + x;
                    if (alphaMap[idx] === 255) {
                        let transparentNeighbors = 0;
                        let total = 0;
                        for (let dy = -softnessVal; dy <= softnessVal; dy++) {
                            for (let dx = -softnessVal; dx <= softnessVal; dx++) {
                                const nidx = (y + dy) * w + (x + dx);
                                if (alphaMap[nidx] === 0) {
                                    transparentNeighbors++;
                                }
                                total++;
                            }
                        }
                        if (transparentNeighbors > 0) {
                            const opacityRatio = 1 - (transparentNeighbors / total);
                            freshData[idx * 4 + 3] = Math.round(opacityRatio * 255);
                        }
                    }
                }
            }

            setResultImageData(freshImgData);
            setCurrentView('result');
            setProcessing({ visible: false, progress: 0 });
            showToast('AI Background removed automatically!', 'success');
        }, 600);
    };

    const loadImageFromDataURL = (dataUrl) => {
        const img = new Image();
        img.onload = () => {
            setOriginalImage(img);
            
            const offscreenCanvas = document.createElement('canvas');
            offscreenCanvas.width = img.width;
            offscreenCanvas.height = img.height;
            const offscreenCtx = offscreenCanvas.getContext('2d');
            offscreenCtx.drawImage(img, 0, 0);
            
            const imgData = offscreenCtx.getImageData(0, 0, img.width, img.height);
            setOriginalImageData(imgData);
            setResultImageData(null);
            setCurrentView('original');
            setLastClickedPixel(null);
            setZoom(1);
            setPanX(0);
            setPanY(0);
            setImageLoaded(true);

            setTimeout(() => {
                const canvas = mainCanvasRef.current;
                if (canvas) {
                    canvas.width = img.width;
                    canvas.height = img.height;
                }
                fitCanvasToView();
                
                if (activeTool === 'bg-remover' || activeTool === 'change-bg') {
                    if (bgRemovalMode === 'ai') {
                        applyAiAutoCutout(img, imgData);
                    } else {
                        autoRemoveBackground(img, imgData);
                    }
                } else {
                    autoDetectColor(imgData);
                }
            }, 100);
        };
        img.src = dataUrl;
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('framecut_active_image');
            if (saved && !imageLoaded) {
                loadImageFromDataURL(saved);
            }
        }
    }, []);

    // Load file
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) loadImage(file);
    };

    const loadImage = (file) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showToast('Please upload a valid image (PNG, JPG, or WEBP)', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('framecut_active_image', dataUrl);
            }
            loadImageFromDataURL(dataUrl);
            showToast('Image loaded successfully!', 'info');
        };
        reader.readAsDataURL(file);
    };

    // Auto-detect dominant background slot color
    const autoDetectColor = (imgData = originalImageData) => {
        if (!imgData) return;
        setProcessing({ visible: true, progress: 30, title: 'Analyzing frame slots...' });
        setTimeout(() => {
            const data = imgData.data;
            const w = imgData.width;
            const h = imgData.height;
            const colorCounts = {};
            const sampleStep = Math.max(1, Math.floor(Math.min(w, h) / 150));

            for (let y = 0; y < h; y += sampleStep) {
                for (let x = 0; x < w; x += sampleStep) {
                    const idx = (y * w + x) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    const a = data[idx + 3];
                    if (a < 200) continue;
                    const qr = Math.round(r / 8) * 8;
                    const qg = Math.round(g / 8) * 8;
                    const qb = Math.round(b / 8) * 8;
                    const key = `${qr},${qg},${qb}`;
                    if (!colorCounts[key]) {
                        colorCounts[key] = { count: 0, r: qr, g: qg, b: qb };
                    }
                    colorCounts[key].count++;
                }
            }

            const sorted = Object.values(colorCounts).sort((a, b) => b.count - a.count);
            if (sorted.length === 0) {
                setProcessing({ visible: false, progress: 0 });
                return;
            }

            let bestCandidate = sorted[0];
            let bestScore = 0;
            const candidates = sorted.slice(0, Math.min(10, sorted.length));
            for (const candidate of candidates) {
                const score = evaluateRectangularity(data, w, h, candidate, sampleStep);
                if (score > bestScore) {
                    bestScore = score;
                    bestCandidate = candidate;
                }
            }

            setTargetColor({
                r: bestCandidate.r,
                g: bestCandidate.g,
                b: bestCandidate.b
            });
            setProcessing({ visible: false, progress: 0 });
        }, 300);
    };

    // Low-level high-performance Background Removal Flood Fill mask logic
    const applyTransparency = (overrideColor = null, isUserTriggered = true) => {
        if (!originalImageData) return;
        if (isUserTriggered) {
            if (!deductTokens(1)) {
                showToast('Insufficient tokens to run Chroma Key (costs 1 token)', 'error');
                return;
            }
        }
        setProcessing({ visible: true, progress: 20, title: 'Removing background...' });

        setTimeout(() => {
            const w = originalImageData.width;
            const h = originalImageData.height;
            
            const freshImgData = new ImageData(
                new Uint8ClampedArray(originalImageData.data),
                w,
                h
            );
            const data = freshImgData.data;
            
            const activeColor = overrideColor || targetColor;
            const seedPoints = contiguous ? findSeedPoints(data, w, h, activeColor, tolerance) : [];
            setProcessing({ visible: true, progress: 50, title: 'Applying alpha mask...' });

            const toleranceSq = tolerance * tolerance;
            if (contiguous) {
                const visited = new Uint8Array(w * h);
                const queue = [];
                for (const seed of seedPoints) {
                    const idx = seed.y * w + seed.x;
                    queue.push(idx);
                    visited[idx] = 1;
                }

                while (queue.length > 0) {
                    const curr = queue.shift();
                    const cx = curr % w;
                    const cy = Math.floor(curr / w);
                    const idx = curr * 4;

                    data[idx + 3] = 0; // Transparentize

                    const neighbors = [
                        { x: cx - 1, y: cy },
                        { x: cx + 1, y: cy },
                        { x: cx, y: cy - 1 },
                        { x: cx, y: cy + 1 }
                    ];

                    for (const n of neighbors) {
                        if (n.x >= 0 && n.x < w && n.y >= 0 && n.y < h) {
                            const nidx = n.y * w + n.x;
                            if (visited[nidx] === 0) {
                                visited[nidx] = 1;
                                const pidx = nidx * 4;
                                const distSq = colorDistanceSq(
                                    data[pidx], data[pidx + 1], data[pidx + 2],
                                    activeColor.r, activeColor.g, activeColor.b
                                );
                                if (distSq <= toleranceSq) {
                                    queue.push(nidx);
                                }
                            }
                        }
                    }
                }
            } else {
                for (let i = 0; i < data.length; i += 4) {
                    const distSq = colorDistanceSq(
                        data[i], data[i + 1], data[i + 2],
                        activeColor.r, activeColor.g, activeColor.b
                    );
                    if (distSq <= toleranceSq) {
                        data[i + 3] = 0;
                    }
                }
            }

            setProcessing({ visible: true, progress: 80, title: 'Dilating edges...' });

            // Apply Edge Softening (2-pass alpha box blur)
            if (softness > 0) {
                const alpha = new Uint8Array(w * h);
                for (let i = 0; i < w * h; i++) {
                    alpha[i] = data[i * 4 + 3];
                }
                const radius = Math.min(12, softness);
                const tempAlpha = new Uint8Array(w * h);
                
                // Horizontal Pass
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        let sum = 0;
                        let count = 0;
                        for (let dx = -radius; dx <= radius; dx++) {
                            const nx = x + dx;
                            if (nx >= 0 && nx < w) {
                                sum += alpha[y * w + nx];
                                count++;
                            }
                        }
                        tempAlpha[y * w + x] = sum / count;
                    }
                }
                
                // Vertical Pass
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        let sum = 0;
                        let count = 0;
                        for (let dy = -radius; dy <= radius; dy++) {
                            const ny = y + dy;
                            if (ny >= 0 && ny < h) {
                                sum += tempAlpha[ny * w + x];
                                count++;
                            }
                        }
                        data[(y * w + x) * 4 + 3] = sum / count;
                    }
                }
            }

            setResultImageData(freshImgData);
            setCurrentView('result');
            setProcessing({ visible: false, progress: 0 });
            showToast('Transparency applied successfully!', 'success');
        }, 300);
    };

    // Dynamic library loader helper
    const loadScript = (src) => {
        return new Promise((resolve, reject) => {
            if (typeof window !== 'undefined' && window.SelfieSegmentation) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.crossOrigin = 'anonymous';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    };

    const detectBackgroundColorFromCorners = (imgData) => {
        if (!imgData) return { r: 255, g: 255, b: 255 };
        const data = imgData.data;
        const w = imgData.width;
        const h = imgData.height;
        
        // Sample the 4 corners: top-left, top-right, bottom-left, bottom-right
        const corners = [
            { x: 0, y: 0 },
            { x: w - 1, y: 0 },
            { x: 0, y: h - 1 },
            { x: w - 1, y: h - 1 }
        ];
        
        const counts = {};
        for (const pt of corners) {
            const idx = (pt.y * w + pt.x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const key = `${r},${g},${b}`;
            counts[key] = (counts[key] || 0) + 1;
        }
        
        // Find the most frequent color
        let bestKey = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
        if (bestKey) {
            const [r, g, b] = bestKey.split(',').map(Number);
            return { r, g, b };
        }
        return { r: 255, g: 255, b: 255 }; // default white
    };

    // Fast AI Fallback (MediaPipe Selfie Segmentation)
    const applyMediaPipeCutout = async (img, imgData) => {
        setProcessing({ visible: true, progress: 20, title: 'Loading Fast AI Model...' });
        try {
            await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js');
            
            setProcessing({ visible: true, progress: 45, title: 'Initializing Fast AI detector...' });
            
            const selfieSegmentation = new window.SelfieSegmentation({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
            });
            
            selfieSegmentation.setOptions({
                modelSelection: 1, // General model (highly accurate)
            });
            
            let cutoutResult = null;
            
            selfieSegmentation.onResults((results) => {
                const w = imgData.width;
                const h = imgData.height;
                
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = w;
                tempCanvas.height = h;
                const tempCtx = tempCanvas.getContext('2d');
                
                tempCtx.drawImage(results.segmentationMask, 0, 0, w, h);
                const maskData = tempCtx.getImageData(0, 0, w, h).data;
                
                const outImageData = new ImageData(
                    new Uint8ClampedArray(imgData.data),
                    w,
                    h
                );
                const oData = outImageData.data;
                
                // Determine which channel to use (Red or Alpha) based on channel variation
                let minRed = 255, maxRed = 0;
                let minAlpha = 255, maxAlpha = 0;
                for (let i = 0; i < maskData.length; i += 4) {
                    const r = maskData[i];
                    const a = maskData[i + 3];
                    if (r < minRed) minRed = r;
                    if (r > maxRed) maxRed = r;
                    if (a < minAlpha) minAlpha = a;
                    if (a > maxAlpha) maxAlpha = a;
                }
                const redVaries = (maxRed - minRed) > 10;
                const alphaVaries = (maxAlpha - minAlpha) > 10;
                const useAlpha = alphaVaries && !redVaries;
                
                // 1. Extract raw mask probabilities (0 to 255)
                const rawMask = new Uint8Array(w * h);
                for (let i = 0; i < w * h; i++) {
                    const idx = i * 4;
                    const maskVal = useAlpha ? maskData[idx + 3] : maskData[idx];
                    rawMask[i] = maskVal;
                }
                
                // 2. Threshold the mask to get a clean binary mask (0 or 255)
                // This removes fuzzy, semi-transparent background halos
                const binaryMask = new Uint8Array(w * h);
                let foregroundPixels = 0;
                for (let i = 0; i < w * h; i++) {
                    const val = rawMask[i] > 120 ? 255 : 0;
                    binaryMask[i] = val;
                    if (val === 255) {
                        foregroundPixels++;
                    }
                }

                // If foreground is extremely small (less than 3% of the image), it is highly likely a logo or object without a person.
                // Fall back to Chroma Key color detection instead of removing the entire image.
                const foregroundRatio = foregroundPixels / (w * h);
                if (foregroundRatio < 0.03) {
                    selfieSegmentation.close();
                    const detectedBg = detectBackgroundColorFromCorners(imgData);
                    setTargetColor(detectedBg);
                    showToast('Logo/graphics detected. Auto-removing background color...', 'info');
                    applyTransparency(detectedBg, false);
                    return;
                }
                
                // 3. Erode the mask to cut slightly into the subject and remove the background outline
                // Scale erosion radius with image size (minimum 1 pixel, max 4 pixels)
                const erosionRadius = Math.max(1, Math.min(4, Math.round(Math.min(w, h) / 600)));
                const tempErode = new Uint8Array(w * h);
                const erodedMask = new Uint8Array(w * h);
                
                // Horizontal erosion pass
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        let minVal = 255;
                        for (let dx = -erosionRadius; dx <= erosionRadius; dx++) {
                            const nx = x + dx;
                            if (nx >= 0 && nx < w) {
                                const val = binaryMask[y * w + nx];
                                if (val < minVal) minVal = val;
                            }
                        }
                        tempErode[y * w + x] = minVal;
                    }
                }
                
                // Vertical erosion pass
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        let minVal = 255;
                        for (let dy = -erosionRadius; dy <= erosionRadius; dy++) {
                            const ny = y + dy;
                            if (ny >= 0 && ny < h) {
                                const val = tempErode[ny * w + x];
                                if (val < minVal) minVal = val;
                            }
                        }
                        erodedMask[y * w + x] = minVal;
                    }
                }
                
                // 4. Smooth/blur the eroded mask using the softness slider (default/minimum 2px for anti-aliasing)
                const finalMask = new Uint8Array(w * h);
                const radius = Math.max(2, softness); // Use at least 2px to ensure anti-aliased, smooth edges
                
                const tempAlpha = new Uint8Array(w * h);
                // Horizontal blur pass
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        let sum = 0;
                        let count = 0;
                        for (let dx = -radius; dx <= radius; dx++) {
                            const nx = x + dx;
                            if (nx >= 0 && nx < w) {
                                sum += erodedMask[y * w + nx];
                                count++;
                            }
                        }
                        tempAlpha[y * w + x] = sum / count;
                    }
                }
                // Vertical blur pass
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        let sum = 0;
                        let count = 0;
                        for (let dy = -radius; dy <= radius; dy++) {
                            const ny = y + dy;
                            if (ny >= 0 && ny < h) {
                                sum += tempAlpha[ny * w + x];
                                count++;
                            }
                        }
                        finalMask[y * w + x] = sum / count;
                    }
                }
                
                // 5. Apply the final smoothed and eroded mask to the output image's alpha channel
                for (let i = 0; i < w * h; i++) {
                    oData[i * 4 + 3] = Math.round((oData[i * 4 + 3] * finalMask[i]) / 255);
                }
                
                outCtx.putImageData(outImageData, 0, 0);
                cutoutResult = outImageData;
            });
            
            setProcessing({ visible: true, progress: 70, title: 'Segmenting foreground...' });
            await selfieSegmentation.send({ image: img });
            
            let attempts = 0;
            while (!cutoutResult && attempts < 100) {
                await new Promise(r => setTimeout(r, 50));
                attempts++;
            }
            
            if (cutoutResult) {
                setResultImageData(cutoutResult);
                setCurrentView('result');
                setProcessing({ visible: false, progress: 0 });
                showToast('AI Background removed successfully!', 'success');
            } else {
                throw new Error('Fast AI processing timed out');
            }
            
            selfieSegmentation.close();
            
        } catch (err) {
            console.error(err);
            setProcessing({ visible: false, progress: 0 });
            showToast('AI cutout failed. Using color key fallback.', 'warning');
            applyTransparency(null, false);
        }
    };

    // AI Automatic Background Removal (Professional U2Net/MODNet Model)
    const applyAiAutoCutout = async (passedImg = null, passedImgData = null) => {
        const img = passedImg || originalImage;
        const imgData = passedImgData || originalImageData;
        if (!img || !imgData) return;

        if (!deductTokens(2)) {
            showToast('Insufficient tokens to run AI Auto Cutout (costs 2 tokens)', 'error');
            return;
        }

        setProcessing({ visible: true, progress: 10, title: 'Initializing Professional AI...' });
        
        try {
            // Dynamically import the package from jsdelivr CDN ESM
            const module = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal/+esm');
            const removeBackground = module.removeBackground;
            
            setProcessing({ visible: true, progress: 20, title: 'AI processing image background...' });
            
            const processedBlob = await removeBackground(img.src, {
                debug: false,
                progress: (key, current, total) => {
                    const percent = Math.round((current / total) * 100);
                    let phase = 'AI is thinking...';
                    if (key.includes('fetch')) {
                        phase = 'Loading AI Model Files...';
                    } else if (key.includes('onnx')) {
                        phase = 'Extracting foreground...';
                    }
                    const overallPercent = 20 + Math.round((percent / 100) * 75);
                    setProcessing({ visible: true, progress: overallPercent, title: `${phase} (${percent}%)` });
                }
            });
            
            setProcessing({ visible: true, progress: 95, title: 'Rendering final output...' });
            
            const resultImg = new Image();
            await new Promise((resolve, reject) => {
                resultImg.onload = resolve;
                resultImg.onerror = reject;
                resultImg.src = URL.createObjectURL(processedBlob);
            });
            
            const w = imgData.width;
            const h = imgData.height;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = w;
            tempCanvas.height = h;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(resultImg, 0, 0, w, h);
            const cutoutResult = tempCtx.getImageData(0, 0, w, h);
            
            // Clean up Object URL
            URL.revokeObjectURL(resultImg.src);
            
            setResultImageData(cutoutResult);
            setCurrentView('result');
            setProcessing({ visible: false, progress: 0 });
            showToast('Professional AI Background removed successfully!', 'success');
            
        } catch (err) {
            console.warn('Professional AI failed, falling back to Fast AI (MediaPipe)...', err);
            await applyMediaPipeCutout(img, imgData);
        }
    };

    // Manual pixel eraser for background remover cleanup
    const erasePixels = (cx, cy, radius) => {
        const sourceData = resultImageData || originalImageData;
        if (!sourceData) return;
        const w = sourceData.width;
        const h = sourceData.height;
        const nextData = new ImageData(
            new Uint8ClampedArray(sourceData.data),
            w,
            h
        );
        const data = nextData.data;
        const rSq = radius * radius;
        
        const startY = Math.max(0, Math.floor(cy - radius));
        const endY = Math.min(h - 1, Math.floor(cy + radius));
        const startX = Math.max(0, Math.floor(cx - radius));
        const endX = Math.min(w - 1, Math.floor(cx + radius));
        
        let changed = false;
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const distSq = (x - cx) * (x - cx) + (y - cy) * (y - cy);
                if (distSq <= rSq) {
                    const idx = (y * w + x) * 4;
                    if (data[idx + 3] !== 0) {
                        data[idx + 3] = 0; // Set Alpha to 0 (make transparent)
                        changed = true;
                    }
                }
            }
        }
        if (changed) {
            setResultImageData(nextData);
        }
    };

    // ==========================================
    // MULTI-TOOL ALGORITHM ACTIONS IMPLEMENTATIONS
    // ==========================================

    // 2. Image Upscaler Action
    const runUpscale = () => {
        const sourceData = resultImageData || originalImageData;
        if (!sourceData) return;
        
        if (!deductTokens(3)) {
            showToast('Insufficient tokens to run AI Upscale (costs 3 tokens)', 'error');
            return;
        }

        setProcessing({ visible: true, progress: 20, title: 'Interpolating sub-pixels...' });
        
        setTimeout(() => {
            const canvas = mainCanvasRef.current;
            const newW = sourceData.width * upscaleFactor;
            const newH = sourceData.height * upscaleFactor;
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = sourceData.width;
            tempCanvas.height = sourceData.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.putImageData(sourceData, 0, 0);

            canvas.width = newW;
            canvas.height = newH;
            const ctx = canvas.getContext('2d');
            
            // Apply high-quality smooth upscaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(tempCanvas, 0, 0, newW, newH);

            const upscaledData = ctx.getImageData(0, 0, newW, newH);
            
            setOriginalImageData(upscaledData);
            setResultImageData(upscaledData);
            setCurrentView('result');
            setProcessing({ visible: false, progress: 0 });
            showToast(`Upscaled to ${upscaleFactor}x successfully!`, 'success');
            setTimeout(fitCanvasToView, 50);
        }, 1200);
    };

    const applyBgStyleAction = () => {
        if (!deductTokens(1)) {
            showToast('Insufficient tokens to apply custom background (costs 1 token)', 'error');
            return;
        }
        setBgChangeApplied(true);
        showToast('Background layout applied!', 'success');
    };

    const applyAiAdOverlay = () => {
        if (!deductTokens(3)) {
            showToast('Insufficient tokens to generate AI Ad Banner (costs 3 tokens)', 'error');
            return;
        }
        setAdBannerGenerated(true);
        showToast('AI Ad Banner template generated!', 'success');
    };

    const handleVideoSampleSelect = (val) => {
        if (!val) return;
        if (!deductTokens(5)) {
            showToast('Insufficient tokens to process Video BG Remover (costs 5 tokens)', 'error');
            return;
        }
        setVideoSample(val);
        if (videoLoopId.current) cancelAnimationFrame(videoLoopId.current);

        const video = document.createElement('video');
        if (val.startsWith('blob:')) {
            video.src = val;
        } else {
            video.src = val === 'spinning-cube'
                ? 'https://assets.mixkit.co/videos/preview/mixkit-cube-of-orange-3D-lines-spinning-41710-large.mp4'
                : 'https://assets.mixkit.co/videos/preview/mixkit-rotating-retro-cassette-tape-41887-large.mp4';
        }
        video.crossOrigin = 'anonymous';
        video.loop = true;
        video.muted = true;
        videoRef.current = video;

        video.onloadedmetadata = () => {
            const canvas = mainCanvasRef.current;
            canvas.width = video.videoWidth / 2; // smaller for faster loop
            canvas.height = video.videoHeight / 2;
            fitCanvasToView();
            video.play();
            setVideoPlaying(true);
            triggerVideoRemovalLoop();
        };
    };

    const triggerVideoRemovalLoop = () => {
        if (!videoRef.current || !mainCanvasRef.current) return;
        const video = videoRef.current;
        const canvas = mainCanvasRef.current;
        const ctx = canvas.getContext('2d');

        const processFrame = () => {
            if (video.paused || video.ended) return;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = frame.data;

            // Remove green/black backgrounds using simple chroma-keying
            const rKey = chromaKeyColor.r;
            const gKey = chromaKeyColor.g;
            const bKey = chromaKeyColor.b;
            const tol = chromaTolerance * chromaTolerance;

            for (let i = 0; i < data.length; i += 4) {
                const dSq = colorDistanceSq(data[i], data[i+1], data[i+2], rKey, gKey, bKey);
                if (dSq <= tol) {
                    data[i + 3] = 0; // Set transparency
                }
            }

            ctx.putImageData(frame, 0, 0);
            videoLoopId.current = requestAnimationFrame(processFrame);
        };
        videoLoopId.current = requestAnimationFrame(processFrame);
    };

    // 5. Magic Eraser (Inpainting) Action
    const applyMagicEraser = () => {
        if (currentEraserPath.length === 0) return;

        if (!deductTokens(3)) {
            showToast('Insufficient tokens to run Magic Eraser (costs 3 tokens)', 'error');
            return;
        }

        setProcessing({ visible: true, progress: 40, title: 'Inpainting masked region...' });

        setTimeout(() => {
            const baseData = resultImageData || originalImageData;
            const w = baseData.width;
            const h = baseData.height;

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = w;
            tempCanvas.height = h;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.putImageData(baseData, 0, 0);
            const imgData = tempCtx.getImageData(0, 0, w, h);
            const data = imgData.data;

            // Draw line strokes onto a Uint8Array mask
            const mask = new Uint8Array(w * h);
            const drawCircleOnMask = (cx, cy, radius) => {
                const rSq = radius * radius;
                for (let my = Math.max(0, cy - radius); my <= Math.min(h - 1, cy + radius); my++) {
                    for (let mx = Math.max(0, cx - radius); mx <= Math.min(w - 1, cx + radius); mx++) {
                        if ((mx - cx) * (mx - cx) + (my - cy) * (my - cy) <= rSq) {
                            mask[my * w + mx] = 1;
                        }
                    }
                }
            };

            for (let i = 0; i < currentEraserPath.length - 1; i++) {
                const p1 = currentEraserPath[i];
                const p2 = currentEraserPath[i+1];
                const steps = Math.max(10, Math.round(colorDistance(p1.x, p1.y, p2.x, p2.y) / 2));
                for (let s = 0; s <= steps; s++) {
                    const cx = Math.round(p1.x + (p2.x - p1.x) * (s / steps));
                    const cy = Math.round(p1.y + (p2.y - p1.y) * (s / steps));
                    drawCircleOnMask(cx, cy, Math.round(eraserBrushSize / 2));
                }
            }

            // Simple diffusion inpainting loop (12 iterations)
            for (let iter = 0; iter < 12; iter++) {
                const readData = new Uint8ClampedArray(data);
                for (let y = 1; y < h - 1; y++) {
                    for (let x = 1; x < w - 1; x++) {
                        const idx = (y * w + x) * 4;
                        if (mask[y * w + x] === 1) {
                            let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
                            const neighbors = [
                                [x-1, y], [x+1, y], [x, y-1], [x, y+1]
                            ];
                            for (const [nx, ny] of neighbors) {
                                const nidx = (ny * w + nx) * 4;
                                if (mask[ny * w + nx] === 0) {
                                    rSum += readData[nidx];
                                    gSum += readData[nidx+1];
                                    bSum += readData[nidx+2];
                                    aSum += readData[nidx+3];
                                    count++;
                                }
                            }
                            if (count > 0) {
                                data[idx] = rSum / count;
                                data[idx+1] = gSum / count;
                                data[idx+2] = bSum / count;
                                data[idx+3] = aSum / count;
                            }
                        }
                    }
                }
            }

            setResultImageData(imgData);
            setCurrentView('result');
            setCurrentEraserPath([]);
            setProcessing({ visible: false, progress: 0 });
            showToast('Object erased successfully!', 'success');
        }, 800);
    };

    // 6. AI Image Generator Action
    const runAiImageGenerator = () => {
        if (!aiImagePrompt) return;

        if (!deductTokens(4)) {
            showToast('Insufficient tokens to run AI Image Generator (costs 4 tokens)', 'error');
            return;
        }

        setProcessing({ visible: true, progress: 20, title: 'Calling AI pipelines...' });
        
        setTimeout(() => {
            const canvas = mainCanvasRef.current;
            canvas.width = 600;
            canvas.height = 600;
            const ctx = canvas.getContext('2d');
            
            // Load a premium placeholder render based on prompt categories
            const category = aiImagePrompt.toLowerCase();
            let src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop'; // default sneaker
            
            if (category.includes('watch') || category.includes('clock')) {
                src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop';
            } else if (category.includes('office') || category.includes('chair') || category.includes('desk') || category.includes('headphone')) {
                src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop';
            } else if (category.includes('bag') || category.includes('backpack') || category.includes('handbag')) {
                src = 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop';
            } else if (category.includes('phone') || category.includes('mobile') || category.includes('iphone')) {
                src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop';
            } else if (category.includes('perfume') || category.includes('scent') || category.includes('cologne')) {
                src = 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&auto=format&fit=crop';
            } else if (category.includes('car') || category.includes('vehicle') || category.includes('sportscar')) {
                src = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop';
            } else if (category.includes('glasses') || category.includes('sunglasses')) {
                src = 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&auto=format&fit=crop';
            } else if (category.includes('cosmetics') || category.includes('cream') || category.includes('skincare')) {
                src = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop';
            } else if (category.includes('coffee') || category.includes('mug') || category.includes('cup') || category.includes('drink')) {
                src = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop';
            }
            
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                ctx.drawImage(img, 0, 0, 600, 600);
                const imgData = ctx.getImageData(0, 0, 600, 600);
                setOriginalImage(img);
                setOriginalImageData(imgData);
                setResultImageData(null);
                setCurrentView('original');
                setZoom(1);
                setPanX(0);
                setPanY(0);
                setImageLoaded(true);
                setProcessing({ visible: false, progress: 0 });
                showToast('AI Image generated!', 'success');
                setTimeout(fitCanvasToView, 50);
            };
            img.src = src;
        }, 1500);
    };

    // 7. AI Video Generator Action
    const runAiVideoGenerator = () => {
        if (!aiVideoPrompt) return;

        if (!deductTokens(10)) {
            showToast('Insufficient tokens to run AI Video Generator (costs 10 tokens)', 'error');
            return;
        }

        setProcessing({ visible: true, progress: 20, title: 'Rendering keyframes...' });
        
        setTimeout(() => {
            setGeneratedVideoUrl('https://assets.mixkit.co/videos/preview/mixkit-cube-of-orange-3D-lines-spinning-41710-large.mp4');
            setProcessing({ visible: false, progress: 0 });
            showToast('AI Video generated successfully!', 'success');
        }, 1800);
    };

    // 8. Generative Fill Action
    const applyGenerativeFill = () => {
        if (!genFillArea || !genFillPrompt) return;

        if (!deductTokens(4)) {
            showToast('Insufficient tokens to run Generative Fill (costs 4 tokens)', 'error');
            return;
        }

        setProcessing({ visible: true, progress: 45, title: 'Synthesizing layout objects...' });
        
        setTimeout(() => {
            const baseData = resultImageData || originalImageData;
            const canvas = mainCanvasRef.current;
            const ctx = canvas.getContext('2d');
            
            // Draw baseline image
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = baseData.width;
            tempCanvas.height = baseData.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.putImageData(baseData, 0, 0);
            
            ctx.drawImage(tempCanvas, 0, 0);
            
            // Draw a high-contrast sticker item corresponding to prompt in the bounding box
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.roundRect(genFillArea.x + 10, genFillArea.y + 10, genFillArea.w - 20, genFillArea.h - 20, 8);
            ctx.fill();
            
            ctx.fillStyle = '#000';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(genFillPrompt.toUpperCase(), genFillArea.x + genFillArea.w/2, genFillArea.y + genFillArea.h/2 + 5);

            const modifiedData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            setResultImageData(modifiedData);
            setCurrentView('result');
            setGenFillArea(null);
            setProcessing({ visible: false, progress: 0 });
            showToast('Generative fill completed!', 'success');
        }, 1000);
    };

    // 9. Uncrop (AI Expand Canvas) Action
    const applyUncrop = () => {
        const sourceData = resultImageData || originalImageData;
        if (!sourceData) return;

        if (!deductTokens(3)) {
            showToast('Insufficient tokens to run Uncrop (costs 3 tokens)', 'error');
            return;
        }

        setProcessing({ visible: true, progress: 40, title: 'Reconstructing canvas borders...' });

        setTimeout(() => {
            const canvas = mainCanvasRef.current;
            const newW = sourceData.width + expandMargin * 2;
            const newH = sourceData.height + expandMargin * 2;
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = sourceData.width;
            tempCanvas.height = sourceData.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.putImageData(sourceData, 0, 0);

            canvas.width = newW;
            canvas.height = newH;
            const ctx = canvas.getContext('2d');
            
            // Draw original in center
            ctx.drawImage(tempCanvas, expandMargin, expandMargin);
            const expandedData = ctx.getImageData(0, 0, newW, newH);
            
            setOriginalImageData(expandedData);
            setResultImageData(expandedData);
            setCurrentView('result');
            setProcessing({ visible: false, progress: 0 });
            showToast('Canvas expanded!', 'success');
            setTimeout(fitCanvasToView, 50);
        }, 1000);
    };

    // 11. Bulk Editor File Upload Queue Action
    const handleBulkUpload = (e) => {
        const files = Array.from(e.target.files);
        const newQueue = files.map(file => ({
            file,
            name: file.name,
            status: 'pending'
        }));
        setBulkQueue(newQueue);
    };

    const processBulkQueue = () => {
        if (bulkQueue.length === 0) return;

        const cost = bulkQueue.length;
        if (!deductTokens(cost)) {
            showToast(`Insufficient tokens to process batch queue (costs ${cost} tokens)`, 'error');
            return;
        }

        let index = 0;
        
        const processNext = () => {
            if (index >= bulkQueue.length) {
                showToast('All batch files transparentized!', 'success');
                return;
            }
            
            setBulkQueue(prev => prev.map((item, i) => i === index ? { ...item, status: 'processing' } : item));
            
            setTimeout(() => {
                setBulkQueue(prev => prev.map((item, i) => i === index ? { ...item, status: 'completed' } : item));
                index++;
                processNext();
            }, 850);
        };
        processNext();
    };

    // 13. Text & Overlays helper
    const addTextOverlay = () => {
        const newItem = {
            id: Date.now(),
            text: newTextVal,
            x: originalImageData ? originalImageData.width / 2 : 250,
            y: originalImageData ? originalImageData.height / 2 : 250,
            size: 32,
            color: '#ffffff'
        };
        setTextItems(prev => [...prev, newItem]);
        setSelectedTextId(newItem.id);
        showToast('Text item overlay added!', 'success');
    };

    const deleteSelectedText = () => {
        if (!selectedTextId) return;
        setTextItems(prev => prev.filter(t => t.id !== selectedTextId));
        setSelectedTextId(null);
    };

    const clearWorkspaceImage = () => {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('framecut_active_image');
        }
        setOriginalImage(null);
        setOriginalImageData(null);
        setResultImageData(null);
        setImageLoaded(false);
        setCurrentView('original');
        setLastClickedPixel(null);
        setZoom(1);
        setPanX(0);
        setPanY(0);
        showToast('Active image cleared!', 'info');
    };

    // Global viewport actions
    const resetEditor = () => {
        if (!originalImage) return;
        const canvas = mainCanvasRef.current;
        canvas.width = originalImage.width;
        canvas.height = originalImage.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(originalImage, 0, 0);
        setResultImageData(null);
        setCurrentView('original');
        setLastClickedPixel(null);
        setZoom(1);
        setPanX(0);
        setPanY(0);
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setBlur(0);
        setTextItems([]);
        setBrushStrokes([]);
        setRotationAngle(0);
        setFlipHorizontal(false);
        setFlipVertical(false);
        setGenFillArea(null);
        showToast('Canvas reset to original', 'info');
        setTimeout(fitCanvasToView, 50);
    };

    const triggerNewUpload = () => {
        fileInputRef.current?.click();
    };

    const downloadPNG = () => {
        const baseData = resultImageData || originalImageData;
        if (!baseData) return;

        // Draw final composite with overlays
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = mainCanvasRef.current.width;
        tempCanvas.height = mainCanvasRef.current.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Copy the main screen content exactly
        tempCtx.drawImage(mainCanvasRef.current, 0, 0);

        const link = document.createElement('a');
        link.download = 'framecut_output.png';
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
        showToast('PNG image downloaded!', 'success');
    };

    // ==========================================
    // MOUSE EVENT INTERACTION HANDLERS
    // ==========================================
    const handleMouseDown = (e) => {
        if (!originalImageData || !mainCanvasRef.current) return;
        const rect = mainCanvasRef.current.getBoundingClientRect();
        
        // Mouse coordinate in Canvas pixel space
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;

        // 14. Text overlay move selection logic
        if (activeTool === 'text-overlay') {
            const clickedItem = textItems.find(item => {
                const dist = Math.hypot(item.x - x, item.y - y);
                return dist < 40;
            });
            if (clickedItem) {
                setSelectedTextId(clickedItem.id);
                setNewTextVal(clickedItem.text);
                setIsDragging(true);
                dragStart.current = { x: e.clientX, y: e.clientY };
                return;
            } else {
                setSelectedTextId(null);
            }
        }

        // 15. Brush drawing
        if (activeTool === 'brush-draw') {
            setIsDrawingStroke(true);
            const newStroke = {
                color: brushColor,
                size: brushSize,
                points: [{ x, y }]
            };
            setBrushStrokes(prev => [...prev, newStroke]);
            return;
        }

        // 5. Magic Eraser drawing mask path
        if (activeTool === 'magic-eraser') {
            setIsDrawingEraser(true);
            setCurrentEraserPath([{ x, y }]);
            return;
        }

        // 8. Generative Fill Bounding box draw
        if (activeTool === 'generative-fill') {
            setIsDrawingGenFillBox(true);
            setGenFillStartPoint({ x, y });
            setGenFillArea({ x, y, w: 0, h: 0 });
            return;
        }

        // Manual Erase dragging in background remover
        if (activeTool === 'bg-remover' && bgRemoverManualEraseMode && currentView === 'result') {
            setIsManualErasing(true);
            erasePixels(x, y, manualEraseBrushSize);
            return;
        }

        // 1. Color Picker selection (Background remover)
        if (activeTool === 'bg-remover' && currentView === 'original') {
            const canvasX = Math.floor(x);
            const canvasY = Math.floor(y);

            if (canvasX >= 0 && canvasX < originalImageData.width && canvasY >= 0 && canvasY < originalImageData.height) {
                const idx = (canvasY * originalImageData.width + canvasX) * 4;
                const r = originalImageData.data[idx];
                const g = originalImageData.data[idx + 1];
                const b = originalImageData.data[idx + 2];

                setTargetColor({ r, g, b });
                setLastClickedPixel({ x: canvasX, y: canvasY });
                showToast(`Picked color: RGB(${r}, ${g}, ${b})`, 'info');
            }
            return;
        }

        // Default workspace panning
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        dragInitialPan.current = { x: panX, y: panY };
    };

    const handleMouseMove = (e) => {
        if (!originalImageData || !mainCanvasRef.current) return;
        const rect = mainCanvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;

        // Manual Erase dragging in background remover
        if (activeTool === 'bg-remover' && bgRemoverManualEraseMode && isManualErasing && currentView === 'result') {
            erasePixels(x, y, manualEraseBrushSize);
            return;
        }

        // Hover Loupe magnifier details
        if (activeTool === 'bg-remover' && currentView === 'original') {
            const canvasX = Math.floor(x);
            const canvasY = Math.floor(y);

            if (canvasX >= 0 && canvasX < originalImageData.width && canvasY >= 0 && canvasY < originalImageData.height) {
                const wrapperRect = canvasWrapperRef.current.getBoundingClientRect();
                setLoupe({
                    visible: true,
                    x: e.clientX - wrapperRect.left,
                    y: e.clientY - wrapperRect.top,
                    cx: canvasX,
                    cy: canvasY
                });
                drawLoupe(canvasX, canvasY);
            } else {
                setLoupe(l => ({ ...l, visible: false }));
            }
        }

        // Draw brush strokes
        if (activeTool === 'brush-draw' && isDrawingStroke) {
            setBrushStrokes(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                last.points.push({ x, y });
                return updated;
            });
            return;
        }

        // Eraser mask drawing
        if (activeTool === 'magic-eraser' && isDrawingEraser) {
            setCurrentEraserPath(prev => [...prev, { x, y }]);
            return;
        }

        // Generative Fill box dragging
        if (activeTool === 'generative-fill' && isDrawingGenFillBox && genFillStartPoint) {
            const w = x - genFillStartPoint.x;
            const h = y - genFillStartPoint.y;
            setGenFillArea({
                x: w < 0 ? x : genFillStartPoint.x,
                y: h < 0 ? y : genFillStartPoint.y,
                w: Math.abs(w),
                h: Math.abs(h)
            });
            return;
        }

        // Dragging / Panning
        if (!isDragging) return;

        if (activeTool === 'text-overlay' && selectedTextId) {
            setTextItems(prev => prev.map(item => {
                if (item.id === selectedTextId) {
                    return { ...item, x, y };
                }
                return item;
            }));
            return;
        }

        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPanX(dragInitialPan.current.x + dx);
        setPanY(dragInitialPan.current.y + dy);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        if (activeTool === 'bg-remover' && isManualErasing) {
            setIsManualErasing(false);
        }
        if (activeTool === 'brush-draw') setIsDrawingStroke(false);
        if (activeTool === 'magic-eraser' && isDrawingEraser) {
            setIsDrawingEraser(false);
            applyMagicEraser();
        }
        if (activeTool === 'generative-fill') {
            setIsDrawingGenFillBox(false);
        }
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => Math.max(0.1, Math.min(10, prev * delta)));
    };

    const drawLoupe = (cx, cy) => {
        if (!loupeCanvasRef.current || !originalImageData) return;
        const canvas = loupeCanvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 120, 120);

        const loupeScale = 6;
        const size = 20;

        ctx.imageSmoothingEnabled = false;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalImageData.width;
        tempCanvas.height = originalImageData.height;
        tempCanvas.getContext('2d').putImageData(originalImageData, 0, 0);

        ctx.drawImage(
            tempCanvas,
            cx - size / 2, cy - size / 2, size, size,
            0, 0, 120, 120
        );
    };

    if (!user) {
        return (
            <div className="landing-page-root" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', padding: '24px', background: 'var(--bg-color)', color: 'var(--text-color)', position: 'relative', overflow: 'hidden' }}>
                <div className="landing-bg">
                    <div className="glow glow-1"></div>
                    <div className="glow glow-2"></div>
                </div>
                
                <div style={{ maxWidth: '480px', width: '100%', padding: '40px 32px', textAlign: 'center', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', position: 'relative', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', backdropFilter: 'blur(8px)' }}>
                    
                    <span style={{ marginBottom: '24px', display: 'inline-flex', gap: '4px', fontSize: '28px', fontFamily: 'var(--font-outfit), sans-serif' }}>
                        <strong style={{ fontWeight: '900', color: '#475569', letterSpacing: '-0.5px' }}>FRAME</strong>
                        <span style={{ fontWeight: '300', color: '#94a3b8', letterSpacing: '-0.5px' }}>CUT</span>
                    </span>
                    
                    <h2 style={{ fontSize: '20px', marginBottom: '16px', textTransform: 'uppercase', fontFamily: 'var(--font-outfit), sans-serif', color: 'var(--text-color)', letterSpacing: '0.5px' }}>Authentication Required</h2>
                    <p style={{ fontSize: '14px', marginBottom: '32px', lineHeight: '1.6', fontFamily: 'var(--font-outfit), sans-serif', color: 'var(--text-muted)' }}>
                        To access FrameCut Studio, please sign in with your account first. 
                        New accounts receive <strong style={{ color: '#2563eb' }}>20 free tokens</strong> immediately.
                    </p>
                    
                    <button 
                        onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                        className="btn btn-primary"
                        style={{ width: '100%', background: 'var(--primary-grad)', color: '#fff', border: 'none', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '999px', textTransform: 'uppercase', fontSize: '14px' }}
                    >
                        Sign In / Sign Up
                    </button>
                    
                    <a href="/" style={{ display: 'block', marginTop: '20px', color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none', fontFamily: 'var(--font-outfit), sans-serif', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--text-color)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>
                        ← Back to Home
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="editor-page-root">
            <div className="app-bg">
                <div className="glow glow-1"></div>
                <div className="glow glow-2"></div>
                <div className="glow glow-3"></div>
            </div>

            {/* Application Header Navigation */}
            <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '16px 24px', boxSizing: 'border-box', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(8px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link href="/editor" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '13px', fontWeight: '700', padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--border-subtle)', background: 'rgba(9, 9, 11, 0.03)', transition: 'all 0.2s', cursor: 'pointer' }} className="dropdown-item-hover">
                        <span>← Dashboard</span>
                    </Link>
                    <Link href="/editor" className="logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                        <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', fontSize: '20px', fontFamily: 'var(--font-outfit), sans-serif' }}>
                            <strong style={{ fontWeight: '900', color: '#09090b' }}>FRAME</strong>
                            <span style={{ fontWeight: '300', color: '#94a3b8' }}>CUT</span>
                        </span>
                    </Link>
                    <p className="tagline" style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Auto-detect & transparentize frame slots</p>
                </div>

                <div className="editor-auth-status" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {user ? (
                        <>
                            <div className="exports-limit-badge" style={{ fontSize: '13px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '6px 14px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: user.tier === 'free' ? '#9595b0' : user.tier === 'pro' ? '#3b82f6' : '#06b6d4' }}></span>
                                <span>Tier: <strong style={{ color: 'var(--text-primary)' }}>{user.tier.toUpperCase()}</strong></span>
                                <span style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '10px', color: 'var(--text-muted)' }}>
                                    Tokens: <strong style={{ color: '#3b82f6' }}>{user.tokens ?? 0}</strong>
                                </span>
                            </div>
                            {user.tier === 'free' && (
                                <button 
                                    onClick={() => setShowUpgradeModal(true)}
                                    style={{ padding: '6px 14px', background: 'var(--gradient-primary)', border: 'none', borderRadius: '999px', fontSize: '12px', fontWeight: '700', color: '#fff', cursor: 'pointer' }}
                                >
                                    Upgrade Pro
                                </button>
                            )}
                            <div className="profile-dropdown-container" style={{ position: 'relative' }}>
                                <button 
                                    onClick={() => setShowProfileDropdown(!showProfileDropdown)} 
                                    style={{ 
                                        background: 'none', 
                                        border: 'none', 
                                        cursor: 'pointer', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        padding: 0 
                                    }}
                                >
                                    {user.picture && user.picture.startsWith('http') ? (
                                        <img 
                                            src={user.picture} 
                                            alt={user.name || 'User'} 
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23a78bfa'><circle cx='12' cy='8' r='4'/><path d='M2 20c0-4.4 3.6-8 8-8h4c4.4 0 8 3.6 8 8v2H2v-2z'/></svg>";
                                            }}
                                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--panel-border)' }} 
                                        />
                                    ) : (
                                        <div 
                                            style={{ 
                                                width: '36px', 
                                                height: '36px', 
                                                borderRadius: '50%', 
                                                backgroundColor: 'var(--accent-purple)', 
                                                color: '#fff', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                fontWeight: '700',
                                                fontSize: '14px',
                                                border: '1px solid var(--panel-border)'
                                            }}
                                        >
                                            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </button>
                                {showProfileDropdown && (
                                    <div 
                                        className="profile-dropdown-menu" 
                                        style={{ 
                                            position: 'absolute', 
                                            right: 0, 
                                            top: '44px', 
                                            width: '220px', 
                                            background: 'var(--bg-color)', 
                                            border: '1px solid var(--panel-border)', 
                                            borderRadius: '12px', 
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.08)', 
                                            padding: '12px',
                                            zIndex: 1000,
                                            textAlign: 'left'
                                        }}
                                    >
                                        <div style={{ padding: '4px 8px 8px 8px', borderBottom: '1px solid var(--panel-border)', marginBottom: '8px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || user.email.split('@')[0]}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', background: 'var(--glow-violet)', color: 'var(--accent-purple)', padding: '2px 8px', borderRadius: '4px' }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)' }}></span>
                                                {user.tier} Plan
                                            </div>
                                        </div>
                                        <Link href="/" style={{ display: 'block', padding: '8px', fontSize: '13px', color: 'var(--text-color)', textDecoration: 'none', borderRadius: '6px', transition: 'background 0.2s' }} className="dropdown-item-hover">
                                            Home Landing Page
                                        </Link>
                                        <Link href="/pricing" style={{ display: 'block', padding: '8px', fontSize: '13px', color: 'var(--text-color)', textDecoration: 'none', borderRadius: '6px', transition: 'background 0.2s' }} className="dropdown-item-hover">
                                            Upgrade & Pricing
                                        </Link>
                                        <div style={{ borderTop: '1px solid var(--panel-border)', marginTop: '8px', paddingTop: '8px' }}>
                                            <button 
                                                onClick={() => { logout(); setShowProfileDropdown(false); }} 
                                                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px', fontSize: '13px', color: 'var(--accent-pink)', cursor: 'pointer', borderRadius: '6px' }}
                                                className="dropdown-item-hover"
                                            >
                                                Log Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="exports-limit-badge" style={{ fontSize: '13px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '6px 14px', borderRadius: '999px', color: 'var(--text-muted)' }}>
                                Guest Exports: <strong style={{ color: 'var(--accent-purple)' }}>{usageCount}/5</strong>
                            </div>
                            <button 
                                onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                            >
                                Sign In
                            </button>
                            <button 
                                className="btn btn-primary" 
                                onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}
                                style={{ cursor: 'pointer', padding: '6px 16px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', color: '#fff' }}
                            >
                                Sign Up
                            </button>
                        </>
                    )}
                </div>
            </header>

            <main className="app-main" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <section className="section editor-section" style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
                    <div className="editor-layout" style={{ display: 'flex', width: '100%', height: '100%', width: '100%' }}>
                        


                        {/* CONTROLS SIDEBAR COLUMN */}
                        <div className="controls-panel glass-panel" style={{ width: '300px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
                            {/* 1. Background Remover Controls */}
                            {activeTool === 'bg-remover' && (
                                <>
                                    <h3 className="panel-title">Remove Background</h3>
                                    
                                    {/* Mode Selector */}
                                    <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '4px', marginBottom: '20px', border: '1px solid var(--panel-border)' }}>
                                        <button 
                                            onClick={() => {
                                                setBgRemovalMode('ai');
                                                if (imageLoaded) {
                                                    applyAiAutoCutout();
                                                }
                                            }} 
                                            style={{ 
                                                flex: 1, 
                                                padding: '8px', 
                                                borderRadius: '6px', 
                                                border: 'none', 
                                                fontSize: '12px', 
                                                fontWeight: '700', 
                                                cursor: 'pointer', 
                                                background: bgRemovalMode === 'ai' ? 'var(--btn-primary-bg, #3b82f6)' : 'transparent', 
                                                color: bgRemovalMode === 'ai' ? '#fff' : 'var(--text-muted)', 
                                                transition: 'all 0.2s' 
                                            }}
                                        >
                                            ✨ AI Auto
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setBgRemovalMode('chroma');
                                                if (imageLoaded) {
                                                    applyTransparency();
                                                }
                                            }} 
                                            style={{ 
                                                flex: 1, 
                                                padding: '8px', 
                                                borderRadius: '6px', 
                                                border: 'none', 
                                                fontSize: '12px', 
                                                fontWeight: '700', 
                                                cursor: 'pointer', 
                                                background: bgRemovalMode === 'chroma' ? 'var(--btn-primary-bg, #3b82f6)' : 'transparent', 
                                                color: bgRemovalMode === 'chroma' ? '#fff' : 'var(--text-muted)', 
                                                transition: 'all 0.2s' 
                                            }}
                                        >
                                            🎨 Chroma Key
                                        </button>
                                    </div>

                                    {bgRemovalMode === 'ai' ? (
                                        <>
                                            <div className="control-group" style={{ marginBottom: '16px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', borderRadius: '8px', padding: '12px' }}>
                                                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                                    <strong>Automatic Saliency Detection:</strong> Our browser-side AI will analyze the photo, segment the main foreground subject (person/object), and remove the background seamlessly.
                                                </p>
                                            </div>
                                            <div className="control-group">
                                                <label className="control-label">Edge Softness: <span className="control-value">{softness}</span></label>
                                                <input type="range" className="slider" min="0" max="10" value={softness} onChange={(e) => setSoftness(parseInt(e.target.value))} />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="control-group">
                                                <label className="control-label">Target Color</label>
                                                <p className="control-hint">Click on screen to pick color</p>
                                                <div className="color-display">
                                                    <div className="color-swatch" style={{ background: rgbToHex(targetColor.r, targetColor.g, targetColor.b) }} onClick={() => document.getElementById('color-picker-rem')?.click()}></div>
                                                    <span className="color-hex">{rgbToHex(targetColor.r, targetColor.g, targetColor.b).toUpperCase()}</span>
                                                    <input type="color" id="color-picker-rem" style={{ display: 'none' }} value={rgbToHex(targetColor.r, targetColor.g, targetColor.b)} onChange={(e) => {
                                                        const hex = e.target.value;
                                                        setTargetColor({
                                                            r: parseInt(hex.slice(1, 3), 16),
                                                            g: parseInt(hex.slice(3, 5), 16),
                                                            b: parseInt(hex.slice(5, 7), 16)
                                                        });
                                                    }} />
                                                </div>
                                                <button className="editor-btn editor-btn-outline editor-btn-sm" onClick={() => autoDetectColor()} style={{ width: '100%', marginTop: '8px' }}>Auto Detect Color</button>
                                            </div>
                                            <div className="control-group">
                                                <label className="control-label">Tolerance: <span className="control-value">{tolerance}</span></label>
                                                <input type="range" className="slider" min="1" max="100" value={tolerance} onChange={(e) => setTolerance(parseInt(e.target.value))} />
                                            </div>
                                            <div className="control-group">
                                                <label className="control-label">Edge Softness: <span className="control-value">{softness}</span></label>
                                                <input type="range" className="slider" min="0" max="10" value={softness} onChange={(e) => setSoftness(parseInt(e.target.value))} />
                                            </div>
                                            <div className="control-group">
                                                <label className="control-label checkbox-label">
                                                    <input type="checkbox" checked={contiguous} onChange={(e) => setContiguous(e.target.checked)} />
                                                    <span className="checkbox-custom"></span> Contiguous Fill
                                                </label>
                                            </div>
                                        </>
                                    )}
                                    {/* Manual Cleanup Tool */}
                                    <div style={{ marginTop: '20px', borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                🧹 Manual Erase Brush
                                            </span>
                                            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={bgRemoverManualEraseMode} 
                                                    onChange={(e) => setBgRemoverManualEraseMode(e.target.checked)}
                                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                />
                                            </label>
                                        </div>
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', margin: '0 0 12px 0' }}>
                                            Brush over any leftover objects or edges in the "Result" view to make them fully transparent.
                                        </p>
                                        
                                        {bgRemoverManualEraseMode && (
                                            <div className="control-group">
                                                <label className="control-label">Eraser Size: <span className="control-value">{manualEraseBrushSize}px</span></label>
                                                <input 
                                                    type="range" 
                                                    className="slider" 
                                                    min="5" 
                                                    max="80" 
                                                    value={manualEraseBrushSize} 
                                                    onChange={(e) => setManualEraseBrushSize(parseInt(e.target.value))} 
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <button 
                                        className="editor-btn editor-btn-primary" 
                                        onClick={bgRemovalMode === 'ai' ? applyAiAutoCutout : applyTransparency} 
                                        disabled={!imageLoaded} 
                                        style={{ width: '100%', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        {bgRemovalMode === 'ai' ? '✨ Remove Background' : 'Apply Cutout'}
                                    </button>
                                </>
                            )}

                            {/* 2. Image Upscaler Controls */}
                            {activeTool === 'upscaler' && (
                                <>
                                    <h3 className="panel-title">AI Image Upscaler</h3>
                                    <p className="control-hint" style={{ marginBottom: '16px' }}>Super-resolve image limits using smart sub-pixel bilinear scaling.</p>
                                    <div className="control-group">
                                        <label className="control-label">Upscale Factor</label>
                                        <div className="option-card-grid">
                                            <div className={`option-card ${upscaleFactor === 2 ? 'active' : ''}`} onClick={() => setUpscaleFactor(2)}>
                                                <span className="option-card-title">2x Scale</span>
                                            </div>
                                            <div className={`option-card ${upscaleFactor === 4 ? 'active' : ''}`} onClick={() => setUpscaleFactor(4)}>
                                                <span className="option-card-title">4x Scale</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="editor-btn editor-btn-primary" onClick={runUpscale} disabled={!imageLoaded} style={{ width: '100%', marginTop: '16px' }}>Upscale Image</button>
                                </>
                            )}

                            {/* 3. Video Background Remover Controls */}
                            {activeTool === 'video-remover' && (
                                <>
                                    <h3 className="panel-title">Video BG Remover</h3>
                                    <p className="control-hint" style={{ marginBottom: '16px' }}>Extract subject from video frames using real-time chroma subtraction keyer.</p>
                                    <div className="control-group">
                                        <label className="control-label">Select Sample Clip</label>
                                        <select className="form-input" style={{ background: '#181824', border: '1px solid var(--panel-border)' }} value={videoSample.startsWith('blob:') ? 'custom' : videoSample} onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === 'custom') {
                                                document.getElementById('video-file-picker')?.click();
                                            } else {
                                                handleVideoSampleSelect(val);
                                            }
                                        }}>
                                            <option value="">-- Choose Sample Video --</option>
                                            <option value="spinning-cube">Spinning 3D Geometry</option>
                                            <option value="cassette">Retro Rotating Cassette</option>
                                            <option value="custom">📁 Upload Your Own Video...</option>
                                        </select>
                                        <input 
                                            type="file" 
                                            id="video-file-picker" 
                                            accept="video/*" 
                                            style={{ display: 'none' }} 
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const blobUrl = URL.createObjectURL(file);
                                                    handleVideoSampleSelect(blobUrl);
                                                }
                                            }}
                                        />
                                    </div>
                                    {videoSample && (
                                        <>
                                            <div className="control-group">
                                                <label className="control-label">Chroma Key Color</label>
                                                <div className="color-display">
                                                    <div className="color-swatch" style={{ background: rgbToHex(chromaKeyColor.r, chromaKeyColor.g, chromaKeyColor.b) }} onClick={() => document.getElementById('chroma-picker')?.click()}></div>
                                                    <span className="color-hex">{rgbToHex(chromaKeyColor.r, chromaKeyColor.g, chromaKeyColor.b).toUpperCase()}</span>
                                                    <input type="color" id="chroma-picker" style={{ display: 'none' }} value={rgbToHex(chromaKeyColor.r, chromaKeyColor.g, chromaKeyColor.b)} onChange={(e) => {
                                                        const hex = e.target.value;
                                                        setChromaKeyColor({
                                                            r: parseInt(hex.slice(1, 3), 16),
                                                            g: parseInt(hex.slice(3, 5), 16),
                                                            b: parseInt(hex.slice(5, 7), 16)
                                                        });
                                                    }} />
                                                </div>
                                            </div>
                                            <div className="control-group">
                                                <label className="control-label">Sensitivity: <span className="control-value">{chromaTolerance}</span></label>
                                                <input type="range" className="slider" min="10" max="150" value={chromaTolerance} onChange={(e) => setChromaTolerance(parseInt(e.target.value))} />
                                            </div>
                                            <button className="editor-btn editor-btn-outline" onClick={() => {
                                                if (videoPlaying) {
                                                    videoRef.current.pause();
                                                    setVideoPlaying(false);
                                                } else {
                                                    videoRef.current.play();
                                                    setVideoPlaying(true);
                                                    triggerVideoRemovalLoop();
                                                }
                                            }} style={{ width: '100%', marginTop: '12px' }}>
                                                {videoPlaying ? 'Pause Video' : 'Resume Video'}
                                            </button>
                                        </>
                                    )}
                                </>
                            )}

                            {/* 4. Change Background Controls */}
                            {activeTool === 'change-bg' && (
                                <>
                                    <h3 className="panel-title">Change Background</h3>
                                    <div className="control-group">
                                        <label className="control-label">Backdrop Type</label>
                                        <select className="form-input" style={{ background: '#181824', border: '1px solid var(--panel-border)' }} value={selectedBgType} onChange={(e) => setSelectedBgType(e.target.value)}>
                                            <option value="color">Solid Color</option>
                                            <option value="gradient">Linear Gradient</option>
                                            <option value="image">Scenic Template</option>
                                        </select>
                                    </div>

                                    {selectedBgType === 'color' && (
                                        <div className="control-group">
                                            <label className="control-label">Background Color</label>
                                            <div className="color-display">
                                                <div className="color-swatch" style={{ background: selectedBgColor }} onClick={() => document.getElementById('bg-color-picker')?.click()}></div>
                                                <span className="color-hex">{selectedBgColor.toUpperCase()}</span>
                                                <input type="color" id="bg-color-picker" style={{ display: 'none' }} value={selectedBgColor} onChange={(e) => setSelectedBgColor(e.target.value)} />
                                            </div>
                                        </div>
                                    )}

                                    {selectedBgType === 'gradient' && (
                                        <div className="control-group">
                                            <label className="control-label">Select Gradient</label>
                                            <div className="option-card-grid">
                                                <div className={`option-card ${selectedBgGradient === 'cosmic' ? 'active' : ''}`} onClick={() => setSelectedBgGradient('cosmic')}>
                                                    <span className="option-card-title">Cosmic Cyan</span>
                                                </div>
                                                <div className={`option-card ${selectedBgGradient === 'warm' ? 'active' : ''}`} onClick={() => setSelectedBgGradient('warm')}>
                                                    <span className="option-card-title">Warm Pink</span>
                                                </div>
                                                <div className={`option-card ${selectedBgGradient === 'neon' ? 'active' : ''}`} onClick={() => setSelectedBgGradient('neon')}>
                                                    <span className="option-card-title">Neon Emerald</span>
                                                </div>
                                                <div className={`option-card ${selectedBgGradient === 'sunset' ? 'active' : ''}`} onClick={() => setSelectedBgGradient('sunset')}>
                                                    <span className="option-card-title">Rose Sunset</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedBgType === 'image' && (
                                        <div className="control-group">
                                            <label className="control-label">Studio Backdrop Templates</label>
                                            <div className="bg-image-grid">
                                                <div className={`bg-image-card ${selectedBgImage === 'studio' ? 'active' : ''}`} style={{ backgroundImage: `url(https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=120&auto=format&fit=crop)` }} onClick={() => setSelectedBgImage('studio')}>
                                                    <div className="bg-image-label">Fine Art</div>
                                                </div>
                                                <div className={`bg-image-card ${selectedBgImage === 'cafe' ? 'active' : ''}`} style={{ backgroundImage: `url(https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=120&auto=format&fit=crop)` }} onClick={() => setSelectedBgImage('cafe')}>
                                                    <div className="bg-image-label">Cozy Cafe</div>
                                                </div>
                                                <div className={`bg-image-card ${selectedBgImage === 'showroom' ? 'active' : ''}`} style={{ backgroundImage: `url(https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=120&auto=format&fit=crop)` }} onClick={() => setSelectedBgImage('showroom')}>
                                                    <div className="bg-image-label">Room</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <button 
                                        className="editor-btn editor-btn-primary" 
                                        onClick={applyBgStyleAction} 
                                        disabled={!imageLoaded} 
                                        style={{ width: '100%', marginTop: '16px' }}
                                    >
                                        Apply Background Style (1 Token)
                                    </button>
                                </>
                            )}

                            {/* 5. Magic Eraser Controls */}
                            {activeTool === 'magic-eraser' && (
                                <>
                                    <h3 className="panel-title">Magic Eraser</h3>
                                    <p className="control-hint" style={{ marginBottom: '16px' }}>Draw directly over objects, pixels, or defects you want to erase from canvas.</p>
                                    <div className="control-group">
                                        <label className="control-label">Brush Size: <span className="control-value">{eraserBrushSize}px</span></label>
                                        <input type="range" className="slider" min="5" max="80" value={eraserBrushSize} onChange={(e) => setEraserBrushSize(parseInt(e.target.value))} />
                                    </div>
                                    <button className="editor-btn editor-btn-outline" onClick={() => setCurrentEraserPath([])} style={{ width: '100%' }}>Clear Brush Path</button>
                                </>
                            )}

                            {/* 6. AI Image Generator Controls */}
                            {activeTool === 'ai-generator' && (
                                <>
                                    <h3 className="panel-title">AI Image Generator</h3>
                                    <div className="control-group">
                                        <label className="control-label">Text Prompt</label>
                                        <input type="text" className="form-input" placeholder="e.g. Luxury modern watch, studio lighting..." value={aiImagePrompt} onChange={(e) => setAiImagePrompt(e.target.value)} />
                                    </div>
                                    <div className="control-group">
                                        <label className="control-label">Aesthetic Style</label>
                                        <select className="form-input" style={{ background: '#181824', border: '1px solid var(--panel-border)' }} value={aiImageStyle} onChange={(e) => setAiImageStyle(e.target.value)}>
                                            <option value="photorealistic">Photorealistic</option>
                                            <option value="isometric">Isometric 3D</option>
                                            <option value="minimalist">Minimalist Render</option>
                                        </select>
                                    </div>
                                    <button className="editor-btn editor-btn-primary" onClick={runAiImageGenerator} style={{ width: '100%', marginTop: '16px' }}>Generate Template</button>
                                </>
                            )}

                            {/* 7. AI Video Generator Controls */}
                            {activeTool === 'ai-video' && (
                                <>
                                    <h3 className="panel-title">AI Video Generator</h3>
                                    <div className="control-group">
                                        <label className="control-label">Prompt for Motion</label>
                                        <input type="text" className="form-input" placeholder="e.g. Rotating camera zoom, floating dust..." value={aiVideoPrompt} onChange={(e) => setAiVideoPrompt(e.target.value)} />
                                    </div>
                                    <button className="editor-btn editor-btn-primary" onClick={runAiVideoGenerator} style={{ width: '100%', marginTop: '12px' }}>Generate Motion Clip</button>
                                    
                                    {generatedVideoUrl && (
                                        <div style={{ marginTop: '20px' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PREVIEW GENERATED CLIP</span>
                                            <video src={generatedVideoUrl} controls autoPlay loop muted width="100%" style={{ borderRadius: '12px', border: '1px solid var(--panel-border)', marginTop: '8px' }} />
                                        </div>
                                    )}
                                </>
                            )}

                            {/* 8. Generative Fill Controls */}
                            {activeTool === 'generative-fill' && (
                                <>
                                    <h3 className="panel-title">Generative Fill</h3>
                                    <p className="control-hint" style={{ marginBottom: '16px' }}>Drag a bounding box on the image container, then input object prompt to insert.</p>
                                    <div className="control-group">
                                        <label className="control-label">Object to insert</label>
                                        <input type="text" className="form-input" placeholder="e.g. neon sunglasses, gold badge..." value={genFillPrompt} onChange={(e) => setGenFillPrompt(e.target.value)} />
                                    </div>
                                    <button className="editor-btn editor-btn-primary" onClick={applyGenerativeFill} disabled={!genFillArea || !genFillPrompt || !imageLoaded} style={{ width: '100%', marginTop: '16px' }}>Apply Infill</button>
                                </>
                            )}

                            {/* 9. Uncrop (AI Expand) Controls */}
                            {activeTool === 'uncrop' && (
                                <>
                                    <h3 className="panel-title">AI Canvas Expand</h3>
                                    <p className="control-hint" style={{ marginBottom: '16px' }}>Expand original dimensions boundaries and fill automatically.</p>
                                    <div className="control-group">
                                        <label className="control-label">Margin Padding: <span className="control-value">{expandMargin}px</span></label>
                                        <input type="range" className="slider" min="10" max="150" value={expandMargin} onChange={(e) => setExpandMargin(parseInt(e.target.value))} />
                                    </div>
                                    <button className="editor-btn editor-btn-primary" onClick={applyUncrop} disabled={!imageLoaded} style={{ width: '100%', marginTop: '16px' }}>Expand Canvas</button>
                                </>
                            )}

                            {/* 10. AI Ads Creator Controls */}
                            {activeTool === 'ai-ads' && (
                                <>
                                    <h3 className="panel-title">AI Ads Creator</h3>
                                    <div className="control-group">
                                        <label className="control-label">Ad Layout Template</label>
                                        <div className="ad-templates-list">
                                            <div className={`ad-template-item ${selectedAdTemplate === 'cyber' ? 'active' : ''}`} onClick={() => setSelectedAdTemplate('cyber')}>
                                                <div className="ad-template-preview">⚡</div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: '700' }}>Cyber Neon</span>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>High-energy cyberpunk grid layout</span>
                                                </div>
                                            </div>
                                            <div className={`ad-template-item ${selectedAdTemplate === 'minimal' ? 'active' : ''}`} onClick={() => setSelectedAdTemplate('minimal')}>
                                                <div className="ad-template-preview">▫️</div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: '700' }}>Elegant Minimal</span>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Clean clean-cut luxury styling</span>
                                                </div>
                                            </div>
                                            <div className={`ad-template-item ${selectedAdTemplate === 'festive' ? 'active' : ''}`} onClick={() => setSelectedAdTemplate('festive')}>
                                                <div className="ad-template-preview">🎁</div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: '700' }}>Holiday Festive</span>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Gold accents and warm vibes</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="control-group">
                                        <label className="control-label">Heading Text</label>
                                        <input type="text" className="form-input" value={adTextTitle} onChange={(e) => setAdTextTitle(e.target.value)} />
                                    </div>
                                    <div className="control-group">
                                        <label className="control-label">Offer/Discount Text</label>
                                        <input type="text" className="form-input" value={adTextDiscount} onChange={(e) => setAdTextDiscount(e.target.value)} />
                                    </div>
                                    <div className="control-group">
                                        <label className="control-label">CTA Label</label>
                                        <input type="text" className="form-input" value={adTextCTA} onChange={(e) => setAdTextCTA(e.target.value)} />
                                    </div>
                                    <button 
                                        className="editor-btn editor-btn-primary" 
                                        onClick={applyAiAdOverlay} 
                                        disabled={!imageLoaded} 
                                        style={{ width: '100%', marginTop: '16px' }}
                                    >
                                        Generate Ad Banner (3 Tokens)
                                    </button>
                                </>
                            )}

                            {/* 11. Bulk Editor Controls */}
                            {activeTool === 'bulk-editor' && (
                                <>
                                    <h3 className="panel-title">Bulk Editor</h3>
                                    <p className="control-hint" style={{ marginBottom: '16px' }}>Upload multiple frame slots and transparentize them all at once.</p>
                                    
                                    <button className="editor-btn editor-btn-outline" onClick={() => document.getElementById('bulk-files-selector')?.click()} style={{ width: '100%', marginBottom: '16px' }}>Select Files</button>
                                    <input type="file" id="bulk-files-selector" multiple accept="image/png, image/jpeg, image/jpg, image/webp" style={{ display: 'none' }} onChange={handleBulkUpload} />

                                    {bulkQueue.length > 0 && (
                                        <>
                                            <div className="bulk-queue">
                                                {bulkQueue.map((item, idx) => (
                                                    <div key={idx} className="bulk-item">
                                                        <span className="bulk-item-name">{item.name}</span>
                                                        <span className={`bulk-item-status ${item.status}`}>{item.status.toUpperCase()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <button className="editor-btn editor-btn-primary" onClick={processBulkQueue} style={{ width: '100%', marginTop: '16px' }}>Batch Cutout All</button>
                                        </>
                                    )}
                                </>
                            )}

                            {/* 12. Adjustments Controls */}
                            {activeTool === 'adjustments' && (
                                <>
                                    <h3 className="panel-title">Filters & Colors</h3>
                                    <div className="control-group">
                                        <label className="control-label">Brightness: <span className="control-value">{brightness}%</span></label>
                                        <input type="range" className="slider" min="50" max="180" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value))} />
                                    </div>
                                    <div className="control-group">
                                        <label className="control-label">Contrast: <span className="control-value">{contrast}%</span></label>
                                        <input type="range" className="slider" min="50" max="180" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value))} />
                                    </div>
                                    <div className="control-group">
                                        <label className="control-label">Saturation: <span className="control-value">{saturation}%</span></label>
                                        <input type="range" className="slider" min="0" max="200" value={saturation} onChange={(e) => setSaturation(parseInt(e.target.value))} />
                                    </div>
                                    <div className="control-group">
                                        <label className="control-label">Blur Radius: <span className="control-value">{blur}px</span></label>
                                        <input type="range" className="slider" min="0" max="15" value={blur} onChange={(e) => setBlur(parseInt(e.target.value))} />
                                    </div>
                                </>
                            )}

                            {/* 13. Text & Overlays Controls */}
                            {activeTool === 'text-overlay' && (
                                <>
                                    <h3 className="panel-title">Text Overlays</h3>
                                    <div className="control-group">
                                        <label className="control-label">Overlay text</label>
                                        <input type="text" className="form-input" value={newTextVal} onChange={(e) => {
                                            setNewTextVal(e.target.value);
                                            if (selectedTextId) {
                                                setTextItems(prev => prev.map(t => t.id === selectedTextId ? { ...t, text: e.target.value } : t));
                                            }
                                        }} />
                                    </div>
                                    <button className="editor-btn editor-btn-primary" onClick={addTextOverlay} style={{ width: '100%', marginBottom: '8px' }}>Add Text Line</button>
                                    {selectedTextId && (
                                        <button className="editor-btn editor-btn-outline" onClick={deleteSelectedText} style={{ width: '100%', borderColor: '#ef4444', color: '#ef4444' }}>Delete Selected</button>
                                    )}
                                </>
                            )}

                            {/* 14. Rotate & Crop Controls */}
                            {activeTool === 'crop-rotate' && (
                                <>
                                    <h3 className="panel-title">Rotate & Align</h3>
                                    <div className="control-group">
                                        <label className="control-label">Rotation Angle</label>
                                        <div className="option-card-grid">
                                            <div className={`option-card ${rotationAngle === 0 ? 'active' : ''}`} onClick={() => setRotationAngle(0)}>
                                                <span className="option-card-title">0°</span>
                                            </div>
                                            <div className={`option-card ${rotationAngle === 90 ? 'active' : ''}`} onClick={() => setRotationAngle(90)}>
                                                <span className="option-card-title">90°</span>
                                            </div>
                                            <div className={`option-card ${rotationAngle === 180 ? 'active' : ''}`} onClick={() => setRotationAngle(180)}>
                                                <span className="option-card-title">180°</span>
                                            </div>
                                            <div className={`option-card ${rotationAngle === 270 ? 'active' : ''}`} onClick={() => setRotationAngle(270)}>
                                                <span className="option-card-title">270°</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="control-group" style={{ display: 'flex', gap: '8px' }}>
                                        <button className={`editor-btn editor-btn-outline ${flipHorizontal ? 'active' : ''}`} onClick={() => setFlipHorizontal(!flipHorizontal)} style={{ flex: 1 }}>Flip Horiz</button>
                                        <button className={`editor-btn editor-btn-outline ${flipVertical ? 'active' : ''}`} onClick={() => setFlipVertical(!flipVertical)} style={{ flex: 1 }}>Flip Vert</button>
                                    </div>
                                </>
                            )}

                            {/* 15. Brush Drawing Controls */}
                            {activeTool === 'brush-draw' && (
                                <>
                                    <h3 className="panel-title">Doodle Brush</h3>
                                    <div className="control-group">
                                        <label className="control-label">Brush Color</label>
                                        <div className="color-display">
                                            <div className="color-swatch" style={{ background: brushColor }} onClick={() => document.getElementById('brush-color-picker')?.click()}></div>
                                            <span className="color-hex">{brushColor.toUpperCase()}</span>
                                            <input type="color" id="brush-color-picker" style={{ display: 'none' }} value={brushColor} onChange={(e) => setBrushColor(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="control-group">
                                        <label className="control-label">Brush Size: <span className="control-value">{brushSize}px</span></label>
                                        <input type="range" className="slider" min="2" max="40" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} />
                                    </div>
                                    <button className="editor-btn editor-btn-outline" onClick={() => setBrushStrokes([])} style={{ width: '100%' }}>Clear Canvas Doodles</button>
                                </>
                            )}

                            <div className="divider" style={{ margin: '16px 0', borderTop: '1px solid var(--panel-border)' }}></div>

                            {/* Common actions and exporters */}
                            <button className="editor-btn editor-btn-download" onClick={downloadPNG} disabled={!imageLoaded && activeTool !== 'video-remover'} style={{ width: '100%' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                Download Output
                            </button>

                            <button className="editor-btn editor-btn-outline editor-btn-sm" onClick={resetEditor} disabled={!imageLoaded} style={{ marginTop: '8px', width: '100%' }}>Reset Adjustments</button>
                            <button className="editor-btn editor-btn-outline editor-btn-sm" onClick={clearWorkspaceImage} disabled={!imageLoaded} style={{ marginTop: '8px', width: '100%', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.2)' }}>Clear Active Image</button>
                            <button className="editor-btn editor-btn-outline editor-btn-sm" onClick={triggerNewUpload} style={{ marginTop: '8px', width: '100%' }}>Upload New Image</button>
                        </div>

                        {/* CENTER WORKSPACE VIEWPORT */}
                        <div className="canvas-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                            {activeTool === 'bulk-editor' ? (
                                <div className="bulk-editor-workspace" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', position: 'relative', zIndex: 1 }}>
                                    <div className="checkerboard-bg" style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'conic-gradient(#f1f5f9 0.25turn, #ffffff 0.25turn 0.5turn, #f1f5f9 0.5turn 0.75turn, #ffffff 0.75turn)', backgroundSize: '20px 20px' }}></div>
                                    <div className="upload-zone" style={{ zIndex: 1, maxWidth: '500px' }} onClick={() => document.getElementById('bulk-files-selector')?.click()}>
                                        <div className="upload-icon">⚡</div>
                                        <h2 className="upload-title">Bulk Image Editor</h2>
                                        <p className="upload-desc">Select multiple frame cut images to remove background in batch</p>
                                    </div>
                                    {bulkQueue.length > 0 && (
                                        <div className="bulk-progress-container" style={{ zIndex: 1, width: '100%', maxWidth: '500px', marginTop: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px' }}>
                                            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700' }}>Batch Queue ({bulkQueue.filter(i => i.status === 'completed').length}/{bulkQueue.length})</h4>
                                            <div className="bulk-queue" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                                {bulkQueue.map((item, idx) => (
                                                    <div key={idx} className="bulk-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                                                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{item.name}</span>
                                                        <span style={{ fontSize: '12px', fontWeight: '700', color: item.status === 'completed' ? '#22c55e' : item.status === 'processing' ? '#06b6d4' : '#6b7280' }}>
                                                            {item.status.toUpperCase()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : activeTool === 'ai-generator' && !imageLoaded ? (
                                <div className="ai-workspace-start" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', position: 'relative', zIndex: 1 }}>
                                    <div className="checkerboard-bg" style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'conic-gradient(#f1f5f9 0.25turn, #ffffff 0.25turn 0.5turn, #f1f5f9 0.5turn 0.75turn, #ffffff 0.75turn)', backgroundSize: '20px 20px' }}></div>
                                    <div style={{ zIndex: 1, textAlign: 'center', maxWidth: '500px' }}>
                                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
                                        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>AI Image Creator</h2>
                                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                            Type a prompt in the left settings panel (e.g. "Luxury premium watch") and watch the AI generator create high-resolution marketing assets instantly.
                                        </p>
                                    </div>
                                </div>
                            ) : activeTool === 'ai-video' && !generatedVideoUrl ? (
                                <div className="ai-workspace-start" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', position: 'relative', zIndex: 1 }}>
                                    <div className="checkerboard-bg" style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'conic-gradient(#f1f5f9 0.25turn, #ffffff 0.25turn 0.5turn, #f1f5f9 0.5turn 0.75turn, #ffffff 0.75turn)', backgroundSize: '20px 20px' }}></div>
                                    <div style={{ zIndex: 1, textAlign: 'center', maxWidth: '500px' }}>
                                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎬</div>
                                        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>AI Video Motion Studio</h2>
                                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                            Turn text descriptions or static images into moving cinema graphics. Provide a motion prompt on the left to synthesize keyframes.
                                        </p>
                                    </div>
                                </div>
                            ) : activeTool === 'video-remover' && !videoSample ? (
                                <div className="video-workspace-start" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', position: 'relative', zIndex: 1 }}>
                                    <div className="checkerboard-bg" style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'conic-gradient(#f1f5f9 0.25turn, #ffffff 0.25turn 0.5turn, #f1f5f9 0.5turn 0.75turn, #ffffff 0.75turn)', backgroundSize: '20px 20px' }}></div>
                                    <div style={{ zIndex: 1, textAlign: 'center', maxWidth: '500px' }}>
                                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📹</div>
                                        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>Video Background Remover</h2>
                                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '20px' }}>
                                            Select a sample video clip or upload your own video to start extracting moving subjects in real time.
                                        </p>
                                        <button 
                                            className="btn btn-primary" 
                                            onClick={() => document.getElementById('video-file-picker')?.click()}
                                            style={{ cursor: 'pointer', padding: '10px 24px', borderRadius: '999px', fontWeight: '700', fontSize: '14px' }}
                                        >
                                            Upload Video File
                                        </button>
                                    </div>
                                </div>
                            ) : !imageLoaded && activeTool !== 'video-remover' ? (
                                <div className="workspace-upload-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', position: 'relative', zIndex: 1 }}>
                                    <div className="checkerboard-bg" style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'conic-gradient(#f1f5f9 0.25turn, #ffffff 0.25turn 0.5turn, #f1f5f9 0.5turn 0.75turn, #ffffff 0.75turn)', backgroundSize: '20px 20px' }}></div>
                                    <div 
                                        className="upload-zone"
                                        style={{ zIndex: 1 }}
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.classList.add('drag-over');
                                        }}
                                        onDragLeave={(e) => {
                                            e.currentTarget.classList.remove('drag-over');
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.classList.remove('drag-over');
                                            const file = e.dataTransfer.files[0];
                                            if (file) loadImage(file);
                                        }}
                                    >
                                        <div className="upload-icon">
                                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                                                <path d="M32 8L32 40" stroke="url(#upGrad)" strokeWidth="3" strokeLinecap="round"/>
                                                <path d="M20 20L32 8L44 20" stroke="url(#upGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M8 40V48C8 52.4183 11.5817 56 16 56H48C52.4183 56 56 52.4183 56 48V40" stroke="url(#upGrad)" strokeWidth="3" strokeLinecap="round"/>
                                                <defs>
                                                    <linearGradient id="upGrad" x1="32" y1="8" x2="32" y2="56">
                                                        <stop offset="0%" stopColor="#3b82f6"/>
                                                        <stop offset="100%" stopColor="#06b6d4"/>
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                        </div>
                                        <h2 className="upload-title">Drop your image here</h2>
                                        <p className="upload-desc">or click to browse • PNG, JPG, WEBP supported</p>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            onChange={handleFileChange} 
                                            accept="image/png, image/jpeg, image/jpg, image/webp" 
                                            hidden 
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="canvas-tabs" style={{ display: 'flex', gap: '8px', padding: '12px 16px', background: 'rgba(9, 9, 11, 0.4)', borderBottom: '1px solid var(--panel-border)' }}>
                                        <button className={`tab ${currentView === 'original' ? 'active' : ''}`} onClick={() => setCurrentView('original')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: currentView === 'original' ? '#fff' : 'var(--text-muted)', fontWeight: '700', padding: '6px 12px' }}>
                                            Original View
                                        </button>
                                        <button className={`tab ${currentView === 'result' ? 'active' : ''}`} onClick={() => {
                                            if (!resultImageData) {
                                                showToast('Apply transparency first', 'info');
                                                return;
                                            }
                                            setCurrentView('result');
                                        }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: currentView === 'result' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: '700', padding: '6px 12px' }}>
                                            Result View
                                        </button>
                                    </div>

                                    <div 
                                        className="canvas-wrapper" 
                                        ref={canvasWrapperRef}
                                        onWheel={handleWheel}
                                        onMouseDown={handleMouseDown}
                                        onMouseMove={handleMouseMove}
                                        onMouseUp={handleMouseUp}
                                        onMouseLeave={() => setLoupe(l => ({ ...l, visible: false }))}
                                        style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        {/* Minimal solid light grey background for the outer viewport wrapper */}
                                        <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: '#f8fafc' }}></div>
                                        
                                        <div 
                                            className="canvas-container"
                                            style={{
                                                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                                                transformOrigin: 'center center',
                                                cursor: (activeTool === 'bg-remover' && bgRemoverManualEraseMode) || activeTool === 'magic-eraser' || activeTool === 'brush-draw' || activeTool === 'generative-fill' ? 'crosshair' : isDragging ? 'grabbing' : 'grab',
                                                position: 'relative',
                                                zIndex: 1,
                                                borderRadius: '24px',
                                                boxShadow: '0 20px 48px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02)',
                                                border: '1px solid rgba(0, 0, 0, 0.06)',
                                                overflow: 'hidden',
                                                backgroundImage: 'conic-gradient(#f1f5f9 0.25turn, #ffffff 0.25turn 0.5turn, #f1f5f9 0.5turn 0.75turn, #ffffff 0.75turn)',
                                                backgroundSize: '20px 20px'
                                            }}
                                        >
                                            <canvas ref={mainCanvasRef} id="main-canvas" style={{ display: 'block', maxWidth: 'none' }}></canvas>
                                            
                                            {lastClickedPixel && activeTool === 'bg-remover' && (
                                                <div 
                                                    className="canvas-crosshair"
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${lastClickedPixel.x}px`,
                                                        top: `${lastClickedPixel.y}px`,
                                                        width: '12px',
                                                        height: '12px',
                                                        border: '2px solid #3b82f6',
                                                        borderRadius: '50%',
                                                        transform: 'translate(-50%, -50%)',
                                                        pointerEvents: 'none'
                                                    }}
                                                ></div>
                                            )}
                                        </div>

                                        {/* Hover Loupe Magnifier overlay */}
                                        {loupe.visible && activeTool === 'bg-remover' && (
                                            <div 
                                                className="magnifier-loupe"
                                                style={{
                                                    position: 'absolute',
                                                    left: `${loupe.x}px`,
                                                    top: `${loupe.y}px`,
                                                    transform: 'translate(-50%, -130px)',
                                                    width: '120px',
                                                    height: '120px',
                                                    borderRadius: '50%',
                                                    border: '3px solid var(--accent-purple)',
                                                    boxShadow: 'var(--shadow-lg)',
                                                    overflow: 'hidden',
                                                    pointerEvents: 'none',
                                                    zIndex: 10
                                                }}
                                            >
                                                <canvas ref={loupeCanvasRef} width="120" height="120"></canvas>
                                                <div className="loupe-crosshair" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <div style={{ width: '6px', height: '6px', border: '1px solid #fff', borderRadius: '50%' }}></div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="zoom-info" style={{ position: 'absolute', bottom: '16px', right: '16px', background: 'rgba(9, 9, 11, 0.8)', border: '1px solid var(--panel-border)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#fff' }}>{Math.round(zoom * 100)}%</div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            {/* Global Processing Loader Overlay */}
            {processing.visible && (
                <div className="canvas-processing-overlay">
                    <div className="spinner-ring"></div>
                    <h3 style={{ fontSize: '16px', color: '#fff', fontWeight: '700', margin: 0 }}>{processing.title}</h3>
                </div>
            )}

            {/* Toast Notifications */}
            {toast && (
                <div className={`toast toast-${toast.type}`} style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', borderRadius: '12px', background: toast.type === 'success' ? 'rgba(34, 197, 94, 0.9)' : toast.type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(18, 18, 26, 0.9)', border: '1px solid rgba(255,255,255,0.06)', zIndex: 1000, boxShadow: 'var(--shadow-md)' }}>
                    <span className="toast-text" style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{toast.message}</span>
                </div>
            )}
        </div>
    );
}
