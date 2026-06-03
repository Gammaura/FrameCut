'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import '../editor.css';

export default function Page() {
    const { user, logout, setShowAuthModal, usageCount } = useAuth();
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const router = useRouter();

    const tools = [
        {
            id: 'bg-remover',
            name: 'Background Remover',
            desc: 'Extract subjects and transparentize image backgrounds instantly.',
            icon: '✂️',
            badge: 'Popular',
            category: 'Image',
            color: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)'
        },
        {
            id: 'upscaler',
            name: 'AI Image Upscaler',
            desc: 'Super-resolve image limits using smart sub-pixel bilinear scaling.',
            icon: '✨',
            badge: 'AI',
            category: 'Image',
            color: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)'
        },
        {
            id: 'video-remover',
            name: 'Video BG Remover',
            desc: 'Extract subjects from video frames using real-time chroma subtraction keyer.',
            icon: '📹',
            badge: 'Beta',
            category: 'Video',
            color: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)'
        },
        {
            id: 'change-bg',
            name: 'Change Background',
            desc: 'Replace backgrounds with custom colors, gradients, or studio backdrops.',
            icon: '🖼️',
            badge: null,
            category: 'Image',
            color: 'linear-gradient(135deg, #34d399 0%, #059669 100%)'
        },
        {
            id: 'magic-eraser',
            name: 'Magic Eraser',
            desc: 'Inpaint and erase unwanted objects or defects from your images.',
            icon: '🧽',
            badge: 'Popular',
            category: 'Image',
            color: 'linear-gradient(135deg, #f472b6 0%, #db2777 100%)'
        },
        {
            id: 'ai-generator',
            name: 'AI Image Generator',
            desc: 'Generate beautiful images from natural language text prompts.',
            icon: '🎨',
            badge: 'AI',
            category: 'Generation',
            color: 'linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)'
        },
        {
            id: 'ai-video',
            name: 'AI Video Generator',
            desc: 'Synthesize moving cinematic graphics from text descriptions.',
            icon: '🎬',
            badge: 'AI',
            category: 'Generation',
            color: 'linear-gradient(135deg, #f472b6 0%, #a78bfa 100%)'
        },
        {
            id: 'generative-fill',
            name: 'Generative Fill',
            desc: 'AI-expand or replace selected regions of your image using text prompts.',
            icon: '🪄',
            badge: 'AI',
            category: 'Generation',
            color: 'linear-gradient(135deg, #06b6d4 0%, #a78bfa 100%)'
        },
        {
            id: 'uncrop',
            name: 'Uncrop (AI Expand)',
            desc: 'Outpaint and expand image margins beyond their original borders.',
            icon: '📐',
            badge: 'AI',
            category: 'Image',
            color: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
        },
        {
            id: 'ai-ads',
            name: 'AI Ads Creator',
            desc: 'Convert product frames into high-converting social media banner ads.',
            icon: '📈',
            badge: null,
            category: 'Image',
            color: 'linear-gradient(135deg, #10b981 0%, #047857 100%)'
        },
        {
            id: 'bulk-editor',
            name: 'Bulk Editor',
            desc: 'Batch-process multiple images and remove backgrounds all at once.',
            icon: '📦',
            badge: 'Speed',
            category: 'Image',
            color: 'linear-gradient(135deg, #6b7280 0%, #374151 100%)'
        },
        {
            id: 'adjustments',
            name: 'Adjustments',
            desc: 'Fine-tune brightness, contrast, saturation, and blur filters.',
            icon: '🎛️',
            badge: null,
            category: 'Image',
            color: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
        },
        {
            id: 'text-overlay',
            name: 'Text & Overlays',
            desc: 'Add and format stylized text overlays on your layouts.',
            icon: '✍️',
            badge: null,
            category: 'Image',
            color: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)'
        },
        {
            id: 'crop-rotate',
            name: 'Rotate & Crop',
            desc: 'Rotate, flip, and crop images to fit specific aspect ratios.',
            icon: '🔄',
            badge: null,
            category: 'Image',
            color: 'linear-gradient(135deg, #94a3b8 0%, #475569 100%)'
        },
        {
            id: 'brush-draw',
            name: 'Doodle Brush',
            desc: 'Draw and sketch on your images with customizable brush sizes and colors.',
            icon: '🖌️',
            badge: null,
            category: 'Image',
            color: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)'
        }
    ];

    const categories = ['All', 'Image', 'Video', 'Generation'];

    const filteredTools = selectedCategory === 'All' 
        ? tools 
        : tools.filter(t => t.category === selectedCategory);

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* TOP HEADER */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100 }}>
                <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                    <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', fontSize: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                        <strong style={{ fontWeight: '900', color: '#475569' }}>FRAME</strong>
                        <span style={{ fontWeight: '300', color: '#94a3b8' }}>CUT</span>
                    </span>
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {user ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f1f5f9', padding: '6px 16px', borderRadius: '99px', fontSize: '13px' }}>
                                <span style={{ fontWeight: '600', color: '#475569' }}>Tier: <strong style={{ color: '#7c3aed' }}>{user.tier.toUpperCase()}</strong></span>
                                <span style={{ color: '#cbd5e1' }}>|</span>
                                <span style={{ color: '#64748b' }}>Exports: <strong>{usageCount}/5</strong></span>
                            </div>

                            {user.tier === 'free' && (
                                <Link href="/pricing" style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: '#fff', border: 'none', borderRadius: '99px', fontSize: '13px', fontWeight: '700', textDecoration: 'none', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.15)' }}>
                                    Upgrade Pro
                                </Link>
                            )}

                            <div className="profile-dropdown-container" style={{ position: 'relative' }}>
                                <button 
                                    onClick={() => setShowProfileDropdown(!showProfileDropdown)} 
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                                >
                                    {user.picture && user.picture.startsWith('http') ? (
                                        <img 
                                            src={user.picture} 
                                            alt={user.name || 'User'} 
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23a78bfa'><circle cx='12' cy='8' r='4'/><path d='M2 20c0-4.4 3.6-8 8-8h4c4.4 0 8 3.6 8 8v2H2v-2z'/></svg>";
                                            }}
                                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }} 
                                        />
                                    ) : (
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px', border: '1px solid #e2e8f0' }}>
                                            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </button>
                                {showProfileDropdown && (
                                    <div className="profile-dropdown-menu" style={{ position: 'absolute', right: 0, top: '44px', width: '220px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '12px', zIndex: 1000, textAlign: 'left' }}>
                                        <div style={{ padding: '4px 8px 8px 8px', borderBottom: '1px solid #e2e8f0', marginBottom: '8px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || user.email.split('@')[0]}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                                        </div>
                                        <Link href="/" style={{ display: 'block', padding: '8px', fontSize: '13px', color: '#475569', textDecoration: 'none', borderRadius: '6px' }} className="dropdown-item-hover">
                                            Home Landing Page
                                        </Link>
                                        <Link href="/pricing" style={{ display: 'block', padding: '8px', fontSize: '13px', color: '#475569', textDecoration: 'none', borderRadius: '6px' }} className="dropdown-item-hover">
                                            Upgrade & Pricing
                                        </Link>
                                        <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '8px', paddingTop: '8px' }}>
                                            <button 
                                                onClick={() => { logout(); setShowProfileDropdown(false); }} 
                                                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px', fontSize: '13px', color: '#ef4444', cursor: 'pointer', borderRadius: '6px' }}
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
                        <button 
                            onClick={() => setShowAuthModal(true)} 
                            style={{ padding: '8px 20px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '99px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                        >
                            Sign In
                        </button>
                    )}
                </div>
            </header>

            {/* DASHBOARD HERO */}
            <main style={{ flex: 1, padding: '48px 32px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#0f172a', marginBottom: '12px', letterSpacing: '-0.02em' }}>
                        Welcome to <span style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FrameCut Studio</span>
                    </h1>
                    <p style={{ fontSize: '16px', color: '#475569', maxWidth: '600px', margin: '0 auto 32px auto', lineHeight: '1.6' }}>
                        Select a specialized creative tool below to begin processing your image or video frames.
                    </p>

                    {/* CATEGORY FILTERS */}
                    <div style={{ display: 'inline-flex', gap: '8px', background: '#f1f5f9', padding: '6px', borderRadius: '99px', border: '1px solid #e2e8f0' }}>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                style={{
                                    border: 'none',
                                    padding: '8px 20px',
                                    borderRadius: '99px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    background: selectedCategory === cat ? '#fff' : 'transparent',
                                    color: selectedCategory === cat ? '#0f172a' : '#64748b',
                                    boxShadow: selectedCategory === cat ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {cat === 'All' ? '🎨 All Tools' : cat === 'Image' ? '🖼️ Image Editing' : cat === 'Video' ? '📹 Video Editing' : '✨ AI Generation'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* TOOLS GRID */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                    {filteredTools.map(tool => (
                        <div 
                            key={tool.id}
                            onClick={() => router.push(`/editor/${tool.id}`)}
                            className="dashboard-card"
                            style={{
                                background: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '16px',
                                padding: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: tool.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                                    {tool.icon}
                                </div>
                                {tool.badge && (
                                    <span style={{ 
                                        fontSize: '11px', 
                                        fontWeight: '700', 
                                        background: tool.badge === 'AI' ? '#e0f2fe' : tool.badge === 'Popular' ? '#fce7f3' : '#fef3c7', 
                                        color: tool.badge === 'AI' ? '#0369a1' : tool.badge === 'Popular' ? '#be185d' : '#b45309',
                                        padding: '4px 10px',
                                        borderRadius: '99px',
                                        textTransform: 'uppercase'
                                    }}>
                                        {tool.badge}
                                    </span>
                                )}
                            </div>
                            
                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>{tool.name}</h3>
                            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6', flex: 1 }}>{tool.desc}</p>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px', fontSize: '13px', fontWeight: '700', color: '#7c3aed' }}>
                                Launch Tool <span>➔</span>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* STYLES */}
            <style jsx global>{`
                .dashboard-card:hover {
                    transform: translateY(-5px);
                    border-color: #cbd5e1 !important;
                    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.04) !important;
                }
                .dropdown-item-hover:hover {
                    background: #f1f5f9 !important;
                }
            `}</style>
        </div>
    );
}
