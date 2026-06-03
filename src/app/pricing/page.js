'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import '../landing.css';

export default function Pricing() {
    const { user, logout, setShowAuthModal, setShowUpgradeModal, setAuthMode } = useAuth();
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
    const [activeFaq, setActiveFaq] = useState(null);

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
            {/* Header */}
            <header className="navbar">
                <div className="nav-container">
                    <Link href="/" className="logo">
                        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                            <rect x="2" y="2" width="28" height="28" rx="6" stroke="url(#navLogo)" strokeWidth="2.5" fill="none"/>
                            <rect x="7" y="7" width="8" height="8" rx="2" fill="url(#navLogo)" opacity="0.6"/>
                            <rect x="17" y="17" width="8" height="8" rx="2" fill="url(#navLogo)" opacity="0.6"/>
                            <defs>
                                <linearGradient id="navLogo" x1="0" y1="0" x2="32" y2="32">
                                    <stop offset="0%" stopColor="#a78bfa"/>
                                    <stop offset="100%" stopColor="#06b6d4"/>
                                </linearGradient>
                            </defs>
                        </svg>
                        <span className="logo-text">FrameCut</span>
                    </Link>
                    <nav className="nav-links">
                        <Link href="/#features" className="nav-link">Features</Link>
                        <Link href="/#testimonials" className="nav-link">Reviews</Link>
                        <Link href="/pricing" className="nav-link active">Pricing</Link>
                        <Link href="/api" className="nav-link">API</Link>
                    </nav>
                    {user ? (
                        <div className="nav-auth-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span className="user-badge" style={{ fontSize: '13px', background: 'rgba(9, 9, 11, 0.05)', border: '1px solid var(--panel-border)', padding: '6px 12px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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

            {/* Pricing Section */}
            <section className="pricing-section">
                <div className="hero-badge">Transparent Pricing</div>
                <h1 className="hero-title" style={{ fontSize: '48px', marginBottom: '24px' }}>
                    Choose the plan that fits <br /><span>your design workflow</span>
                </h1>
                <p className="hero-subtitle" style={{ marginBottom: '40px' }}>
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
                            <div key={i} className={`pricing-card ${plan.featured ? 'featured' : ''}`}>
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
                                    style={{ width: '100%', textAlign: 'center', border: 'none' }}
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
                        <div key={i} className="faq-item" onClick={() => toggleFaq(i)} style={{ cursor: 'pointer' }}>
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
                        <Link href="/" className="logo">
                            <span className="logo-text">FrameCut</span>
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
