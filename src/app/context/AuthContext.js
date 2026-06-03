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

    // Load initial state from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('framecut_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }

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
    }, []);

    const login = (email, password) => {
        const mockUser = {
            email,
            tier: 'free',
            apiKey: null
        };
        
        // Mock credentials persistence
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
