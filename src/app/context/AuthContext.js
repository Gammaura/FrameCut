'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import Modals from '../components/Modals';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [usageCount, setUsageCount] = useState(0);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
    const [googleClientId, setGoogleClientId] = useState('');

    // Load initial state from localStorage & parse Google redirect hash
    useEffect(() => {
        const storedUser = localStorage.getItem('framecut_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }

        const storedClientId = localStorage.getItem('framecut_google_client_id') || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '649938599189-qh7r2cf1l2ra9lh40mplfceb1k4mh5n7.apps.googleusercontent.com';
        setGoogleClientId(storedClientId);

        const storedUsage = localStorage.getItem('framecut_usage');
        if (storedUsage) {
            const parsed = JSON.parse(storedUsage);
            const today = new Date().toDateString();
            if (parsed.date === today) {
                setUsageCount(parsed.count);
            } else {
                setUsageCount(0);
                localStorage.setItem('framecut_usage', JSON.stringify({ date: today, count: 0 }));
            }
        }

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
                                apiKey: null
                            };
                            
                            const registeredUsers = JSON.parse(localStorage.getItem('framecut_registered') || '[]');
                            const existing = registeredUsers.find(u => u.email === data.email);
                            if (existing) {
                                googleUser.tier = existing.tier;
                                googleUser.apiKey = existing.apiKey;
                            } else {
                                registeredUsers.push(googleUser);
                                localStorage.setItem('framecut_registered', JSON.stringify(registeredUsers));
                            }
                            
                            setUser(googleUser);
                            localStorage.setItem('framecut_user', JSON.stringify(googleUser));
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
            apiKey: null
        };
        
        const registeredUsers = JSON.parse(localStorage.getItem('framecut_registered') || '[]');
        const existing = registeredUsers.find(u => u.email === email);
        
        if (existing) {
            mockUser.tier = existing.tier;
            mockUser.apiKey = existing.apiKey;
        } else {
            registeredUsers.push(mockUser);
            localStorage.setItem('framecut_registered', JSON.stringify(registeredUsers));
        }

        setUser(mockUser);
        localStorage.setItem('framecut_user', JSON.stringify(mockUser));
        setShowAuthModal(false);
    };

    const signup = (email, password) => {
        const mockUser = {
            email,
            tier: 'free',
            apiKey: null
        };
        const registeredUsers = JSON.parse(localStorage.getItem('framecut_registered') || '[]');
        if (!registeredUsers.some(u => u.email === email)) {
            registeredUsers.push(mockUser);
            localStorage.setItem('framecut_registered', JSON.stringify(registeredUsers));
        }
        setUser(mockUser);
        localStorage.setItem('framecut_user', JSON.stringify(mockUser));
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

        const redirectUri = window.location.origin + window.location.pathname;
        const scope = encodeURIComponent('https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email');
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${targetClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}&include_granted_scopes=true&state=google-oauth`;
        
        window.location.href = authUrl;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('framecut_user');
    };

    const upgradePlan = (tier) => {
        if (!user) {
            setAuthMode('signup');
            setShowAuthModal(true);
            return;
        }

        const updatedUser = {
            ...user,
            tier,
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

    const incrementUsage = () => {
        if (user && (user.tier === 'pro' || user.tier === 'team')) {
            return true;
        }

        if (usageCount >= 5) {
            setShowUpgradeModal(true);
            return false;
        }

        const newCount = usageCount + 1;
        setUsageCount(newCount);
        localStorage.setItem('framecut_usage', JSON.stringify({
            date: new Date().toDateString(),
            count: newCount
        }));
        return true;
    };

    return (
        <AuthContext.Provider value={{
            user,
            usageCount,
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
            incrementUsage
        }}>
            {children}
            <Modals />
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
