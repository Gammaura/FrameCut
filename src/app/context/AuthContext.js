'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import Modals from '../components/Modals';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
    const [googleClientId, setGoogleClientId] = useState('');

    // Load initial state from localStorage & parse Google redirect hash
    useEffect(() => {
        const storedUser = localStorage.getItem('framecut_user');
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (typeof parsed.tokens === 'undefined') {
                parsed.tokens = parsed.tier === 'free' ? 20 : parsed.tier === 'pro' ? 200 : 1000;
            }
            setUser(parsed);
        }

        const storedClientId = localStorage.getItem('framecut_google_client_id') || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '649938599189-qh7r2cf1l2ra9lh40mplfceb1k4mh5n7.apps.googleusercontent.com';
        setGoogleClientId(storedClientId);

        // Process Google OAuth redirect token
        const hash = window.location.hash;
        if (hash) {
            const params = new URLSearchParams(hash.substring(1));
            const accessToken = params.get('access_token');
            if (accessToken) {
                // Clean browser address URL bar hash
                window.history.replaceState(null, null, window.location.pathname + window.location.search);
                
                // Fetch real profile information from official Google API
                fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.email) {
                            const googleUser = {
                                email: data.email,
                                name: data.name || data.email.split('@')[0],
                                picture: data.picture,
                                tier: 'free',
                                tokens: 20,
                                apiKey: null
                            };
                            
                            const registeredUsers = JSON.parse(localStorage.getItem('framecut_registered') || '[]');
                            const existing = registeredUsers.find(u => u.email === data.email);
                            if (existing) {
                                googleUser.tier = existing.tier;
                                googleUser.tokens = typeof existing.tokens === 'number' ? existing.tokens : (existing.tier === 'free' ? 20 : existing.tier === 'pro' ? 200 : 1000);
                                googleUser.apiKey = existing.apiKey;
                            } else {
                                registeredUsers.push(googleUser);
                                localStorage.setItem('framecut_registered', JSON.stringify(registeredUsers));
                            }
                            
                            setUser(googleUser);
                            localStorage.setItem('framecut_user', JSON.stringify(googleUser));
                            if (typeof window !== 'undefined') {
                                sessionStorage.removeItem('framecut_active_image');
                            }

                            // Redirect back to page where OAuth was triggered
                            const redirectBack = localStorage.getItem('google_auth_redirect_back');
                            if (redirectBack && redirectBack !== '/' && redirectBack !== window.location.pathname) {
                                localStorage.removeItem('google_auth_redirect_back');
                                window.location.href = window.location.origin + redirectBack;
                            } else {
                                localStorage.removeItem('google_auth_redirect_back');
                            }
                        }
                    })
                    .catch(err => console.error("Error calling Google UserInfo endpoint:", err));
            }
        }
    }, []);

    const login = (email, password) => {
        const mockUser = {
            email,
            tier: 'free',
            tokens: 20,
            apiKey: null
        };
        
        const registeredUsers = JSON.parse(localStorage.getItem('framecut_registered') || '[]');
        const existing = registeredUsers.find(u => u.email === email);
        
        if (existing) {
            mockUser.tier = existing.tier;
            mockUser.tokens = typeof existing.tokens === 'number' ? existing.tokens : (existing.tier === 'free' ? 20 : existing.tier === 'pro' ? 200 : 1000);
            mockUser.apiKey = existing.apiKey;
        } else {
            registeredUsers.push(mockUser);
            localStorage.setItem('framecut_registered', JSON.stringify(registeredUsers));
        }

        setUser(mockUser);
        localStorage.setItem('framecut_user', JSON.stringify(mockUser));
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('framecut_active_image');
        }
        setShowAuthModal(false);
    };

    const signup = (email, password) => {
        const mockUser = {
            email,
            tier: 'free',
            tokens: 20,
            apiKey: null
        };
        const registeredUsers = JSON.parse(localStorage.getItem('framecut_registered') || '[]');
        if (!registeredUsers.some(u => u.email === email)) {
            registeredUsers.push(mockUser);
            localStorage.setItem('framecut_registered', JSON.stringify(registeredUsers));
        }
        setUser(mockUser);
        localStorage.setItem('framecut_user', JSON.stringify(mockUser));
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('framecut_active_image');
        }
        setShowAuthModal(false);
    };

    const loginWithGoogle = (clientIdInput) => {
        const targetClientId = clientIdInput || googleClientId;
        if (!targetClientId) {
            alert("Please provide a valid Google Client ID.");
            return;
        }

        // Save for ease of future logins
        localStorage.setItem('framecut_google_client_id', targetClientId);
        setGoogleClientId(targetClientId);

        // Store active page path so we return to it after callback
        localStorage.setItem('google_auth_redirect_back', window.location.pathname);

        // Standardize redirect URI to home origin root with trailing slash
        const redirectUri = window.location.origin + '/';
        const scope = encodeURIComponent('https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email');
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${targetClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}&include_granted_scopes=true&state=google-oauth`;
        
        window.location.href = authUrl;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('framecut_user');
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('framecut_active_image');
        }
    };

    const upgradePlan = (tier) => {
        if (!user) {
            setAuthMode('signup');
            setShowAuthModal(true);
            return;
        }

        let newTokens = 20;
        if (tier === 'pro') newTokens = 200;
        if (tier === 'team') newTokens = 1000;

        const updatedUser = {
            ...user,
            tier,
            tokens: newTokens,
            apiKey: tier === 'team' ? `fc_live_${Math.random().toString(36).substring(2, 15)}` : user.apiKey
        };

        setUser(updatedUser);
        localStorage.setItem('framecut_user', JSON.stringify(updatedUser));

        const registeredUsers = JSON.parse(localStorage.getItem('framecut_registered') || '[]');
        const updatedRegistered = registeredUsers.map(u => u.email === user.email ? updatedUser : u);
        localStorage.setItem('framecut_registered', JSON.stringify(updatedRegistered));
        setShowUpgradeModal(false);
    };

    const generateNewApiKey = () => {
        if (!user || user.tier !== 'team') return;
        const newKey = `fc_live_${Math.random().toString(36).substring(2, 15)}`;
        const updatedUser = { ...user, apiKey: newKey };
        setUser(updatedUser);
        localStorage.setItem('framecut_user', JSON.stringify(updatedUser));

        const registeredUsers = JSON.parse(localStorage.getItem('framecut_registered') || '[]');
        const updatedRegistered = registeredUsers.map(u => u.email === user.email ? updatedUser : u);
        localStorage.setItem('framecut_registered', JSON.stringify(updatedRegistered));
    };

    const deductTokens = (cost) => {
        if (!user) {
            setAuthMode('login');
            setShowAuthModal(true);
            return false;
        }

        const currentTokens = typeof user.tokens === 'number' ? user.tokens : 0;
        if (currentTokens < cost) {
            setShowUpgradeModal(true);
            return false;
        }

        const updatedUser = {
            ...user,
            tokens: currentTokens - cost
        };
        setUser(updatedUser);
        localStorage.setItem('framecut_user', JSON.stringify(updatedUser));

        const registeredUsers = JSON.parse(localStorage.getItem('framecut_registered') || '[]');
        const updatedRegistered = registeredUsers.map(u => u.email === user.email ? updatedUser : u);
        localStorage.setItem('framecut_registered', JSON.stringify(updatedRegistered));
        return true;
    };

    return (
        <AuthContext.Provider value={{
            user,
            showAuthModal,
            setShowAuthModal,
            showUpgradeModal,
            setShowUpgradeModal,
            authMode,
            setAuthMode,
            googleClientId,
            setGoogleClientId,
            loginWithGoogle,
            login,
            signup,
            logout,
            upgradePlan,
            generateNewApiKey,
            deductTokens
        }}>
            {children}
            <Modals />
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
