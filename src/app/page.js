'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from './context/AuthContext';
import './landing.css';

export default function Home() {
    const { user, logout, setShowAuthModal, setAuthMode } = useAuth();
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'generator'

    return (
        <div className="landing-page-root">
            {/* Background glow objects */}
            <div className="landing-bg">
                <div className="glow glow-1"></div>
                <div className="glow glow-2"></div>
            </div>

            {/* Navigation Header */}
            <header className="navbar">
                <div className="nav-container">
                    <Link href="/" className="logo-container">
                        <span className="logo-brand">
                            <strong className="logo-strong">FRAME</strong>
                            <span className="logo-light">CUT</span>
                        </span>
                    </Link>
                    <nav className="nav-links">
                        <a href="#features" className="nav-link">Features</a>
                        <a href="#testimonials" className="nav-link">Reviews</a>
                        <Link href="/pricing" className="nav-link">Pricing</Link>
                        <Link href="/api" className="nav-link">API</Link>
                    </nav>
                    {user ? (
                        <div className="nav-auth-group" style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
                            <Link href="/editor" className="btn btn-glass" style={{ fontSize: '13px', padding: '8px 18px' }}>Workspace</Link>
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
                                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }} 
                                        />
                                    ) : (
                                        <div 
                                            style={{ 
                                                width: '36px', 
                                                height: '36px', 
                                                borderRadius: '50%', 
                                                backgroundColor: 'var(--accent)', 
                                                color: '#000', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                fontWeight: '700',
                                                fontSize: '14px',
                                                border: '1px solid var(--border-color)'
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
                                            background: 'var(--bg-secondary)', 
                                            border: '1px solid var(--border-color)', 
                                            borderRadius: '0px', 
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.3)', 
                                            padding: '12px',
                                            zIndex: 1000,
                                            textAlign: 'left'
                                        }}
                                    >
                                        <div style={{ padding: '4px 8px 8px 8px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || user.email.split('@')[0]}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', background: 'var(--accent-glow)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '0px' }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent)' }}></span>
                                                {user.tier} Plan
                                            </div>
                                        </div>
                                        <Link href="/editor" style={{ display: 'block', padding: '8px', fontSize: '13px', color: 'var(--text-primary)', textDecoration: 'none', transition: 'background 0.2s' }} className="dropdown-item-hover">
                                            Go to Workspace
                                        </Link>
                                        <Link href="/pricing" style={{ display: 'block', padding: '8px', fontSize: '13px', color: 'var(--text-primary)', textDecoration: 'none', transition: 'background 0.2s' }} className="dropdown-item-hover">
                                            Upgrade & Pricing
                                        </Link>
                                        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '8px', paddingTop: '8px' }}>
                                            <button 
                                                onClick={() => { logout(); setShowProfileDropdown(false); }} 
                                                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px', fontSize: '13px', color: 'var(--accent)', cursor: 'pointer' }}
                                                className="dropdown-item-hover"
                                            >
                                                Log Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="nav-auth-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button className="nav-link" onClick={() => { setAuthMode('login'); setShowAuthModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Log in</button>
                            <button className="btn btn-primary" onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}>Sign up</button>
                        </div>
                    )}
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content">
                    <div className="announcement-badge">
                        <span>Introducing FrameCut for Creators →</span>
                    </div>
                    <h1 className="hero-title">
                        The New Operating System <br /> for <span>Creative Work</span>
                    </h1>
                    <p className="hero-subtitle">
                        Meet the most intelligent platform to cut frames, isolate transparent assets and ship production-ready designs.
                    </p>
                    <div className="hero-ctas">
                        <Link href="/editor" className="btn btn-primary">
                            Start creating
                        </Link>
                        <a href="#features" className="btn btn-glass">
                            <span>▶</span> Watch video
                        </a>
                    </div>
                </div>

                {/* Unified Interactive Mockup Frame (Column 2) */}
                <div className="demo-container crop-box">
                    <div className="crop-corners-inner"></div>
                    <div className="app-mockup-container">
                        {/* Mock Window Header */}
                        <div className="mockup-header">
                            <div className="mockup-window-controls">
                                <span className="window-dot red"></span>
                                <span className="window-dot yellow"></span>
                                <span className="window-dot green"></span>
                            </div>
                            
                            <div className="mockup-tabs">
                                <button 
                                    className={`mockup-tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('editor')}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 20h9"/>
                                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                                    </svg>
                                    Creative Editor
                                </button>
                                <button 
                                    className={`mockup-tab-btn ${activeTab === 'generator' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('generator')}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                                    </svg>
                                    AI Generator
                                </button>
                            </div>
                            
                            <div className="mockup-header-actions">
                                {activeTab === 'editor' && (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>100%</span>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-muted)' }}>
                                            <path d="m6 9 6 6 6-6"/>
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tab 1: Editor View */}
                        {activeTab === 'editor' && (
                            <div className="editor-mockup-workspace">
                                <div className="editor-mockup-toolbar">
                                    <div className="editor-toolbar-left">
                                        <button className="toolbar-icon-btn">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M3 7v6h6"/>
                                                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
                                            </svg>
                                        </button>
                                        <button className="toolbar-icon-btn">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 7v6h-6"/>
                                                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="editor-toolbar-center">
                                        <button className="toolbar-icon-btn">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polygon points="6 3 20 12 6 21 6 3"/>
                                            </svg>
                                        </button>
                                        <button className="toolbar-icon-btn">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="m15 18-6-6 6-6"/>
                                            </svg>
                                        </button>
                                        <div className="zoom-selector">
                                            100%
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="m6 9 6 6 6-6"/>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="editor-toolbar-right">
                                        <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '11px', fontWeight: '800' }}>
                                            Export
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="editor-mockup-body">
                                    <div className="editor-mockup-sidebar-left">
                                        <div className="editor-mockup-project-dropdown">
                                            <button className="project-dropdown-btn">
                                                📁 Project V
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 'auto' }}>
                                                    <path d="m6 9 6 6 6-6"/>
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="editor-mockup-menu-list">
                                            <div className="editor-mockup-menu-item active">
                                                <span>📁</span> Media
                                            </div>
                                            <div className="editor-mockup-menu-item">
                                                <span>T</span> Text
                                            </div>
                                            <div className="editor-mockup-menu-item">
                                                <span>🧱</span> Elements
                                            </div>
                                            <div className="editor-mockup-menu-item">
                                                <span>🎵</span> Audio
                                            </div>
                                            <div className="editor-mockup-menu-item">
                                                <span>✨</span> Effects
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="editor-mockup-canvas-area">
                                        <div className="editor-mockup-canvas-wrapper">
                                            <img src="/3d_abstract_shapes.png" alt="3D abstract canvas asset" className="editor-mockup-canvas-img" />
                                        </div>
                                    </div>
                                    
                                    <div className="editor-mockup-sidebar-right">
                                        <div className="sidebar-right-tabs">
                                            <button className="sidebar-right-tab-btn active">Design</button>
                                            <button className="sidebar-right-tab-btn">Animate</button>
                                        </div>
                                        
                                        <div className="sidebar-right-section">
                                            <div className="sidebar-right-section-title">Transform</div>
                                            <div className="sidebar-grid-2">
                                                <div className="sidebar-input-group">
                                                    <span className="sidebar-input-label">Position</span>
                                                    <div className="sidebar-input-wrapper">
                                                        <span className="sidebar-input-prefix">X</span>
                                                        <input type="text" className="sidebar-input" value="120" readOnly />
                                                    </div>
                                                </div>
                                                <div className="sidebar-input-group">
                                                    <span className="sidebar-input-label">&nbsp;</span>
                                                    <div className="sidebar-input-wrapper">
                                                        <span className="sidebar-input-prefix">Y</span>
                                                        <input type="text" className="sidebar-input" value="80" readOnly />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="sidebar-grid-2">
                                                <div className="sidebar-input-group">
                                                    <span className="sidebar-input-label">Size</span>
                                                    <div className="sidebar-input-wrapper">
                                                        <span className="sidebar-input-prefix">W</span>
                                                        <input type="text" className="sidebar-input" value="640" readOnly />
                                                    </div>
                                                </div>
                                                <div className="sidebar-input-group">
                                                    <span className="sidebar-input-label">&nbsp;</span>
                                                    <div className="sidebar-input-wrapper">
                                                        <span className="sidebar-input-prefix">H</span>
                                                        <input type="text" className="sidebar-input" value="360" readOnly />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="sidebar-right-section" style={{ borderBottom: 'none' }}>
                                            <div className="sidebar-right-section-title">Style</div>
                                            
                                            <div className="sidebar-slider-group">
                                                <div className="sidebar-slider-header">
                                                    <span>Opacity</span>
                                                    <span>100%</span>
                                                </div>
                                                <div className="sidebar-slider-row">
                                                    <input type="range" className="sidebar-slider" value="100" readOnly />
                                                </div>
                                            </div>
                                            
                                            <div className="sidebar-slider-group">
                                                <div className="sidebar-slider-header">
                                                    <span>Feather</span>
                                                    <span>20px</span>
                                                </div>
                                                <div className="sidebar-slider-row">
                                                    <input type="range" className="sidebar-slider" value="20" readOnly />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 2: Generator View */}
                        {activeTab === 'generator' && (
                            <div className="generator-mockup-workspace">
                                <div className="generator-mockup-sidebar">
                                    <div className="generator-mockup-logo">
                                        <strong>FRAME</strong>CUT
                                    </div>
                                    
                                    <div className="generator-mockup-menu-list">
                                        <div className="generator-mockup-menu-item">
                                            <span>🏠</span> Home
                                        </div>
                                        <div className="generator-mockup-menu-item active">
                                            <span>✨</span> Generate
                                        </div>
                                        <div className="generator-mockup-menu-item">
                                            <span>📤</span> Upload
                                        </div>
                                    </div>
                                    
                                    <div className="generator-mockup-section-title">Folders</div>
                                    <div className="generator-mockup-menu-list">
                                        <div className="generator-mockup-menu-item">
                                            <span>📁</span> Brand Assets
                                        </div>
                                        <div className="generator-mockup-menu-item">
                                            <span>📁</span> Spring 2026
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="generator-mockup-main">
                                    <div className="generator-mockup-header">
                                        <h3 className="generator-mockup-title">Generate</h3>
                                    </div>
                                    
                                    <div className="generator-mockup-content">
                                        <div className="generator-images-grid">
                                            <div className="generator-image-card">
                                                <img src="/cozy_bathroom.png" alt="Cozy bathroom AI generated rendering" />
                                            </div>
                                            <div className="generator-image-card">
                                                <img src="/cozy_alcove_sofa.png" alt="Cozy alcove sofa AI generated rendering" />
                                            </div>
                                            <div className="generator-image-card">
                                                <img src="/cozy_reading_nook.png" alt="Cozy reading nook AI generated rendering" />
                                            </div>
                                            <div className="generator-image-card">
                                                <img src="/cozy_bedroom.png" alt="Cozy bedroom AI generated rendering" />
                                            </div>
                                        </div>
                                        
                                        <div className="generator-details-panel">
                                            <div>
                                                <div className="generator-time-badge">1h ago</div>
                                                <div className="generator-prompt-text">Design a cozy living space</div>
                                            </div>
                                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                                                <div className="generator-time-badge">30m ago</div>
                                                <div className="generator-prompt-text">Minimalist warm bathroom</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Horizontal row of features */}
                <div className="hero-features-row">
                    <div className="hero-feature-item">
                        <div className="hero-feature-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                            </svg>
                        </div>
                        <div className="hero-feature-info">
                            <h4>AI-Powered Masking</h4>
                            <p>Smarter pixel thresholds</p>
                        </div>
                    </div>
                    <div className="hero-feature-item">
                        <div className="hero-feature-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m12 3-10 5 10 5 10-5-10-5Z"/>
                                <path d="m2 17 10 5 10-5"/>
                                <path d="m2 12 10 5 10-5"/>
                            </svg>
                        </div>
                        <div className="hero-feature-info">
                            <h4>Utilitarian Workspace</h4>
                            <p>Edit. Soften. Export.</p>
                        </div>
                    </div>
                    <div className="hero-feature-item">
                        <div className="hero-feature-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                            </svg>
                        </div>
                        <div className="hero-feature-info">
                            <h4>Creative Workflows</h4>
                            <p>Collaborative asset sharing</p>
                        </div>
                    </div>
                    <div className="hero-feature-item">
                        <div className="hero-feature-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                <path d="m9 11 2 2 4-4"/>
                            </svg>
                        </div>
                        <div className="hero-feature-info">
                            <h4>Lossless Transparencies</h4>
                            <p>Production-ready alpha PNGs</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trusted By Section */}
            <section className="trusted-by">
                <h2 className="trusted-title">INTEGRATED WITH LEADING CREATIVE TOOLS</h2>
                <div className="brand-logos">
                    <div className="brand-logo-item">
                        <svg width="12" height="18" viewBox="0 0 32 48" fill="none" style={{ marginRight: '8px' }}>
                            <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16H16V0H8Z" fill="#F24E1E"/>
                            <path d="M24 0C19.58 0 16 3.58 16 8V16H24C28.42 16 32 12.42 32 8C32 3.58 28.42 0 24 0Z" fill="#FF7262"/>
                            <path d="M8 16C3.58 16 0 19.58 0 24C0 28.42 3.58 32 8 32H16V16H8Z" fill="#A259FF"/>
                            <path d="M8 32C3.58 32 0 35.58 0 40C0 44.42 3.58 48 8 48C12.42 48 16 44.42 16 40V32H8Z" fill="#1ABC9C"/>
                            <path d="M24 16C19.58 16 16 19.58 16 24V32H24C28.42 32 32 28.42 32 24C32 19.58 28.42 16 24 16Z" fill="#19BCFE"/>
                        </svg>
                        FIGMA
                    </div>
                    <div className="brand-logo-item">
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'linear-gradient(135deg, #00c4cc 0%, #7d2ae8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '8px', fontWeight: '900', marginRight: '8px' }}>C</div>
                        CANVA
                    </div>
                    <div className="brand-logo-item">
                        <svg width="14" height="12" viewBox="0 0 76 65" fill="currentColor" style={{ marginRight: '8px' }}>
                            <path d="M37.5273 0L75.0546 65L0 65L37.5273 0Z" />
                        </svg>
                        VERCEL
                    </div>
                    <div className="brand-logo-item">
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#ea4c89', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '9px', fontWeight: 'bold', marginRight: '8px' }}>D</div>
                        DRIBBBLE
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features" id="features">
                <div className="section-header">
                    <h2 className="section-title">ENGINEERED FOR PERFECT CUTOUTS</h2>
                    <p className="section-subtitle">
                        Every tool you need to isolate layers, smooth boundary contours, and craft premium templates.
                    </p>
                </div>
                
                <div className="features-grid">
                    {/* Big Feature Card (Column 1) */}
                    <div className="feature-card crop-box">
                        <div className="crop-corners-inner"></div>
                        <div className="feature-icon-wrapper">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M4 15V9a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z"/>
                                <circle cx="12" cy="12" r="3"/>
                                <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
                            </svg>
                        </div>
                        <h3 className="feature-title">Contiguous Masking</h3>
                        <p className="feature-desc">
                            Isolate only connected regions of the target color. Perfect for cutting out specific windows in nested layouts without affecting surrounding elements.
                        </p>
                    </div>

                    {/* Stacked Cards (Column 2) */}
                    <div className="features-grid-stack">
                        <div className="feature-card crop-box">
                            <div className="crop-corners-inner"></div>
                            <div className="feature-icon-wrapper">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M12 3a9 9 0 0 1 9 9c0 4.97-4.03 9-9 9s-9-4.03-9-9c0-4.97 4.03-9 9-9Z" strokeDasharray="3 3"/>
                                    <circle cx="12" cy="12" r="6"/>
                                </svg>
                            </div>
                            <h3 className="feature-title">Edge Softness (Feather)</h3>
                            <p className="feature-desc">
                                Uses a high-performance separable box-blur algorithm to anti-alias cutouts, blending borders smoothly instead of leaving jagged color fringes.
                            </p>
                        </div>
                        
                        <div className="feature-card crop-box">
                            <div className="crop-corners-inner"></div>
                            <div className="feature-icon-wrapper">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="m2 22 1-1c.5-.5.5-1.3 0-1.8l-1.1-1.1c-.5-.5-.5-1.3 0-1.8L12.5 5.7M18.3 6.3l-2.6-2.6M22 2l-3.7 3.7-2.6-2.6L12 6.8l7.8 7.8 3.7-3.7-1.5-1.5Z"/>
                                </svg>
                            </div>
                            <h3 className="feature-title">Precision Color Picker</h3>
                            <p className="feature-desc">
                                Equipped with a real-time hover loupe magnifier that acts like a microscope. Select target colors with pixel-perfect accuracy on any display.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Panel Card */}
                <div className="stats-panel-card">
                    <div className="stats-panel-grid crop-box">
                        <div className="crop-corners-inner"></div>
                        <div className="stats-panel-item">
                            <div className="stats-item-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                            </div>
                            <div className="stats-item-number">10M+</div>
                            <div className="stats-item-label">Images Processed</div>
                        </div>
                        <div className="stats-panel-item">
                            <div className="stats-item-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                                    <path d="M2 12h20"/>
                                </svg>
                            </div>
                            <div className="stats-item-number">50K+</div>
                            <div className="stats-item-label">Creators Worldwide</div>
                        </div>
                        <div className="stats-panel-item">
                            <div className="stats-item-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                    <path d="m9 11 2 2 4-4"/>
                                </svg>
                            </div>
                            <div className="stats-item-number">99.9%</div>
                            <div className="stats-item-label">Uptime SLA</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="testimonials" id="testimonials">
                <div className="section-header">
                    <h2 className="section-title">ENDORSED BY DESIGNERS</h2>
                    <p className="section-subtitle">See why creators around the globe trust FrameCut with their creative assets.</p>
                </div>
                <div className="testimonials-grid">
                    <div className="testimonial-card crop-box">
                        <div className="crop-corners-inner"></div>
                        <div className="testimonial-rating">
                            <div className="rating-stars">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                    </svg>
                                ))}
                            </div>
                            <span className="rating-score">4.9/5</span>
                        </div>
                        <p className="testimonial-text">
                            "FrameCut saves me hours every week. The background removal is insanely accurate."
                        </p>
                        <div className="testimonial-user">
                            <div className="user-avatar" style={{ backgroundColor: 'var(--accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '11px' }}>
                                SJ
                            </div>
                            <div>
                                <h4 className="user-name">Sarah Johnson</h4>
                                <p className="user-role">Creative Director</p>
                            </div>
                        </div>
                    </div>
                    <div className="testimonial-card crop-box">
                        <div className="crop-corners-inner"></div>
                        <div className="testimonial-rating">
                            <div className="rating-stars">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                    </svg>
                                ))}
                            </div>
                            <span className="rating-score">4.9/5</span>
                        </div>
                        <p className="testimonial-text">
                            "The edge softness tool is a game changer. My product photos have never looked better."
                        </p>
                        <div className="testimonial-user">
                            <div className="user-avatar" style={{ backgroundColor: 'var(--accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '11px' }}>
                                MC
                            </div>
                            <div>
                                <h4 className="user-name">Mike Chen</h4>
                                <p className="user-role">Product Designer</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-banner">
                <div className="cta-box crop-box">
                    <div className="crop-corners-inner"></div>
                    <h2 className="cta-title">Isolate your layers today</h2>
                    <p className="cta-desc">
                        Cut transparent frames, refine edge tolerances, and export high-fidelity production-ready assets instantly.
                    </p>
                    <Link href="/editor" className="btn btn-primary">Open Editor Workspace</Link>
                </div>
            </section>

            {/* Footer Section */}
            <footer className="footer">
                <div className="footer-container">
                    <div className="footer-brand">
                        <Link href="/" className="logo-container">
                            <span className="logo-brand">
                                <strong className="logo-strong">FRAME</strong>
                                <span className="logo-light">CUT</span>
                            </span>
                        </Link>
                        <p className="footer-desc">Cutting-edge background removal for digital creators and templates.</p>
                    </div>
                    <p className="footer-copyright">© 2026 FrameCut. Engineered by Gammaura.</p>
                </div>
            </footer>
        </div>
    );
}
