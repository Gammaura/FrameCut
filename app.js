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

    const colorSwatch = document.getElementById('color-swatch');
    const colorHex = document.getElementById('color-hex');
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
    let targetColor = { r: 204, g: 0, b: 0 }; // default red
    let hasResult = false;

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
        applyZoom();
    }

    function applyZoom() {
        mainCanvas.style.transform = `scale(${zoom})`;
        mainCanvas.style.transformOrigin = 'center center';
        zoomInfo.textContent = `${Math.round(zoom * 100)}%`;
    }

    // ===== ZOOM CONTROLS =====
    btnZoomIn.addEventListener('click', () => {
        zoom = Math.min(zoom * 1.25, 5);
        applyZoom();
    });

    btnZoomOut.addEventListener('click', () => {
        zoom = Math.max(zoom / 1.25, 0.1);
        applyZoom();
    });

    btnZoomFit.addEventListener('click', fitCanvasToView);

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

    // ===== COLOR PICKING =====
    mainCanvas.addEventListener('click', (e) => {
        if (!originalImageData) return;

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

        updateColorDisplay();
        showToast(`Color selected: ${rgbToHex(targetColor.r, targetColor.g, targetColor.b)}`, 'info');
    });

    function updateColorDisplay() {
        const hex = rgbToHex(targetColor.r, targetColor.g, targetColor.b);
        colorSwatch.style.background = hex;
        colorHex.textContent = hex;
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

                const seeds = findSeedPoints(srcData.data, w, h, targetColor, tolerance);
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
                for (let i = 0; i < pixels.length; i += 4) {
                    const dist = colorDistance(
                        pixels[i], pixels[i + 1], pixels[i + 2],
                        targetColor.r, targetColor.g, targetColor.b
                    );

                    if (dist <= tolerance) {
                        if (softness > 0 && dist > tolerance - softness * 3) {
                            const t = (dist - (tolerance - softness * 3)) / (softness * 3);
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

        for (let y = gridSize; y < h - gridSize; y += gridSize) {
            for (let x = gridSize; x < w - gridSize; x += gridSize) {
                const idx = (y * w + x) * 4;
                const dist = colorDistance(
                    data[idx], data[idx + 1], data[idx + 2],
                    color.r, color.g, color.b
                );
                if (dist <= tolerance * 0.6) {
                    // Verify it's in a solid region
                    let solidCount = 0;
                    const checkRadius = 5;
                    for (let dy = -checkRadius; dy <= checkRadius; dy += 2) {
                        for (let dx = -checkRadius; dx <= checkRadius; dx += 2) {
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                                const ni = (ny * w + nx) * 4;
                                const nd = colorDistance(
                                    data[ni], data[ni + 1], data[ni + 2],
                                    color.r, color.g, color.b
                                );
                                if (nd <= tolerance) solidCount++;
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
        const stack = [startX + startY * w];

        while (stack.length > 0) {
            const pos = stack.pop();
            if (pos < 0 || pos >= w * h) continue;
            if (visited[pos]) continue;

            const x = pos % w;
            const y = Math.floor(pos / w);
            visited[pos] = 1;

            const idx = pos * 4;
            const dist = colorDistance(
                data[idx], data[idx + 1], data[idx + 2],
                color.r, color.g, color.b
            );

            if (dist <= tolerance && data[idx + 3] > 0) {
                mask[pos] = 1;

                // 8-connected neighbors for better coverage
                if (x > 0) stack.push(pos - 1);
                if (x < w - 1) stack.push(pos + 1);
                if (y > 0) stack.push(pos - w);
                if (y < h - 1) stack.push(pos + w);
                // Diagonals
                if (x > 0 && y > 0) stack.push(pos - w - 1);
                if (x < w - 1 && y > 0) stack.push(pos - w + 1);
                if (x > 0 && y < h - 1) stack.push(pos + w - 1);
                if (x < w - 1 && y < h - 1) stack.push(pos + w + 1);
            }
        }
    }

    function dilateMask(mask, w, h, radius, data, color, tolerance) {
        // Expand mask by `radius` pixels, but ONLY into pixels
        // that are clearly anti-aliased (very close to target color).
        // Uses tight tolerance to avoid eating into the frame.
        const dilated = new Uint8Array(mask);
        const tightTolerance = tolerance * 1.3;

        for (let pass = 0; pass < radius; pass++) {
            const prevMask = new Uint8Array(dilated);
            for (let y = 1; y < h - 1; y++) {
                for (let x = 1; x < w - 1; x++) {
                    const pos = y * w + x;
                    if (prevMask[pos]) continue;

                    // Must be adjacent to a masked pixel
                    const adjCount =
                        (prevMask[pos - 1] ? 1 : 0) + (prevMask[pos + 1] ? 1 : 0) +
                        (prevMask[pos - w] ? 1 : 0) + (prevMask[pos + w] ? 1 : 0);

                    if (adjCount === 0) continue;

                    const idx = pos * 4;
                    const dist = colorDistance(
                        data[idx], data[idx + 1], data[idx + 2],
                        color.r, color.g, color.b
                    );

                    // Only dilate into pixels close to target color
                    if (dist <= tightTolerance) {
                        dilated[pos] = 2;
                    }
                }
            }
        }

        return dilated;
    }

    function applyCleanMask(pixels, dilatedMask, originalMask, w, h, softness, srcData, color, tolerance) {
        const totalPixels = w * h;

        // Pass 1: Core mask = fully transparent, dilated edge = transparent
        for (let i = 0; i < totalPixels; i++) {
            const px = i * 4;
            if (dilatedMask[i] >= 1) {
                pixels[px + 3] = 0;
            }
        }

        // Pass 2: Conservative cleanup — only 2 passes max
        // Remove pixels that are VERY similar to target AND mostly
        // surrounded by transparent pixels (these are leftover anti-alias)
        for (let pass = 0; pass < 2; pass++) {
            let changed = false;
            for (let y = 1; y < h - 1; y++) {
                for (let x = 1; x < w - 1; x++) {
                    const pos = y * w + x;
                    const px = pos * 4;

                    if (pixels[px + 3] === 0) continue;

                    // Count transparent neighbors (4-connected only for precision)
                    let transN = 0;
                    if (pixels[(pos - 1) * 4 + 3] === 0) transN++;
                    if (pixels[(pos + 1) * 4 + 3] === 0) transN++;
                    if (pixels[(pos - w) * 4 + 3] === 0) transN++;
                    if (pixels[(pos + w) * 4 + 3] === 0) transN++;

                    // Need at least 3 of 4 direct neighbors transparent
                    if (transN < 3) continue;

                    const dist = colorDistance(
                        pixels[px], pixels[px + 1], pixels[px + 2],
                        color.r, color.g, color.b
                    );

                    // Only remove if very close to target color
                    if (dist <= tolerance * 1.2) {
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
        // Standard Euclidean RGB distance
        const dr = r1 - r2;
        const dg = g1 - g2;
        const db = b1 - b2;
        return Math.sqrt(dr * dr + dg * dg + db * db);
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
        // Remove existing toasts
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
