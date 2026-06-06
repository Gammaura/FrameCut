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
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('idle'); // 'idle' | 'processing' | 'success'

    // Reset payment states when modal opens
    useEffect(() => {
        if (showUpgradeModal) {
            setPaymentStatus('idle');
            setCardNumber('');
            setExpiry('');
            setCvc('');
        }
    }, [showUpgradeModal]);

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

                                <form onSubmit={handlePaymentSubmit}>
                                    <label className="form-label">Select Plan</label>
                                    <div className="upgrade-plan-selector">
                                        <div 
                                            className={`upgrade-plan-card ${selectedTier === 'pro' ? 'active' : ''}`}
                                            onClick={() => setSelectedTier('pro')}
                                        >
                                            <div className="tier-name">Pro Tier</div>
                                            <div className="tier-price">$9.99/mo</div>
                                        </div>
                                        <div 
                                            className={`upgrade-plan-card ${selectedTier === 'team' ? 'active' : ''}`}
                                            onClick={() => setSelectedTier('team')}
                                        >
                                            <div className="tier-name">Team Tier</div>
                                            <div className="tier-price">$29.99/mo</div>
                                        </div>
                                    </div>

                                    <div className="form-group">
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

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="form-group">
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
                                        <div className="form-group">
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
                                        style={{ marginTop: '16px' }}
                                        disabled={paymentStatus === 'processing'}
                                    >
                                        {paymentStatus === 'processing' 
                                            ? 'Processing Payment...' 
                                            : `Pay $${selectedTier === 'pro' ? '9.99' : '29.99'}`}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
