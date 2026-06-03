/**
 * FrameCut — PNG Frame Transparency Maker
 * Auto-detect solid color regions in frame images and make them transparent.
 */

(function () {
    'use strict';

    // ===== DOM ELEMENTS =====
    const uploadSection = document.getElementById('upload-section');
    const editorSection = document.getElementById('editor-section');
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const mainCanvas = document.getElementById('main-canvas');
    const ctx = mainCanvas.getContext('2d', { willReadFrequently: true });
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const canvasContainer = document.getElementById('canvas-container');
    const canvasCrosshair = document.getElementById('canvas-crosshair');
    const magnifierLoupe = document.getElementById('magnifier-loupe');
    const loupeCanvas = document.getElementById('loupe-canvas');

    const colorSwatch = document.getElementById('color-swatch');
    const colorHex = document.getElementById('color-hex');
    const colorInput = document.getElementById('color-input');
    const toleranceSlider = document.getElementById('tolerance-slider');
    const toleranceValue = document.getElementById('tolerance-value');
    const softnessSlider = document.getElementById('softness-slider');
    const softnessValue = document.getElementById('softness-value');
    const contiguousCheck = document.getElementById('contiguous-check');

    const btnAutoDetect = document.getElementById('btn-auto-detect');
    const btnApply = document.getElementById('btn-apply');
    const btnReset = document.getElementById('btn-reset');
    const btnDownload = document.getElementById('btn-download');
    const btnNew = document.getElementById('btn-new');
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnZoomFit = document.getElementById('btn-zoom-fit');

    const tabOriginal = document.getElementById('tab-original');
    const tabResult = document.getElementById('tab-result');
    const zoomInfo = document.getElementById('zoom-info');

    const processingOverlay = document.getElementById('processing-overlay');
    const progressFill = document.getElementById('progress-fill');

    // ===== STATE =====
    let originalImage = null;
    let originalImageData = null;
    let resultImageData = null;
    let currentView = 'original'; // 'original' | 'result'
    let zoom = 1;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let targetColor = { r: 204, g: 0, b: 0 }; // default red
    let hasResult = false;
    let lastClickedPixel = null;

    // ===== UPLOAD HANDLING =====
    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'image/png') {
            loadImage(file);
        } else {
            showToast('Please upload a PNG file', 'error');
        }
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) loadImage(file);
    });

    btnNew.addEventListener('click', () => {
        uploadSection.classList.remove('hidden');
        editorSection.classList.add('hidden');
        originalImage = null;
        originalImageData = null;
        resultImageData = null;
        hasResult = false;
        fileInput.value = '';
        btnDownload.disabled = true;
        panX = 0;
        panY = 0;
        lastClickedPixel = null;
        canvasCrosshair.style.display = 'none';
        magnifierLoupe.style.display = 'none';
    });

    function loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                setupCanvas(img);
                uploadSection.classList.add('hidden');
                editorSection.classList.remove('hidden');
                autoDetectColor();
                showToast('Frame loaded! Click on color to select, then Apply', 'info');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function setupCanvas(img) {
        mainCanvas.width = img.width;
        mainCanvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        originalImageData = ctx.getImageData(0, 0, img.width, img.height);
        resultImageData = null;
        hasResult = false;
        currentView = 'original';
        tabOriginal.classList.add('active');
        tabResult.classList.remove('active');
        btnDownload.disabled = true;
        
        // Hide overlays
        canvasCrosshair.style.display = 'none';
        magnifierLoupe.style.display = 'none';
        lastClickedPixel = null;
        
        // Delay fit so the editor section has rendered and wrapper has dimensions
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                fitCanvasToView();
            });
        });
    }

    function fitCanvasToView() {
        const wrapperRect = canvasWrapper.getBoundingClientRect();
        const scaleX = (wrapperRect.width - 40) / mainCanvas.width;
        const scaleY = (wrapperRect.height - 40) / mainCanvas.height;
        zoom = Math.min(scaleX, scaleY);
        if (zoom <= 0 || !isFinite(zoom)) zoom = 0.5;
        panX = 0;
        panY = 0;
        applyZoom();
    }

    function applyZoom() {
        canvasContainer.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
        canvasContainer.style.transformOrigin = 'center center';
        zoomInfo.textContent = `${Math.round(zoom * 100)}%`;
    }

    // ===== ZOOM CONTROLS =====
    btnZoomIn.addEventListener('click', () => {
        zoom = Math.min(zoom * 1.25, 8);
        applyZoom();
    });

    btnZoomOut.addEventListener('click', () => {
        zoom = Math.max(zoom / 1.25, 0.05);
        applyZoom();
    });

    btnZoomFit.addEventListener('click', fitCanvasToView);

    // ===== ZOOM WITH MOUSE WHEEL =====
    canvasWrapper.addEventListener('wheel', (e) => {
        if (!originalImageData) return;
        e.preventDefault();
        
        const zoomFactor = 1.1;
        const oldZoom = zoom;
        if (e.deltaY < 0) {
            zoom = Math.min(zoom * zoomFactor, 8);
        } else {
            zoom = Math.max(zoom / zoomFactor, 0.05);
        }
        
        // Zoom relative to cursor position
        const rect = canvasContainer.getBoundingClientRect();
        const wrapperRect = canvasWrapper.getBoundingClientRect();
        
        const cursorX = e.clientX - wrapperRect.left - wrapperRect.width / 2;
        const cursorY = e.clientY - wrapperRect.top - wrapperRect.height / 2;
        
        panX = cursorX - (cursorX - panX) * (zoom / oldZoom);
        panY = cursorY - (cursorY - panY) * (zoom / oldZoom);

        applyZoom();
    }, { passive: false });

    // ===== CANVAS PANNING AND INTERACTION =====
    canvasWrapper.addEventListener('mousedown', (e) => {
        if (!originalImageData) return;
        
        isDragging = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        
        canvasWrapper.dataset.downX = e.clientX;
        canvasWrapper.dataset.downY = e.clientY;
        canvasWrapper.style.cursor = 'grabbing';
    });

    canvasWrapper.addEventListener('mousemove', (e) => {
        if (isDragging) {
            panX = e.clientX - startX;
            panY = e.clientY - startY;
            applyZoom();
            magnifierLoupe.style.display = 'none';
        } else {
            updateLoupe(e);
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        canvasWrapper.style.cursor = 'crosshair';
        
        const downX = parseFloat(canvasWrapper.dataset.downX || 0);
        const downY = parseFloat(canvasWrapper.dataset.downY || 0);
        const dx = e.clientX - downX;
        const dy = e.clientY - downY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 5) {
            handleCanvasSelection(e);
        }
    });

    canvasWrapper.addEventListener('mouseleave', () => {
        magnifierLoupe.style.display = 'none';
    });

    function handleCanvasSelection(e) {
        const rect = mainCanvas.getBoundingClientRect();
        const scaleX = mainCanvas.width / rect.width;
        const scaleY = mainCanvas.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        if (x < 0 || x >= mainCanvas.width || y < 0 || y >= mainCanvas.height) return;

        const data = originalImageData.data;
        const idx = (y * mainCanvas.width + x) * 4;
        targetColor = {
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2]
        };

        lastClickedPixel = { x, y };
        updateColorDisplay();
        
        // Show crosshair at exact canvas pixel
        canvasCrosshair.style.display = 'block';
        canvasCrosshair.style.left = `${x}px`;
        canvasCrosshair.style.top = `${y}px`;

        showToast(`Color selected: ${rgbToHex(targetColor.r, targetColor.g, targetColor.b)}`, 'info');
    }

    function updateLoupe(e) {
        if (!originalImageData) {
            magnifierLoupe.style.display = 'none';
            return;
        }

        const rect = mainCanvas.getBoundingClientRect();
        const scaleX = mainCanvas.width / rect.width;
        const scaleY = mainCanvas.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        if (x < 0 || x >= mainCanvas.width || y < 0 || y >= mainCanvas.height) {
            magnifierLoupe.style.display = 'none';
            return;
        }

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        const loupeX = e.clientX - wrapperRect.left;
        const loupeY = e.clientY - wrapperRect.top;

        magnifierLoupe.style.display = 'block';
        magnifierLoupe.style.left = `${loupeX}px`;
        magnifierLoupe.style.top = `${loupeY}px`;

        const loupeCtx = loupeCanvas.getContext('2d');
        loupeCtx.imageSmoothingEnabled = false;
        loupeCtx.clearRect(0, 0, 120, 120);

        // Draw Checkerboard
        drawLoupeCheckerboard(loupeCtx, 120, 120, 8);

        // Draw zoomed section
        const sSize = 13;
        const dSize = 120;
        loupeCtx.drawImage(
            mainCanvas,
            x - sSize / 2, y - sSize / 2, sSize, sSize,
            0, 0, dSize, dSize
        );
    }

    function drawLoupeCheckerboard(ctx, w, h, size) {
        ctx.fillStyle = '#12121a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#1e1e2f';
        for (let y = 0; y < h; y += size * 2) {
            for (let x = 0; x < w; x += size * 2) {
                ctx.fillRect(x, y, size, size);
                ctx.fillRect(x + size, y + size, size, size);
            }
        }
    }

    // ===== SWATCH AND COLOR PICKER INPUT =====
    colorSwatch.addEventListener('click', () => colorInput.click());
    colorInput.addEventListener('input', (e) => {
        const hex = e.target.value;
        colorHex.textContent = hex.toUpperCase();
        colorSwatch.style.background = hex;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        targetColor = { r, g, b };
        lastClickedPixel = null;
        canvasCrosshair.style.display = 'none';
    });

    function updateColorDisplay() {
        const hex = rgbToHex(targetColor.r, targetColor.g, targetColor.b);
        colorSwatch.style.background = hex;
        colorHex.textContent = hex.toUpperCase();
        colorInput.value = hex;
    }

    // ===== TAB SWITCHING =====
    tabOriginal.addEventListener('click', () => {
        currentView = 'original';
        tabOriginal.classList.add('active');
        tabResult.classList.remove('active');
        renderCurrentView();
    });

    tabResult.addEventListener('click', () => {
        if (!hasResult) {
            showToast('Apply transparency first', 'info');
            return;
        }
        currentView = 'result';
        tabResult.classList.add('active');
        tabOriginal.classList.remove('active');
        renderCurrentView();
    });

    function renderCurrentView() {
        if (currentView === 'original' && originalImageData) {
            ctx.putImageData(originalImageData, 0, 0);
        } else if (currentView === 'result' && resultImageData) {
            ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
            ctx.putImageData(resultImageData, 0, 0);
        }
    }

    // ===== AUTO DETECT =====
    btnAutoDetect.addEventListener('click', autoDetectColor);

    function autoDetectColor() {
        if (!originalImageData) return;

        showProcessing();
        updateProgress(10);

        // Use requestAnimationFrame to allow UI update
        requestAnimationFrame(() => {
            const data = originalImageData.data;
            const w = originalImageData.width;
            const h = originalImageData.height;

            // Sample interior pixels to find dominant non-edge colors
            // We look for large rectangular regions of solid color
            const colorCounts = {};
            const sampleStep = Math.max(1, Math.floor(Math.min(w, h) / 200));

            for (let y = 0; y < h; y += sampleStep) {
                for (let x = 0; x < w; x += sampleStep) {
                    const idx = (y * w + x) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    const a = data[idx + 3];

                    if (a < 200) continue; // skip transparent/semi-transparent

                    // Quantize colors to reduce noise
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

            updateProgress(50);

            // Find the most common colors
            const sorted = Object.values(colorCounts).sort((a, b) => b.count - a.count);

            if (sorted.length === 0) {
                hideProcessing();
                showToast('Could not detect any solid color', 'error');
                return;
            }

            // Try to find a color that's likely a "slot" color
            // Heuristic: Look for a color that forms large contiguous rectangular blocks
            // Usually the slot color is one of the top colors but NOT the most decorative
            // We'll test top candidates for rectangularity

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

            updateProgress(90);

            targetColor = {
                r: bestCandidate.r,
                g: bestCandidate.g,
                b: bestCandidate.b
            };

            updateColorDisplay();
            updateProgress(100);

            setTimeout(() => {
                hideProcessing();
                showToast(`Detected color: ${rgbToHex(targetColor.r, targetColor.g, targetColor.b)}`, 'success');
            }, 300);
        });
    }

    function evaluateRectangularity(data, w, h, colorCandidate, step) {
        // Check how "rectangular" the distribution of this color is
        // Colors that form rectangular blocks score higher
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

        // Rectangularity = how much of the bounding box is filled
        const bboxArea = ((maxX - minX) / step + 1) * ((maxY - minY) / step + 1);
        const fillRatio = pixelCount / bboxArea;

        // Prefer colors that fill a significant area but aren't the entire image
        const imageArea = (w / step) * (h / step);
        const coverage = pixelCount / imageArea;

        // Sweet spot: not too small, not the entire image
        let coverageScore = 0;
        if (coverage > 0.05 && coverage < 0.7) {
            coverageScore = 1 - Math.abs(coverage - 0.3) * 2;
        }

        return fillRatio * coverageScore * pixelCount;
    }

    // ===== SLIDER EVENTS =====
    toleranceSlider.addEventListener('input', (e) => {
        toleranceValue.textContent = e.target.value;
    });

    softnessSlider.addEventListener('input', (e) => {
        softnessValue.textContent = e.target.value;
    });

    // ===== APPLY TRANSPARENCY =====
    btnApply.addEventListener('click', applyTransparency);

    function applyTransparency() {
        if (!originalImageData) return;

        showProcessing();
        updateProgress(5);

        // Use setTimeout to let the UI update
        setTimeout(() => {
            const tolerance = parseInt(toleranceSlider.value);
            const softness = parseInt(softnessSlider.value);
            const contiguous = contiguousCheck.checked;

            const srcData = originalImageData;
            const w = srcData.width;
            const h = srcData.height;

            // Create a copy of the image data
            const newImageData = new ImageData(
                new Uint8ClampedArray(srcData.data),
                w, h
            );
            const pixels = newImageData.data;

            if (contiguous) {
                // Flood-fill based approach
                const visited = new Uint8Array(w * h);
                const mask = new Uint8Array(w * h);

                // Use the user's clicked point as primary seed if available
                let seeds = [];
                if (lastClickedPixel) {
                    seeds.push(lastClickedPixel);
                }

                // Scan for other solid regions matching target color
                const gridSeeds = findSeedPoints(srcData.data, w, h, targetColor, tolerance);
                seeds = seeds.concat(gridSeeds);
                
                updateProgress(15);

                for (const seed of seeds) {
                    floodFillMask(srcData.data, w, h, seed.x, seed.y, targetColor, tolerance, visited, mask);
                }
                updateProgress(40);

                // Dilate mask by 2px to catch anti-aliased edge pixels only
                const dilateRadius = 2;
                const dilatedMask = dilateMask(mask, w, h, dilateRadius, srcData.data, targetColor, tolerance);
                updateProgress(60);

                // Apply the dilated mask with clean edge alpha
                applyCleanMask(pixels, dilatedMask, mask, w, h, softness, srcData.data, targetColor, tolerance);
            } else {
                // Global color removal
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

            updateProgress(90);

            resultImageData = newImageData;
            hasResult = true;
            btnDownload.disabled = false;

            currentView = 'result';
            tabResult.classList.add('active');
            tabOriginal.classList.remove('active');
            ctx.clearRect(0, 0, w, h);
            ctx.putImageData(resultImageData, 0, 0);

            updateProgress(100);

            setTimeout(() => {
                hideProcessing();
                showToast('Transparency applied! Check the Result tab', 'success');
            }, 300);
        }, 50);
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
                    // Verify it's in a solid region
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

                // 8-connected neighbors for better coverage
                if (x > 0) pushNeighbor(pos - 1);
                if (x < w - 1) pushNeighbor(pos + 1);
                if (y > 0) pushNeighbor(pos - w);
                if (y < h - 1) pushNeighbor(pos + w);
                // Diagonals
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

        // Horizontal pass
        for (let y = 0; y < h; y++) {
            const rowOffset = y * w;
            let sum = 0;
            for (let x = -R; x <= R; x++) {
                const val = mask[rowOffset + Math.min(Math.max(x, 0), w - 1)];
                sum += val;
            }
            // First R pixels
            for (let x = 0; x < Math.min(R, w); x++) {
                temp[rowOffset + x] = sum / (2 * R + 1);
                const leaveX = x - R;
                const enterX = x + R + 1;
                const leaveVal = mask[rowOffset + Math.max(leaveX, 0)];
                const enterVal = mask[rowOffset + Math.min(enterX, w - 1)];
                sum += enterVal - leaveVal;
            }
            // Middle pixels
            const endMiddle = w - R - 1;
            for (let x = R; x <= endMiddle; x++) {
                temp[rowOffset + x] = sum / (2 * R + 1);
                const leaveVal = mask[rowOffset + x - R];
                const enterVal = mask[rowOffset + x + R + 1];
                sum += enterVal - leaveVal;
            }
            // Last R pixels
            for (let x = Math.max(R, w - R); x < w; x++) {
                temp[rowOffset + x] = sum / (2 * R + 1);
                const leaveX = x - R;
                const enterX = x + R + 1;
                const leaveVal = mask[rowOffset + Math.max(leaveX, 0)];
                const enterVal = mask[rowOffset + Math.min(enterX, w - 1)];
                sum += enterVal - leaveVal;
            }
        }

        // Vertical pass
        for (let x = 0; x < w; x++) {
            let sum = 0;
            for (let y = -R; y <= R; y++) {
                const val = temp[Math.min(Math.max(y, 0), h - 1) * w + x];
                sum += val;
            }
            // First R pixels
            for (let y = 0; y < Math.min(R, h); y++) {
                blurred[y * w + x] = sum / (2 * R + 1);
                const leaveY = y - R;
                const enterY = y + R + 1;
                const leaveVal = temp[Math.max(leaveY, 0) * w + x];
                const enterVal = temp[Math.min(enterY, h - 1) * w + x];
                sum += enterVal - leaveVal;
            }
            // Middle pixels
            const endMiddle = h - R - 1;
            for (let y = R; y <= endMiddle; y++) {
                blurred[y * w + x] = sum / (2 * R + 1);
                const leaveVal = temp[(y - R) * w + x];
                const enterVal = temp[(y + R + 1) * w + x];
                sum += enterVal - leaveVal;
            }
            // Last R pixels
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

        // Pass 2: Conservative cleanup — only 2 passes max
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

    // ===== RESET =====
    btnReset.addEventListener('click', () => {
        if (!originalImageData) return;
        resultImageData = null;
        hasResult = false;
        currentView = 'original';
        tabOriginal.classList.add('active');
        tabResult.classList.remove('active');
        btnDownload.disabled = true;
        ctx.putImageData(originalImageData, 0, 0);
        lastClickedPixel = null;
        canvasCrosshair.style.display = 'none';
        magnifierLoupe.style.display = 'none';
        showToast('Reset to original', 'info');
    });

    // ===== DOWNLOAD =====
    btnDownload.addEventListener('click', () => {
        if (!resultImageData) return;

        // Draw result to canvas and export
        ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        ctx.putImageData(resultImageData, 0, 0);

        const link = document.createElement('a');
        link.download = 'frame_transparent.png';
        link.href = mainCanvas.toDataURL('image/png');
        link.click();

        showToast('PNG downloaded!', 'success');
    });

    // ===== UTILITY FUNCTIONS =====
    function colorDistance(r1, g1, b1, r2, g2, b2) {
        const dr = r1 - r2;
        const dg = g1 - g2;
        const db = b1 - b2;
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    function colorDistanceSq(r1, g1, b1, r2, g2, b2) {
        const dr = r1 - r2;
        const dg = g1 - g2;
        const db = b1 - b2;
        return dr * dr + dg * dg + db * db;
    }

    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    }

    // ===== PROCESSING UI =====
    function showProcessing() {
        processingOverlay.classList.remove('hidden');
        progressFill.style.width = '0%';
    }

    function hideProcessing() {
        processingOverlay.classList.add('hidden');
    }

    function updateProgress(percent) {
        progressFill.style.width = `${percent}%`;
    }

    // ===== TOAST =====
    function showToast(message, type = 'info') {
        document.querySelectorAll('.toast').forEach(t => t.remove());

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

})();
