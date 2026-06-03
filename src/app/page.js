'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from './context/AuthContext';
import './landing.css';

export default function Home() {
    const { user, logout, setShowAuthModal, setAuthMode } = useAuth();
    const [sliderPos, setSliderPos] = useState(50);
    const containerRef = useRef(null);
    const isSliding = useRef(false);

    const handleMove = (clientX) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        let percentage = ((clientX - rect.left) / rect.width) * 100;
        if (percentage < 0) percentage = 0;
        if (percentage > 100) percentage = 100;
        setSliderPos(percentage);
    };

    const startSliding = () => {
        isSliding.current = true;
    };

    useEffect(() => {
        const stopSliding = () => {
            isSliding.current = false;
        };

        const onMouseMove = (e) => {
            if (!isSliding.current) return;
            handleMove(e.clientX);
        };

        const onTouchMove = (e) => {
            if (!isSliding.current) return;
            handleMove(e.touches[0].clientX);
        };

        window.addEventListener('mouseup', stopSliding);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('touchend', stopSliding);
        window.addEventListener('touchmove', onTouchMove);

        return () => {
            window.removeEventListener('mouseup', stopSliding);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('touchend', stopSliding);
            window.removeEventListener('touchmove', onTouchMove);
        };
    }, []);

    const onContainerClick = (e) => {
        if (e.target.closest('#comparison-handle')) return;
        handleMove(e.clientX);
    };

    return (
        <div className="landing-page-root">
            {/* Background glow objects */}
            <div className="landing-bg">
                <div className="glow glow-1"></div>
                <div className="glow glow-2"></div>
            </div>

            {/* Navigation Header */}
            <header className="navbar">
                <div class="nav-container">
                    <Link href="/" className="logo">
                        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                            <rect x="2" y="2" width="28" height="28" rx="6" stroke="url(#navLogoGrad)" stroke-width="2.5" fill="none"/>
                            <rect x="7" y="7" width="8" height="8" rx="2" fill="url(#navLogoGrad)" opacity="0.6"/>
                            <rect x="17" y="7" width="8" height="8" rx="2" fill="url(#navLogoGrad)" opacity="0.4"/>
                            <rect x="7" y="17" width="8" height="8" rx="2" fill="url(#navLogoGrad)" opacity="0.4"/>
                            <rect x="17" y="17" width="8" height="8" rx="2" fill="url(#navLogoGrad)" opacity="0.6"/>
                            <defs>
                                <linearGradient id="navLogoGrad" x1="0" y1="0" x2="32" y2="32">
                                    <stop offset="0%" stop-color="#a78bfa"/>
                                    <stop offset="100%" stop-color="#06b6d4"/>
                                </linearGradient>
                            </defs>
                        </svg>
                        <span className="logo-text">FrameCut</span>
                    </Link>
                    <nav className="nav-links">
                        <a href="#features" className="nav-link">Features</a>
                        <a href="#testimonials" className="nav-link">Reviews</a>
                        <Link href="/pricing" className="nav-link">Pricing</Link>
                        <Link href="/api" className="nav-link">API</Link>
                    </nav>
                    {user ? (
                        <div className="nav-auth-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span className="user-badge" style={{ fontSize: '13px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--panel-border)', padding: '6px 12px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: user.tier === 'free' ? '#9595b0' : user.tier === 'pro' ? '#a78bfa' : '#06b6d4' }}></span>
                                {user.email.split('@')[0]} ({user.tier.toUpperCase()})
                            </span>
                            <button className="nav-link" onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Log Out</button>
                            <Link href="/editor" className="btn btn-glass">Launch App</Link>
                        </div>
                    ) : (
                        <div className="nav-auth-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button className="nav-link" onClick={() => { setAuthMode('login'); setShowAuthModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Log In</button>
                            <Link href="/editor" className="btn btn-glass">Launch App</Link>
                        </div>
                    )}
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero">
                <div className="announcement-badge">
                    <span>✨ Introducing FrameCut v2.0 (Next.js)</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="9 18 15 12 9 6"/>
                    </svg>
                </div>
                <h1 className="hero-title">
                    Meet the most intelligent platform to <span>cut frames</span> and ship transparent assets.
                </h1>
                <p class="hero-subtitle">
                    Instantly remove colored slots in image frames. Ultra-high quality contiguous masking, pixel-crisp color selector, and smooth edge anti-aliasing.
                </p>
                <div className="hero-ctas">
                    <Link href="/editor" className="btn btn-primary">
                        Start Free Editor
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                            <polyline points="12 5 19 12 12 19"/>
                        </svg>
                    </Link>
                    <a href="#features" className="btn btn-glass">See Features</a>
                </div>

                {/* Interactive Comparison Slider */}
                <div className="demo-container">
                    <div 
                        className="slider-comparison" 
                        ref={containerRef}
                        onClick={onContainerClick}
                    >
                        {/* Base Layer (Isolated transparent result) */}
                        <div className="comparison-layer result-layer">
                            <div className="mock-frame">
                                <div className="frame-header">
                                    <span className="header-dot"></span>
                                    <span className="header-dot"></span>
                                    <span className="header-dot"></span>
                                </div>
                                <div className="frame-viewport">
                                    <div className="checkerboard-pattern"></div>
                                    <div className="slot-cut">
                                        <span className="slot-inner-text">Transparent Slot</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Overlay Layer (Original colored frame) */}
                        <div 
                            className="comparison-layer original-layer" 
                            style={{ width: `${sliderPos}%` }}
                        >
                            <div className="mock-frame">
                                <div className="frame-header">
                                    <span className="header-dot"></span>
                                    <span className="header-dot"></span>
                                    <span className="header-dot"></span>
                                </div>
                                <div className="frame-viewport">
                                    <div className="slot-cut">
                                        <span className="slot-inner-text">Solid Color Slot</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Drag Handle */}
                        <div 
                            className="comparison-handle" 
                            id="comparison-handle"
                            style={{ left: `${sliderPos}%` }}
                            onMouseDown={startSliding}
                            onTouchStart={startSliding}
                        >
                            <div className="handle-button">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="8 17 3 12 8 7"/>
                                    <polyline points="16 17 21 12 16 7"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trusted By Section */}
            <section className="trusted-by">
                <h2 className="trusted-title">Trusted by creators and designers at</h2>
                <div className="brand-logos">
                    <div className="brand-logo">FIGMA<span>STUDIO</span></div>
                    <div className="brand-logo">CANVA<span>PRO</span></div>
                    <div className="brand-logo">VERCEL<span>LABS</span></div>
                    <div className="brand-logo">DRIBBBLE<span>CREATIVE</span></div>
                    <div className="brand-logo">BEHANCE<span>PORTFOLIO</span></div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features" id="features">
                <div className="section-header">
                    <h2 className="section-title">Smarter than your average tool</h2>
                    <p className="section-subtitle">
                        Designed specifically for making frame files transparent. Packed with custom algorithms that deliver professional edge control and instant isolation.
                    </p>
                </div>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                                <line x1="12" y1="22.08" x2="12" y2="12"/>
                            </svg>
                        </div>
                        <h3 className="feature-title">Contiguous Masking</h3>
                        <p className="feature-desc">
                            Isolate only connected regions of the target color. Perfect for cutting out specific windows in nested layouts without affecting surrounding elements.
                        </p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                        </div>
                        <h3 className="feature-title">Edge Softness (Feather)</h3>
                        <p className="feature-desc">
                            Uses a high-performance separable box-blur algorithm to anti-alias cutouts, blending borders smoothly instead of leaving jagged color fringes.
                        </p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                <line x1="11" y1="8" x2="11" y2="14"/>
                                <line x1="8" y1="11" x2="14" y2="11"/>
                            </svg>
                        </div>
                        <h3 className="feature-title">Precision Color Picker</h3>
                        <p className="feature-desc">
                            Equipped with a real-time hover loupe magnifier that acts like a microscope. Select target colors with pixel-perfect accuracy on any display.
                        </p>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="testimonials" id="testimonials">
                <div className="section-header">
                    <h2 className="section-title">Join thousands of creators</h2>
                    <p className="section-subtitle">Read what other designers and developers say about FrameCut.</p>
                </div>
                <div className="testimonials-grid">
                    <div className="testimonial-card">
                        <p className="testimonial-text">
                            "Sangat mudah digunakan! Membantu bisnis kecil kami membuat twibbon dan frame promosi dalam hitungan detik. Terima kasih FrameCut!"
                        </p>
                        <div className="testimonial-user">
                            <div className="user-avatar">KD</div>
                            <div>
                                <h4 className="user-name">Kurnia D.</h4>
                                <p className="user-role">Creative Director</p>
                            </div>
                        </div>
                    </div>
                    <div className="testimonial-card">
                        <p className="testimonial-text">
                            "Biasanya saya harus pakai Photoshop dan repot seleksi pen tool. Sekarang tinggal upload, pilih warna solid, atur softness, dan jadi! Sangat menghemat waktu."
                        </p>
                        <div className="testimonial-user">
                            <div className="user-avatar">BS</div>
                            <div>
                                <h4 class="user-name">Budi S.</h4>
                                <p class="user-role">Freelance Graphic Designer</p>
                            </div>
                        </div>
                    </div>
                    <div className="testimonial-card">
                        <p className="testimonial-text">
                            "Pemrosesan gambarnya berjalan instan bahkan untuk aset beresolusi 4K setelah update optimasi. Interface-nya sangat rapi dan intuitif."
                        </p>
                        <div className="testimonial-user">
                            <div className="user-avatar">MJ</div>
                            <div>
                                <h4 className="user-name">Mary J.</h4>
                                <p className="user-role">Twitch Streamer & Artist</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-banner">
                <div className="cta-box">
                    <h2 className="cta-title">Start creating for free</h2>
                    <p className="cta-desc">
                        Cut your frames, export high-quality transparent PNGs, and build your twibbon campaigns instantly.
                    </p>
                    <Link href="/editor" className="btn btn-primary">Open FrameCut Editor</Link>
                </div>
            </section>

            {/* Footer Section */}
            <footer className="footer">
                <div className="footer-container">
                    <Link href="/" className="footer-logo">
                        <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                            <rect x="2" y="2" width="28" height="28" rx="6" stroke="url(#footLogoGrad)" stroke-width="2.5" fill="none"/>
                            <rect x="7" y="7" width="8" height="8" rx="2" fill="url(#footLogoGrad)" opacity="0.6"/>
                            <rect x="17" y="7" width="8" height="8" rx="2" fill="url(#footLogoGrad)" opacity="0.4"/>
                            <rect x="7" y="17" width="8" height="8" rx="2" fill="url(#footLogoGrad)" opacity="0.4"/>
                            <rect x="17" y="17" width="8" height="8" rx="2" fill="url(#footLogoGrad)" opacity="0.6"/>
                            <defs>
                                <linearGradient id="footLogoGrad" x1="0" y1="0" x2="32" y2="32">
                                    <stop offset="0%" stop-color="#a78bfa"/>
                                    <stop offset="100%" stop-color="#06b6d4"/>
                                </linearGradient>
                            </defs>
                        </svg>
                        <span className="logo-text">FrameCut</span>
                    </Link>
                    <p className="footer-copyright">© 2026 FrameCut. Built by Gammaura.</p>
                </div>
            </footer>
        </div>
    );
}
