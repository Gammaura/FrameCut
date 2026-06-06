'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Modals() {
    const {
        user,
        showAuthModal,
        setShowAuthModal,
        showUpgradeModal,
        setShowUpgradeModal,
        upgradeTargetPlan,
        upgradeBillingCycle,
        authMode,
        setAuthMode,
        googleClientId,
        loginWithGoogle,
        upgradePlan
    } = useAuth();

    // Real Google Auth Config State
    const [showGoogleConfig, setShowGoogleConfig] = useState(false);
    const [clientIdVal, setClientIdVal] = useState('');

    // Payment Form State
    const [selectedTier, setSelectedTier] = useState('pro'); // 'pro' | 'team'
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('idle'); // 'idle' | 'processing' | 'success'
    const [currency, setCurrency] = useState('USD'); // 'USD' | 'IDR'
    const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'qris'
    const [qrisTimer, setQrisTimer] = useState(300); // 5 minutes (300 seconds)

    // Pricing data map
    const prices = {
        pro: { USD: { monthly: 9.99, yearly: 7.99 }, IDR: { monthly: 150000, yearly: 120000 } },
        team: { USD: { monthly: 29.99, yearly: 23.99 }, IDR: { monthly: 450000, yearly: 360000 } }
    };

    const getCurrentPrice = () => {
        return prices[selectedTier]?.[currency]?.[billingCycle] || 0;
    };

    const formatPrice = (amount) => {
        if (currency === 'USD') return `$${amount}`;
        return `Rp ${amount.toLocaleString('id-ID')}`;
    };

    // Reset payment states when modal opens and sync from context
    useEffect(() => {
        if (showUpgradeModal) {
            setPaymentStatus('idle');
            setCardNumber('');
            setExpiry('');
            setCvc('');
            setSelectedTier(upgradeTargetPlan || 'pro');
            setBillingCycle(upgradeBillingCycle || 'monthly');
            
            // Sync currency selection from localStorage if set
            const preferred = typeof window !== 'undefined' ? (localStorage.getItem('framecut_preferred_currency') || 'USD') : 'USD';
            setCurrency(preferred);
            setPaymentMethod(preferred === 'IDR' ? 'qris' : 'card');
            setQrisTimer(300);
        }
    }, [showUpgradeModal, upgradeTargetPlan, upgradeBillingCycle]);

    // QRIS Timer effect
    useEffect(() => {
        let timer;
        if (showUpgradeModal && paymentMethod === 'qris' && paymentStatus === 'idle') {
            timer = setInterval(() => {
                setQrisTimer(prev => (prev > 0 ? prev - 1 : 300));
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [showUpgradeModal, paymentMethod, paymentStatus]);

    const formatTime = (secs) => {
        const mins = Math.floor(secs / 60);
        const s = secs % 60;
        return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Reset Google auth states when modal closes or opens
    useEffect(() => {
        if (!showAuthModal) {
            setShowGoogleConfig(false);
            setClientIdVal('');
        } else {
            setClientIdVal(googleClientId);
        }
    }, [showAuthModal, googleClientId]);



    const handleGoogleAuthClick = () => {
        if (googleClientId) {
            loginWithGoogle(googleClientId);
        } else {
            setShowGoogleConfig(true);
        }
    };

    const handleSaveAndLoginGoogle = (e) => {
        e.preventDefault();
        if (!clientIdVal) return;
        loginWithGoogle(clientIdVal);
    };

    const handlePaymentSubmit = (e) => {
        e.preventDefault();
        setPaymentStatus('processing');
        
        // Simulate secure merchant gateway delay
        setTimeout(() => {
            setPaymentStatus('success');
            setTimeout(() => {
                upgradePlan(selectedTier);
            }, 1800);
        }, 1500);
    };

    if (!showAuthModal && !showUpgradeModal) return null;

    return (
        <>
            {/* Auth Modal */}
            {showAuthModal && (
                <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setShowAuthModal(false)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                        
                        {showGoogleConfig ? (
                            <>
                                <div className="modal-header">
                                    <svg width="24" height="24" viewBox="0 0 24 24" style={{ marginBottom: '12px' }}>
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                                    </svg>
                                    <h3 className="modal-title" style={{ background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-color)' }}>Configure Google OAuth</h3>
                                    <p className="modal-subtitle">Paste your Google Developer Client ID to perform authentic login redirects.</p>
                                </div>
                                <form onSubmit={handleSaveAndLoginGoogle}>
                                    <div className="form-group">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <label className="form-label" style={{ margin: 0 }}>Google Client ID</label>
                                            <a 
                                                href="https://console.cloud.google.com/apis/credentials" 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                style={{ fontSize: '11px', color: '#06b6d4', textDecoration: 'none', fontWeight: '600' }}
                                            >
                                                Get ID
                                            </a>
                                        </div>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            placeholder="xxxxxx-xxxxxx.apps.googleusercontent.com"
                                            value={clientIdVal}
                                            onChange={(e) => setClientIdVal(e.target.value)}
                                            required 
                                        />
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.4' }}>
                                            ⚠️ Ensure <strong>{typeof window !== 'undefined' ? window.location.origin : 'your site origin'}</strong> is registered in your Google Console under <em>Authorized JavaScript Origins</em> and <em>Redirect URIs</em>.
                                        </p>
                                    </div>
                                    <button type="submit" className="modal-submit" style={{ marginTop: '12px' }}>
                                        Save & Redirect to Google
                                    </button>
                                </form>
                                <div className="modal-toggle-text">
                                    <button className="modal-toggle-btn" onClick={() => setShowGoogleConfig(false)} style={{ marginLeft: 0 }}>
                                        Back
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="modal-header">
                                    <h3 className="modal-title">
                                        {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                                    </h3>
                                    <p className="modal-subtitle">
                                        {authMode === 'login' 
                                            ? 'Log in to access your dashboard and templates.' 
                                            : 'Register to claim 20 free tokens instantly.'}
                                    </p>
                                </div>

                                <button className="btn-google" type="button" onClick={handleGoogleAuthClick}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '2px' }}>
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                                    </svg>
                                    Continue with Google
                                </button>

                                {googleClientId && (
                                    <div style={{ textAlign: 'center', marginTop: '-12px', marginBottom: '16px' }}>
                                        <button 
                                            onClick={() => setShowGoogleConfig(true)}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                                        >
                                            Change OAuth Client ID
                                        </button>
                                    </div>
                                )}

                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.5', marginTop: '8px' }}>
                                    New accounts automatically receive <strong style={{ color: 'var(--accent-purple, #7c3aed)' }}>20 free tokens</strong>.
                                </p>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Upgrade / Checkout Modal */}
            {showUpgradeModal && (
                <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setShowUpgradeModal(false)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>

                        {paymentStatus === 'success' ? (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <div className="payment-success-icon">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                                <h3 className="modal-title" style={{ color: '#22c55e', background: 'none', WebkitTextFillColor: 'initial', color: '#22c55e' }}>
                                    Payment Successful!
                                </h3>
                                <p className="modal-subtitle">
                                    Upgrading your account status to <strong>{selectedTier.toUpperCase()}</strong> plan...
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="modal-header">
                                    <h3 className="modal-title">Upgrade Plan</h3>
                                    <p className="modal-subtitle">Get high-volume token credits and unlock developer API access.</p>
                                </div>

                                <form onSubmit={(e) => { e.preventDefault(); handlePaymentSubmit(); }}>
                                    {/* Billing Cycle Toggle */}
                                    <div style={{ display: 'flex', gap: '4px', padding: '3px', background: '#f4f4f5', borderRadius: '10px', marginBottom: '16px' }}>
                                        <button 
                                            type="button" 
                                            onClick={() => setBillingCycle('monthly')}
                                            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', background: billingCycle === 'monthly' ? '#09090b' : 'transparent', color: billingCycle === 'monthly' ? '#fff' : '#71717a', transition: 'all 0.2s' }}
                                        >
                                            Monthly
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setBillingCycle('yearly')}
                                            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', background: billingCycle === 'yearly' ? '#09090b' : 'transparent', color: billingCycle === 'yearly' ? '#fff' : '#71717a', transition: 'all 0.2s' }}
                                        >
                                            Yearly (Save 20%)
                                        </button>
                                    </div>

                                    {/* Plan Cards */}
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                        <div 
                                            onClick={() => setSelectedTier('pro')}
                                            style={{ flex: 1, padding: '14px 16px', border: selectedTier === 'pro' ? '2px solid #2563eb' : '1px solid #e4e4e7', borderRadius: '12px', cursor: 'pointer', background: selectedTier === 'pro' ? 'rgba(37, 99, 235, 0.04)' : '#fff', transition: 'all 0.2s' }}
                                        >
                                            <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>Pro</div>
                                            <div style={{ fontWeight: '800', color: '#2563eb', fontSize: '15px' }}>
                                                {formatPrice(prices.pro[currency][billingCycle])}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>/ {billingCycle === 'monthly' ? 'month' : 'mo, billed yearly'}</div>
                                        </div>
                                        <div 
                                            onClick={() => setSelectedTier('team')}
                                            style={{ flex: 1, padding: '14px 16px', border: selectedTier === 'team' ? '2px solid #2563eb' : '1px solid #e4e4e7', borderRadius: '12px', cursor: 'pointer', background: selectedTier === 'team' ? 'rgba(37, 99, 235, 0.04)' : '#fff', transition: 'all 0.2s' }}
                                        >
                                            <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>Team</div>
                                            <div style={{ fontWeight: '800', color: '#2563eb', fontSize: '15px' }}>
                                                {formatPrice(prices.team[currency][billingCycle])}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>/ {billingCycle === 'monthly' ? 'month' : 'mo, billed yearly'}</div>
                                        </div>
                                    </div>

                                    {/* Currency + Payment Method Row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                        <div>
                                            <label className="form-label">Currency</label>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button 
                                                    type="button" 
                                                    style={{ flex: 1, padding: '8px', border: currency === 'USD' ? '1px solid #09090b' : '1px solid #e4e4e7', background: currency === 'USD' ? '#09090b' : '#fff', color: currency === 'USD' ? '#fff' : '#71717a', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}
                                                    onClick={() => { setCurrency('USD'); localStorage.setItem('framecut_preferred_currency', 'USD'); }}
                                                >
                                                    USD ($)
                                                </button>
                                                <button 
                                                    type="button" 
                                                    style={{ flex: 1, padding: '8px', border: currency === 'IDR' ? '1px solid #09090b' : '1px solid #e4e4e7', background: currency === 'IDR' ? '#09090b' : '#fff', color: currency === 'IDR' ? '#fff' : '#71717a', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}
                                                    onClick={() => { setCurrency('IDR'); localStorage.setItem('framecut_preferred_currency', 'IDR'); setPaymentMethod('qris'); }}
                                                >
                                                    IDR (Rp)
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="form-label">Payment Method</label>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button 
                                                    type="button" 
                                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px', border: paymentMethod === 'card' ? '1px solid #09090b' : '1px solid #e4e4e7', background: paymentMethod === 'card' ? '#09090b' : '#fff', color: paymentMethod === 'card' ? '#fff' : '#71717a', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '11px' }}
                                                    onClick={() => setPaymentMethod('card')}
                                                >
                                                    💳 Card
                                                </button>
                                                <button 
                                                    type="button" 
                                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px', border: paymentMethod === 'qris' ? '1px solid #09090b' : '1px solid #e4e4e7', background: paymentMethod === 'qris' ? '#09090b' : '#fff', color: paymentMethod === 'qris' ? '#fff' : '#71717a', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '11px' }}
                                                    onClick={() => setPaymentMethod('qris')}
                                                >
                                                    📱 QRIS
                                                </button>
                                            </div>
                                        </div>
                                    </div>


                                    {paymentMethod === 'card' ? (
                                        <>
                                            <div className="form-group" style={{ marginBottom: '12px' }}>
                                                <label className="form-label">Card Number</label>
                                                <input 
                                                    type="text" 
                                                    className="form-input" 
                                                    placeholder="4111 2222 3333 4444"
                                                    value={cardNumber}
                                                    onChange={(e) => setCardNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                                    maxLength={16}
                                                    required 
                                                />
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                                <div className="form-group" style={{ margin: 0 }}>
                                                    <label className="form-label">Expiration (MM/YY)</label>
                                                    <input 
                                                        type="text" 
                                                        className="form-input" 
                                                        placeholder="12/28"
                                                        value={expiry}
                                                        onChange={(e) => setExpiry(e.target.value)}
                                                        maxLength={5}
                                                        required 
                                                    />
                                                </div>
                                                <div className="form-group" style={{ margin: 0 }}>
                                                    <label className="form-label">CVC</label>
                                                    <input 
                                                        type="password" 
                                                        className="form-input" 
                                                        placeholder="123"
                                                        value={cvc}
                                                        onChange={(e) => setCvc(e.target.value.replace(/[^0-9]/g, ''))}
                                                        maxLength={3}
                                                        required 
                                                    />
                                                </div>
                                            </div>

                                            <button 
                                                type="submit" 
                                                className="modal-submit" 
                                                style={{ marginTop: '8px' }}
                                                disabled={paymentStatus === 'processing'}
                                            >
                                                {paymentStatus === 'processing' 
                                                    ? 'Processing Payment...' 
                                                    : `Pay ${formatPrice(getCurrentPrice())}${billingCycle === 'yearly' ? '/mo' : ''}`}
                                            </button>
                                        </>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', border: '1px dashed var(--border-subtle)', borderRadius: '16px', background: '#fafafa', margin: '12px 0' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                                <span>SCAN QRIS CODE</span>
                                                <span style={{ fontWeight: '700', color: '#ef4444' }}>⏳ Expires in: {formatTime(qrisTimer)}</span>
                                            </div>

                                            <svg width="150" height="150" viewBox="0 0 100 100" style={{ background: '#fff', padding: '8px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '12px' }}>
                                                <rect x="5" y="5" width="20" height="20" fill="#09090b" />
                                                <rect x="10" y="10" width="10" height="10" fill="#fff" />
                                                <rect x="75" y="5" width="20" height="20" fill="#09090b" />
                                                <rect x="80" y="10" width="10" height="10" fill="#fff" />
                                                <rect x="5" y="75" width="20" height="20" fill="#09090b" />
                                                <rect x="10" y="80" width="10" height="10" fill="#fff" />
                                                <rect x="35" y="5" width="5" height="5" fill="#09090b" />
                                                <rect x="45" y="15" width="10" height="5" fill="#09090b" />
                                                <rect x="60" y="10" width="5" height="10" fill="#09090b" />
                                                <rect x="5" y="35" width="10" height="5" fill="#09090b" />
                                                <rect x="20" y="45" width="5" height="10" fill="#09090b" />
                                                <rect x="75" y="35" width="5" height="10" fill="#09090b" />
                                                <rect x="35" y="35" width="30" height="30" fill="#09090b" opacity="0.85" />
                                                <rect x="40" y="40" width="20" height="20" fill="#fff" />
                                                <g transform="translate(39, 46)">
                                                    <rect x="0" y="0" width="22" height="9" rx="2" fill="#2563eb" />
                                                    <text x="11" y="6.5" fill="#fff" fontSize="4.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">QRIS</text>
                                                </g>
                                            </svg>

                                            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                                                <div style={{ fontWeight: '800', fontSize: '16px', color: '#09090b' }}>
                                                    {formatPrice(getCurrentPrice())}{billingCycle === 'yearly' ? ' /mo' : ''}
                                                </div>
                                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                                                    Scan with GoPay, OVO, Dana, LinkAja, ShopeePay, or Mobile Banking.
                                                </p>
                                            </div>

                                            <button 
                                                type="button" 
                                                className="modal-submit" 
                                                onClick={() => handlePaymentSubmit()}
                                                disabled={paymentStatus === 'processing'}
                                                style={{ width: '100%' }}
                                            >
                                                {paymentStatus === 'processing' ? 'Verifying Transaction...' : 'I Have Paid'}
                                            </button>
                                        </div>
                                    )}
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
