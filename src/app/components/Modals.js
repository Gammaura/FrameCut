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
        login,
        signup,
        upgradePlan
    } = useAuth();

    // Auth Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

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

    const handleAuthSubmit = (e) => {
        e.preventDefault();
        if (!email || !password) return;
        if (authMode === 'login') {
            login(email, password);
        } else {
            signup(email, password);
        }
        setEmail('');
        setPassword('');
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
                        
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                            </h3>
                            <p className="modal-subtitle">
                                {authMode === 'login' 
                                    ? 'Log in to access your dashboard and templates.' 
                                    : 'Register to claim 5 free high-speed exports daily.'}
                            </p>
                        </div>

                        <form onSubmit={handleAuthSubmit}>
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input 
                                    type="email" 
                                    className="form-input" 
                                    placeholder="name@domain.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input 
                                    type="password" 
                                    className="form-input" 
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required 
                                />
                            </div>
                            <button type="submit" className="modal-submit" style={{ marginTop: '12px' }}>
                                {authMode === 'login' ? 'Log In' : 'Sign Up'}
                            </button>
                        </form>

                        <div className="modal-toggle-text">
                            {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
                            <button 
                                className="modal-toggle-btn"
                                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                            >
                                {authMode === 'login' ? 'Sign up' : 'Log in'}
                            </button>
                        </div>
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
                                <h3 className="modal-title" style={{ color: '#22c55e', background: 'none', webkitTextFillColor: 'initial' }}>
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
                                    <p className="modal-subtitle">Claim unlimited exports and low-latency API access.</p>
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
