'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import '../landing.css';

export default function Pricing() {
    const { user, logout, setShowAuthModal, setShowUpgradeModal, setAuthMode } = useAuth();
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
    const [activeFaq, setActiveFaq] = useState(null);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);

    const toggleFaq = (index) => {
        setActiveFaq(activeFaq === index ? null : index);
    };

    const handleSelectPlan = (planName) => {
        if (!user) {
            setAuthMode('signup');
            setShowAuthModal(true);
            return;
        }
        if (planName === 'Starter') return;
        setShowUpgradeModal(true);
    };

    const plans = [
        {
            name: "Starter",
            price: { monthly: 0, yearly: 0 },
            desc: "Perfect for casual creators and beginners looking to explore frame editing.",
            features: [
                "Up to 5 exports per day",
                "Standard background detection",
                "Contiguous masking mode",
                "Maximum 2K resolution exports",
                "Community support"
            ],
            cta: "Get Started",
            featured: false
        },
        {
            name: "Pro",
            price: { monthly: 9.99, yearly: 7.99 },
            desc: "For professional designers and creators who need fast, unlimited exports.",
            features: [
                "Unlimited exports",
                "High-performance edge softening",
                "Non-contiguous color selection",
                "Up to 8K resolution exports",
                "Prioritized rendering speed",
                "Commercial use license",
                "Priority email support"
            ],
            cta: "Upgrade to Pro",
            featured: true
        },
        {
            name: "Team",
            price: { monthly: 29.99, yearly: 23.99 },
            desc: "Collaboration tools and high-scale API access for studios and teams.",
            features: [
                "Everything in Pro",
                "Up to 5 team members",
                "Shared assets library",
                "Dedicated API access token",
                "Advanced batch processing API",
                "24/7 dedicated support"
            ],
            cta: "Contact Sales",
            featured: false
        }
    ];

    const faqs = [
        {
            q: "How does the background detection algorithm work?",
            a: "FrameCut uses low-level squared Euclidean distance heuristics to instantly isolate solid color slots. In contiguous mode, it uses flood-fill to only remove matching color components connected to your selection."
        },
        {
            q: "Can I cancel my subscription at any time?",
            a: "Yes! There are no long-term contracts. You can cancel your subscription from your account billing settings at any time, and you will retain access to your plan until the end of your billing cycle."
        },
        {
            q: "What image formats are supported?",
            a: "We fully support PNG images (including transparent ones) as input. Transformed frames are always exported back in high-quality PNG formats to preserve alpha transparency channels."
        },
        {
            q: "Do you offer developer API keys?",
            a: "Yes, our Team plan includes complete API access with dedicated authentication keys and custom endpoint limits to integrate background removal into your own workflows."
        }
    ];

    return (
        <div className="landing-page-root">
            {/* Background glow objects */}
            <div className="landing-bg">
                <div className="glow glow-1"></div>
                <div className="glow glow-2"></div>
            </div>

            {/* Header */}
            <header className="navbar">
                <div className="nav-container">
                    <Link href="/" className="logo-container">
                        <span className="logo-brand">
                            <strong className="logo-strong">FRAME</strong>
                            <span className="logo-light">CUT</span>
                        </span>
                    </Link>
                    <nav className="nav-links">
                        <Link href="/#features" className="nav-link">Features</Link>
                        <Link href="/#testimonials" className="nav-link">Reviews</Link>
                        <Link href="/pricing" className="nav-link active">Pricing</Link>
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
                            <button className="nav-link" onClick={() => { setAuthMode('login'); setShowAuthModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Sign In</button>
                            <button className="btn btn-primary" onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}>Sign Up</button>
                        </div>
                    )}
                </div>
            </header>

            {/* Pricing Section */}
            <section className="pricing-section">
                <div className="hero-badge">Transparent Pricing</div>
                <h1 className="hero-title">
                    Choose the plan that fits <br /><span>your design workflow</span>
                </h1>
                <p className="hero-subtitle">
                    Unlock unlimited rendering speeds, advanced masking control, and complete API integration.
                </p>

                <div className="toggle-container">
                    <button 
                        className={`toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
                        onClick={() => setBillingCycle('monthly')}
                    >
                        Monthly
                    </button>
                    <button 
                        className={`toggle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
                        onClick={() => setBillingCycle('yearly')}
                    >
                        Yearly (Save 20%)
                    </button>
                </div>

                <div className="pricing-grid">
                    {plans.map((plan, i) => {
                        const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
                        return (
                            <div key={i} className={`pricing-card crop-box ${plan.featured ? 'featured' : ''}`}>
                                <div className="crop-corners-inner"></div>
                                {plan.featured && <div className="pricing-badge">Popular</div>}
                                <div>
                                    <div className="pricing-tier">{plan.name}</div>
                                    <div className="pricing-price">
                                        ${price}
                                        <span>/ {billingCycle === 'monthly' ? 'mo' : 'mo (billed annually)'}</span>
                                    </div>
                                    <p className="pricing-desc">{plan.desc}</p>
                                    <ul className="pricing-features">
                                        {plan.features.map((feat, fi) => (
                                            <li key={fi} className="pricing-feature">
                                                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                                {feat}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <button 
                                    onClick={() => handleSelectPlan(plan.name)}
                                    className={`btn ${plan.featured ? 'btn-primary' : 'btn-glass'}`}
                                    style={{ width: '100%', textAlign: 'center' }}
                                    disabled={user?.tier === plan.name.toLowerCase() || (plan.name === 'Starter' && !user)}
                                >
                                    {user?.tier === plan.name.toLowerCase() ? 'Active Plan' : plan.cta}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* FAQ Section */}
            <section className="faq-section">
                <h2 className="faq-title">Frequently Asked Questions</h2>
                <div className="faq-grid">
                    {faqs.map((faq, i) => (
                        <div key={i} className="faq-item crop-box" onClick={() => toggleFaq(i)} style={{ cursor: 'pointer' }}>
                            <div className="crop-corners-inner"></div>
                            <div className="faq-question">
                                <span>{faq.q}</span>
                                <svg 
                                    width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                                    style={{ transform: activeFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                                >
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </div>
                            {activeFaq === i && (
                                <div className="faq-answer">
                                    {faq.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
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
                    <div className="footer-links">
                        <div className="footer-group">
                            <h4 className="footer-heading">Product</h4>
                            <Link href="/editor" className="footer-link-item">Frame Editor</Link>
                            <Link href="/pricing" className="footer-link-item">Pricing Plans</Link>
                            <Link href="/api" className="footer-link-item">API Docs</Link>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <span className="footer-copyright">© {new Date().getFullYear()} FrameCut. All rights reserved.</span>
                </div>
            </footer>
        </div>
    );
}
