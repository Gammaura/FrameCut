'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import '../editor.css';

// ===== HELPER FUNCTIONS =====
function colorDistanceSq(r1, g1, b1, r2, g2, b2) {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return dr * dr + dg * dg + db * db;
}

function colorDistance(r1, g1, b1, r2, g2, b2) {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function findSeedPoints(data, w, h, color, tolerance) {
    const seeds = [];
    const gridSize = Math.max(10, Math.floor(Math.min(w, h) / 20));
    const toleranceSq = tolerance * tolerance;
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
                const checkRadius = 5;
                for (let dy = -checkRadius; dy <= checkRadius; dy += 2) {
                    for (let dx = -checkRadius; dx <= checkRadius; dx += 2) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                            const ni = (ny * w + nx) * 4;
                            const ndSq = colorDistanceSq(
                                data[ni], data[ni + 1], data[ni + 2],
                                color.r, color.g, color.b
                            );
                            if (ndSq <= toleranceSq) solidCount++;
                        }
                    }
                }
                const total = (Math.floor(checkRadius / 2) * 2 + 1) ** 2;
                if (solidCount / total > 0.85) {
                    seeds.push({ x, y });
                }
            }
        }
    }
    return seeds;
}

function floodFillMask(data, w, h, startX, startY, color, tolerance, visited, mask) {
    const startPos = startX + startY * w;
    if (visited[startPos]) return;

    const stack = [startPos];
    visited[startPos] = 1;
    const toleranceSq = tolerance * tolerance;

    while (stack.length > 0) {
        const pos = stack.pop();
        const x = pos % w;
        const y = Math.floor(pos / w);

        const idx = pos * 4;
        const distSq = colorDistanceSq(
            data[idx], data[idx + 1], data[idx + 2],
            color.r, color.g, color.b
        );

        if (distSq <= toleranceSq && data[idx + 3] > 0) {
            mask[pos] = 1;

            const pushNeighbor = (npos) => {
                if (!visited[npos]) {
                    visited[npos] = 1;
                    stack.push(npos);
                }
            };

            if (x > 0) pushNeighbor(pos - 1);
            if (x < w - 1) pushNeighbor(pos + 1);
            if (y > 0) pushNeighbor(pos - w);
            if (y < h - 1) pushNeighbor(pos + w);
            if (x > 0 && y > 0) pushNeighbor(pos - w - 1);
            if (x < w - 1 && y > 0) pushNeighbor(pos - w + 1);
            if (x > 0 && y < h - 1) pushNeighbor(pos + w - 1);
            if (x < w - 1 && y < h - 1) pushNeighbor(pos + w + 1);
        }
    }
}

function dilateMask(mask, w, h, radius, data, color, tolerance) {
    const dilated = new Uint8Array(mask);
    const tightToleranceSq = (tolerance * 1.3) * (tolerance * 1.3);

    for (let pass = 0; pass < radius; pass++) {
        const prevMask = new Uint8Array(dilated);
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const pos = y * w + x;
                if (prevMask[pos]) continue;

                const adjCount =
                    (prevMask[pos - 1] ? 1 : 0) + (prevMask[pos + 1] ? 1 : 0) +
                    (prevMask[pos - w] ? 1 : 0) + (prevMask[pos + w] ? 1 : 0);

                if (adjCount === 0) continue;

                const idx = pos * 4;
                const distSq = colorDistanceSq(
                    data[idx], data[idx + 1], data[idx + 2],
                    color.r, color.g, color.b
                );

                if (distSq <= tightToleranceSq) {
                    dilated[pos] = 2;
                }
            }
        }
    }
    return dilated;
}

function boxBlurMask(mask, w, h, R) {
    const temp = new Float32Array(w * h);
    const blurred = new Float32Array(w * h);

    for (let y = 0; y < h; y++) {
        const rowOffset = y * w;
        let sum = 0;
        for (let x = -R; x <= R; x++) {
            const val = mask[rowOffset + Math.min(Math.max(x, 0), w - 1)];
            sum += val;
        }
        for (let x = 0; x < Math.min(R, w); x++) {
            temp[rowOffset + x] = sum / (2 * R + 1);
            const leaveX = x - R;
            const enterX = x + R + 1;
            const leaveVal = mask[rowOffset + Math.max(leaveX, 0)];
            const enterVal = mask[rowOffset + Math.min(enterX, w - 1)];
            sum += enterVal - leaveVal;
        }
        const endMiddle = w - R - 1;
        for (let x = R; x <= endMiddle; x++) {
            temp[rowOffset + x] = sum / (2 * R + 1);
            const leaveVal = mask[rowOffset + x - R];
            const enterVal = mask[rowOffset + x + R + 1];
            sum += enterVal - leaveVal;
        }
        for (let x = Math.max(R, w - R); x < w; x++) {
            temp[rowOffset + x] = sum / (2 * R + 1);
            const leaveX = x - R;
            const enterX = x + R + 1;
            const leaveVal = mask[rowOffset + Math.max(leaveX, 0)];
            const enterVal = mask[rowOffset + Math.min(enterX, w - 1)];
            sum += enterVal - leaveVal;
        }
    }

    for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let y = -R; y <= R; y++) {
            const val = temp[Math.min(Math.max(y, 0), h - 1) * w + x];
            sum += val;
        }
        for (let y = 0; y < Math.min(R, h); y++) {
            blurred[y * w + x] = sum / (2 * R + 1);
            const leaveY = y - R;
            const enterY = y + R + 1;
            const leaveVal = temp[Math.max(leaveY, 0) * w + x];
            const enterVal = temp[Math.min(enterY, h - 1) * w + x];
            sum += enterVal - leaveVal;
        }
        const endMiddle = h - R - 1;
        for (let y = R; y <= endMiddle; y++) {
            blurred[y * w + x] = sum / (2 * R + 1);
            const leaveVal = temp[(y - R) * w + x];
            const enterVal = temp[(y + R + 1) * w + x];
            sum += enterVal - leaveVal;
        }
        for (let y = Math.max(R, h - R); y < h; y++) {
            blurred[y * w + x] = sum / (2 * R + 1);
            const leaveY = y - R;
            const enterY = y + R + 1;
            const leaveVal = temp[Math.max(leaveY, 0) * w + x];
            const enterVal = temp[Math.min(enterY, h - 1) * w + x];
            sum += enterVal - leaveVal;
        }
    }
    return blurred;
}

function applyCleanMask(pixels, dilatedMask, originalMask, w, h, softness, srcData, color, tolerance) {
    const totalPixels = w * h;

    if (softness > 0) {
        const binaryMask = new Uint8Array(totalPixels);
        for (let i = 0; i < totalPixels; i++) {
            if (dilatedMask[i] >= 1) {
                binaryMask[i] = 1;
            }
        }

        const blurredMask = boxBlurMask(binaryMask, w, h, softness);

        for (let i = 0; i < totalPixels; i++) {
            const px = i * 4;
            const originalAlpha = srcData.data[px + 3];
            pixels[px + 3] = Math.round(originalAlpha * (1.0 - blurredMask[i]));
        }
    } else {
        for (let i = 0; i < totalPixels; i++) {
            const px = i * 4;
            if (dilatedMask[i] >= 1) {
                pixels[px + 3] = 0;
            }
        }
    }

    const cleanToleranceSq = (tolerance * 1.2) * (tolerance * 1.2);
    for (let pass = 0; pass < 2; pass++) {
        let changed = false;
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const pos = y * w + x;
                const px = pos * 4;

                if (pixels[px + 3] === 0) continue;

                let transN = 0;
                if (pixels[(pos - 1) * 4 + 3] === 0) transN++;
                if (pixels[(pos + 1) * 4 + 3] === 0) transN++;
                if (pixels[(pos - w) * 4 + 3] === 0) transN++;
                if (pixels[(pos + w) * 4 + 3] === 0) transN++;

                if (transN < 3) continue;

                const distSq = colorDistanceSq(
                    pixels[px], pixels[px + 1], pixels[px + 2],
                    color.r, color.g, color.b
                );

                if (distSq <= cleanToleranceSq) {
                    pixels[px + 3] = 0;
                    changed = true;
                }
            }
        }
        if (!changed) break;
    }
}

function evaluateRectangularity(data, w, h, colorCandidate, step) {
    const tolerance = 30;
    let minX = w, maxX = 0, minY = h, maxY = 0;
    let pixelCount = 0;

    for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
            const idx = (y * w + x) * 4;
            const dist = colorDistance(
                data[idx], data[idx + 1], data[idx + 2],
                colorCandidate.r, colorCandidate.g, colorCandidate.b
            );
            if (dist <= tolerance) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
                pixelCount++;
            }
        }
    }

    if (pixelCount === 0) return 0;

    const bboxArea = ((maxX - minX) / step + 1) * ((maxY - minY) / step + 1);
    const fillRatio = pixelCount / bboxArea;
    const imageArea = (w / step) * (h / step);
    const coverage = pixelCount / imageArea;

    let coverageScore = 0;
    if (coverage > 0.05 && coverage < 0.7) {
        coverageScore = 1 - Math.abs(coverage - 0.3) * 2;
    }

    return fillRatio * coverageScore * pixelCount;
}

// ===== EDITOR COMPONENT =====
export default function Editor() {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [originalImage, setOriginalImage] = useState(null);
    const [originalImageData, setOriginalImageData] = useState(null);
    const [resultImageData, setResultImageData] = useState(null);
    const [currentView, setCurrentView] = useState('original'); // 'original' | 'result'
    
    // settings
    const [tolerance, setTolerance] = useState(35);
    const [softness, setSoftness] = useState(2);
    const [contiguous, setContiguous] = useState(true);
    const [targetColor, setTargetColor] = useState({ r: 204, g: 0, b: 0 }); // default red
    const [lastClickedPixel, setLastClickedPixel] = useState(null);

    // zoom & pan
    const [zoom, setZoom] = useState(1);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);

    // overlays/interaction states
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const dragInitialPan = useRef({ x: 0, y: 0 });
    const [loupe, setLoupe] = useState({ visible: false, x: 0, y: 0, cx: 0, cy: 0 });

    // processing UI state
    const [processing, setProcessing] = useState({ visible: false, progress: 0 });

    // toast notifications
    const [toast, setToast] = useState(null);

    // refs
    const fileInputRef = useRef(null);
    const mainCanvasRef = useRef(null);
    const loupeCanvasRef = useRef(null);
    const canvasWrapperRef = useRef(null);

    // Toast auto-clear
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }, [toast]);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    // Draw viewport when original/result image data change or view changes
    useEffect(() => {
        if (!originalImageData || !mainCanvasRef.current) return;
        const canvas = mainCanvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (currentView === 'original') {
            ctx.putImageData(originalImageData, 0, 0);
        } else if (currentView === 'result' && resultImageData) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.putImageData(resultImageData, 0, 0);
        }
    }, [currentView, originalImageData, resultImageData]);

    // Handle initial zoom fitting after image loads
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

    // Load file
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) loadImage(file);
    };

    const loadImage = (file) => {
        if (file.type !== 'image/png') {
            showToast('Please upload a PNG file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                setOriginalImage(img);
                
                // Initialize canvas sizes
                const canvas = mainCanvasRef.current;
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                const imgData = ctx.getImageData(0, 0, img.width, img.height);
                setOriginalImageData(imgData);
                setResultImageData(null);
                setCurrentView('original');
                setLastClickedPixel(null);
                setZoom(1);
                setPanX(0);
                setPanY(0);
                setImageLoaded(true);

                showToast('Frame loaded! Click on a color to select, then click Apply', 'info');

                // Delay fit zoom so DOM dimensions update
                setTimeout(() => {
                    fitCanvasToView();
                    // trigger auto-detect
                    autoDetectColor(imgData);
                }, 50);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    // Auto-detect dominant slot color
    const autoDetectColor = (imgData = originalImageData) => {
        if (!imgData) return;

        setProcessing({ visible: true, progress: 10 });

        setTimeout(() => {
            const data = imgData.data;
            const w = imgData.width;
            const h = imgData.height;

            const colorCounts = {};
            const sampleStep = Math.max(1, Math.floor(Math.min(w, h) / 200));

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

            setProcessing({ visible: true, progress: 50 });

            const sorted = Object.values(colorCounts).sort((a, b) => b.count - a.count);

            if (sorted.length === 0) {
                setProcessing({ visible: false, progress: 0 });
                showToast('Could not detect any solid color', 'error');
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

            setProcessing({ visible: true, progress: 90 });
            setTargetColor({
                r: bestCandidate.r,
                g: bestCandidate.g,
                b: bestCandidate.b
            });
            setLastClickedPixel(null);

            setProcessing({ visible: false, progress: 0 });
            showToast(`Detected slot color: ${rgbToHex(bestCandidate.r, bestCandidate.g, bestCandidate.b)}`, 'success');
        }, 100);
    };

    // Main Transparency Processing
    const applyTransparency = () => {
        if (!originalImageData) return;

        setProcessing({ visible: true, progress: 5 });

        setTimeout(() => {
            const srcData = originalImageData;
            const w = srcData.width;
            const h = srcData.height;

            const newImageData = new ImageData(
                new Uint8ClampedArray(srcData.data),
                w, h
            );
            const pixels = newImageData.data;

            if (contiguous) {
                const visited = new Uint8Array(w * h);
                const mask = new Uint8Array(w * h);

                let seeds = [];
                if (lastClickedPixel) {
                    seeds.push(lastClickedPixel);
                }

                const gridSeeds = findSeedPoints(srcData.data, w, h, targetColor, tolerance);
                seeds = seeds.concat(gridSeeds);

                setProcessing({ visible: true, progress: 15 });

                for (const seed of seeds) {
                    floodFillMask(srcData.data, w, h, seed.x, seed.y, targetColor, tolerance, visited, mask);
                }

                setProcessing({ visible: true, progress: 40 });

                const dilateRadius = 2;
                const dilatedMask = dilateMask(mask, w, h, dilateRadius, srcData.data, targetColor, tolerance);
                
                setProcessing({ visible: true, progress: 60 });

                applyCleanMask(pixels, dilatedMask, mask, w, h, softness, srcData.data, targetColor, tolerance);
            } else {
                const toleranceSq = tolerance * tolerance;
                const softnessRange = softness * 3;
                const minTolerance = Math.max(0, tolerance - softnessRange);
                const minToleranceSq = minTolerance * minTolerance;

                for (let i = 0; i < pixels.length; i += 4) {
                    const distSq = colorDistanceSq(
                        pixels[i], pixels[i + 1], pixels[i + 2],
                        targetColor.r, targetColor.g, targetColor.b
                    );

                    if (distSq <= toleranceSq) {
                        if (softness > 0 && distSq > minToleranceSq) {
                            const dist = Math.sqrt(distSq);
                            const t = (dist - minTolerance) / softnessRange;
                            pixels[i + 3] = Math.round(t * t * 255);
                        } else {
                            pixels[i + 3] = 0;
                        }
                    }
                }
            }

            setProcessing({ visible: true, progress: 90 });

            setResultImageData(newImageData);
            setCurrentView('result');
            setProcessing({ visible: false, progress: 0 });
            showToast('Transparency applied! Check the Result tab', 'success');
        }, 100);
    };

    // Zoom buttons
    const zoomIn = () => setZoom(z => Math.min(z * 1.25, 8));
    const zoomOut = () => setZoom(z => Math.max(z / 1.25, 0.05));

    // Mouse wheel zoom
    const handleWheel = (e) => {
        if (!imageLoaded) return;
        e.preventDefault();

        const zoomFactor = 1.1;
        const oldZoom = zoom;
        let newZoom;

        if (e.deltaY < 0) {
            newZoom = Math.min(zoom * zoomFactor, 8);
        } else {
            newZoom = Math.max(zoom / zoomFactor, 0.05);
        }

        const rect = mainCanvasRef.current.getBoundingClientRect();
        const wrapperRect = canvasWrapperRef.current.getBoundingClientRect();

        const cursorX = e.clientX - wrapperRect.left - wrapperRect.width / 2;
        const cursorY = e.clientY - wrapperRect.top - wrapperRect.height / 2;

        setPanX(cursorX - (cursorX - panX) * (newZoom / oldZoom));
        setPanY(cursorY - (cursorY - panY) * (newZoom / oldZoom));
        setZoom(newZoom);
    };

    // Canvas panning and color-picking clicks
    const handleMouseDown = (e) => {
        if (!imageLoaded) return;

        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        dragInitialPan.current = { x: panX, y: panY };
        setLoupe(l => ({ ...l, visible: false }));
    };

    const handleMouseMove = (e) => {
        if (!imageLoaded) return;

        if (isDragging) {
            const dx = e.clientX - dragStart.current.x;
            const dy = e.clientY - dragStart.current.y;
            setPanX(dragInitialPan.current.x + dx);
            setPanY(dragInitialPan.current.y + dy);
        } else {
            updateLoupe(e);
        }
    };

    const handleMouseUp = (e) => {
        if (!isDragging) return;
        setIsDragging(false);

        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        const clickDist = Math.sqrt(dx * dx + dy * dy);

        if (clickDist < 5) {
            // Click to pick color
            const canvas = mainCanvasRef.current;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const x = Math.floor((e.clientX - rect.left) * scaleX);
            const y = Math.floor((e.clientY - rect.top) * scaleY);

            if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
                const idx = (y * canvas.width + x) * 4;
                const r = originalImageData.data[idx];
                const g = originalImageData.data[idx + 1];
                const b = originalImageData.data[idx + 2];

                setTargetColor({ r, g, b });
                setLastClickedPixel({ x, y });
                showToast(`Color selected: ${rgbToHex(r, g, b)}`, 'info');
            }
        }
    };

    // Loupe Magnifier rendering
    const updateLoupe = (e) => {
        if (!originalImageData || !mainCanvasRef.current || !loupeCanvasRef.current) return;
        const canvas = mainCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
            setLoupe(l => ({ ...l, visible: false }));
            return;
        }

        const wrapperRect = canvasWrapperRef.current.getBoundingClientRect();
        const lx = e.clientX - wrapperRect.left;
        const ly = e.clientY - wrapperRect.top;

        setLoupe({ visible: true, x: lx, y: ly, cx: x, cy: y });

        // Redraw loupe zoomed canvas
        const loupeCanvas = loupeCanvasRef.current;
        const loupeCtx = loupeCanvas.getContext('2d');
        loupeCtx.imageSmoothingEnabled = false;
        loupeCtx.clearRect(0, 0, 120, 120);

        // checkerboard
        loupeCtx.fillStyle = '#12121a';
        loupeCtx.fillRect(0, 0, 120, 120);
        loupeCtx.fillStyle = '#1e1e2f';
        const size = 8;
        for (let j = 0; j < 120; j += size * 2) {
            for (let i = 0; i < 120; i += size * 2) {
                loupeCtx.fillRect(i, j, size, size);
                loupeCtx.fillRect(i + size, j + size, size, size);
            }
        }

        // draw viewport segment
        const sSize = 13;
        loupeCtx.drawImage(
            canvas,
            x - sSize / 2, y - sSize / 2, sSize, sSize,
            0, 0, 120, 120
        );
    };

    const handleCustomColorInput = (e) => {
        const hex = e.target.value;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        setTargetColor({ r, g, b });
        setLastClickedPixel(null);
    };

    const resetEditor = () => {
        if (!originalImageData) return;
        setResultImageData(null);
        setCurrentView('original');
        setLastClickedPixel(null);
        setZoom(1);
        setPanX(0);
        setPanY(0);
        setTimeout(() => fitCanvasToView(), 30);
        showToast('Reset to original frame', 'info');
    };

    const triggerNewUpload = () => {
        setImageLoaded(false);
        setOriginalImage(null);
        setOriginalImageData(null);
        setResultImageData(null);
        setLastClickedPixel(null);
        setZoom(1);
        setPanX(0);
        setPanY(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const downloadPNG = () => {
        if (!resultImageData) return;

        // Use temporary hidden canvas to perform native data URL export of the result ImageData
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = resultImageData.width;
        tempCanvas.height = resultImageData.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(resultImageData, 0, 0);

        const link = document.createElement('a');
        link.download = 'frame_transparent.png';
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
        showToast('PNG frame downloaded!', 'success');
    };

    return (
        <div className="editor-page-root">
            <div className="app-bg">
                <div className="glow glow-1"></div>
                <div className="glow glow-2"></div>
                <div className="glow glow-3"></div>
            </div>

            <header className="app-header">
                <Link href="/" className="logo" style={{ textDecoration: 'none' }}>
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <rect x="2" y="2" width="28" height="28" rx="6" stroke="url(#logoGrad)" stroke-width="2.5" fill="none"/>
                        <rect x="7" y="7" width="8" height="8" rx="2" fill="url(#logoGrad)" opacity="0.6"/>
                        <rect x="17" y="7" width="8" height="8" rx="2" fill="url(#logoGrad)" opacity="0.4"/>
                        <rect x="7" y="17" width="8" height="8" rx="2" fill="url(#logoGrad)" opacity="0.4"/>
                        <rect x="17" y="17" width="8" height="8" rx="2" fill="url(#logoGrad)" opacity="0.6"/>
                        <defs>
                            <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
                                <stop offset="0%" stop-color="#a78bfa"/>
                                <stop offset="100%" stop-color="#06b6d4"/>
                            </linearGradient>
                        </defs>
                    </svg>
                    <span className="logo-text">FrameCut</span>
                </Link>
                <p className="tagline">Auto-detect & transparentize frame slots</p>
            </header>

            <main className="app-main">
                {/* Upload Section */}
                {!imageLoaded && (
                    <section className="section upload-section">
                        <div 
                            className="upload-zone"
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
                                    <path d="M32 8L32 40" stroke="url(#upGrad)" stroke-width="3" stroke-linecap="round"/>
                                    <path d="M20 20L32 8L44 20" stroke="url(#upGrad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M8 40V48C8 52.4183 11.5817 56 16 56H48C52.4183 56 56 52.4183 56 48V40" stroke="url(#upGrad)" stroke-width="3" stroke-linecap="round"/>
                                    <defs>
                                        <linearGradient id="upGrad" x1="32" y1="8" x2="32" y2="56">
                                            <stop offset="0%" stop-color="#a78bfa"/>
                                            <stop offset="100%" stop-color="#06b6d4"/>
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                            <h2 className="upload-title">Drop your frame here</h2>
                            <p className="upload-desc">or click to browse • PNG format supported</p>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept="image/png" 
                                hidden 
                            />
                        </div>
                    </section>
                )}

                {/* Editor Section */}
                {imageLoaded && (
                    <section className="section editor-section">
                        <div className="editor-layout">
                            {/* Controls Panel */}
                            <div className="controls-panel glass-panel">
                                <h3 className="panel-title">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="3"/>
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                                    </svg>
                                    Settings
                                </h3>

                                <div className="control-group">
                                    <label className="control-label">Target Color</label>
                                    <p className="control-hint">Click on the image to pick a color, or use auto-detect</p>
                                    <div className="color-display">
                                        <input 
                                            type="color" 
                                            value={rgbToHex(targetColor.r, targetColor.g, targetColor.b)} 
                                            onChange={handleCustomColorInput} 
                                            style={{ display: 'none' }}
                                            id="react-color-input"
                                        />
                                        <div 
                                            className="color-swatch" 
                                            style={{ background: rgbToHex(targetColor.r, targetColor.g, targetColor.b), cursor: 'pointer' }}
                                            onClick={() => document.getElementById('react-color-input')?.click()}
                                            title="Pick custom color"
                                        ></div>
                                        <span className="color-hex">{rgbToHex(targetColor.r, targetColor.g, targetColor.b).toUpperCase()}</span>
                                    </div>
                                    <button 
                                        className="btn btn-outline btn-sm" 
                                        onClick={() => autoDetectColor(originalImageData)}
                                        style={{ width: '100%' }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
                                            <circle cx="12" cy="12" r="3"/>
                                        </svg>
                                        Auto Detect
                                    </button>
                                </div>

                                <div className="control-group">
                                    <label className="control-label">
                                        Tolerance
                                        <span className="control-value">{tolerance}</span>
                                    </label>
                                    <p className="control-hint">Higher = more colors removed</p>
                                    <input 
                                        type="range" 
                                        className="slider" 
                                        min="1" 
                                        max="100" 
                                        value={tolerance}
                                        onChange={(e) => setTolerance(parseInt(e.target.value))}
                                    />
                                </div>

                                <div className="control-group">
                                    <label className="control-label">
                                        Edge Softness
                                        <span className="control-value">{softness}</span>
                                    </label>
                                    <p className="control-hint">Smooth edges for cleaner result</p>
                                    <input 
                                        type="range" 
                                        className="slider" 
                                        min="0" 
                                        max="10" 
                                        value={softness}
                                        onChange={(e) => setSoftness(parseInt(e.target.value))}
                                    />
                                </div>

                                <div className="control-group">
                                    <label className="control-label checkbox-label">
                                        <input 
                                            type="checkbox" 
                                            checked={contiguous}
                                            onChange={(e) => setContiguous(e.target.checked)}
                                        />
                                        <span className="checkbox-custom"></span>
                                        Contiguous Only
                                    </label>
                                    <p className="control-hint">Only remove connected areas of the same color</p>
                                </div>

                                <div className="action-buttons">
                                    <button className="btn btn-primary" onClick={applyTransparency}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="20 6 9 17 4 12"/>
                                        </svg>
                                        Apply
                                    </button>
                                    <button className="btn btn-outline" onClick={resetEditor}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="1 4 1 10 7 10"/>
                                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                                        </svg>
                                        Reset
                                    </button>
                                </div>

                                <div className="divider"></div>

                                <button 
                                    className="btn btn-download" 
                                    onClick={downloadPNG} 
                                    disabled={!resultImageData}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                        <polyline points="7 10 12 15 17 10"/>
                                        <line x1="12" y1="15" x2="12" y2="3"/>
                                    </svg>
                                    Download PNG
                                </button>

                                <button 
                                    className="btn btn-outline btn-sm" 
                                    onClick={triggerNewUpload} 
                                    style={{ marginTop: '8px', width: '100%' }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="12" y1="5" x2="12" y2="19"/>
                                        <line x1="5" y1="12" x2="19" y2="12"/>
                                    </svg>
                                    Upload New Frame
                                </button>
                            </div>

                            {/* Canvas Area */}
                            <div className="canvas-area">
                                <div className="canvas-tabs">
                                    <button 
                                        className={`tab ${currentView === 'original' ? 'active' : ''}`}
                                        onClick={() => setCurrentView('original')}
                                    >
                                        Original
                                    </button>
                                    <button 
                                        className={`tab ${currentView === 'result' ? 'active' : ''}`}
                                        onClick={() => {
                                            if (!resultImageData) {
                                                showToast('Apply transparency first', 'info');
                                                return;
                                            }
                                            setCurrentView('result');
                                        }}
                                    >
                                        Result
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
                                >
                                    <div className="checkerboard-bg"></div>
                                    <div 
                                        className="canvas-container"
                                        style={{
                                            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                                            transformOrigin: 'center center',
                                            cursor: isDragging ? 'grabbing' : 'crosshair'
                                        }}
                                    >
                                        <canvas ref={mainCanvasRef} id="main-canvas"></canvas>
                                        
                                        {lastClickedPixel && (
                                            <div 
                                                className="canvas-crosshair"
                                                style={{
                                                    left: `${lastClickedPixel.x}px`,
                                                    top: `${lastClickedPixel.y}px`
                                                }}
                                            ></div>
                                        )}
                                    </div>

                                    {/* Hover Magnifier Loupe */}
                                    {loupe.visible && (
                                        <div 
                                            className="magnifier-loupe"
                                            style={{
                                                left: `${loupe.x}px`,
                                                top: `${loupe.y}px`
                                            }}
                                        >
                                            <canvas ref={loupeCanvasRef} width="120" height="120"></canvas>
                                            <div className="loupe-crosshair"></div>
                                        </div>
                                    )}

                                    <div className="zoom-info">{Math.round(zoom * 100)}%</div>
                                </div>
                                <div className="canvas-toolbar">
                                    <button className="toolbar-btn" onClick={zoomIn} title="Zoom In">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="11" cy="11" r="8"/>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                            <line x1="11" y1="8" x2="11" y2="14"/>
                                            <line x1="8" y1="11" x2="14" y2="11"/>
                                        </svg>
                                    </button>
                                    <button className="toolbar-btn" onClick={zoomOut} title="Zoom Out">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="11" cy="11" r="8"/>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                            <line x1="8" y1="11" x2="14" y2="11"/>
                                        </svg>
                                    </button>
                                    <button className="toolbar-btn" onClick={fitCanvasToView} title="Fit to View">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Processing Overlay */}
                {processing.visible && (
                    <div className="processing-overlay">
                        <div className="processing-content glass-panel">
                            <div className="spinner"></div>
                            <p className="processing-text">Processing your frame...</p>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${processing.progress}%` }}></div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <footer className="app-footer">
                <p>Built with ❤️ by <strong>Gammaura</strong></p>
            </footer>

            {/* Custom Toast Banner */}
            {toast && (
                <div className={`toast ${toast.type}`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}
