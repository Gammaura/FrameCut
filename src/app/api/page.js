'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import '../landing.css';

export default function ApiDocs() {
    const { user, logout, setShowAuthModal, setShowUpgradeModal, setAuthMode, generateNewApiKey } = useAuth();
    const [selectedTab, setSelectedTab] = useState('curl'); // 'curl' | 'js' | 'python'
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);

    const codeSamples = {
        curl: `curl -X POST https://api.framecut.ai/v1/remove-background \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "image=@frame_slots.png" \\
  -F "tolerance=35" \\
  -F "softness=2" \\
  -F "contiguous=true" \\
  -F "targetColor=#cc0000"`,
        js: `const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('tolerance', '35');
formData.append('softness', '2');
formData.append('contiguous', 'true');
formData.append('targetColor', '#cc0000');

const response = await fetch('https://api.framecut.ai/v1/remove-background', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: formData
});

const blob = await response.blob();
const imageUrl = URL.createObjectURL(blob);`,
        python: `import requests

url = "https://api.framecut.ai/v1/remove-background"
headers = {
    "Authorization": "Bearer YOUR_API_KEY"
}
files = {
    "image": open("frame_slots.png", "rb")
}
data = {
    "tolerance": 35,
    "softness": 2,
    "contiguous": "true",
    "targetColor": "#cc0000"
}

response = requests.post(url, headers=headers, files=files, data=data)
if response.status_code == 200:
    with open("result.png", "wb") as f:
        f.write(response.content)`
    };

    const params = [
        { name: 'image', type: 'File', required: 'Yes', desc: 'The PNG image frame slot to be transparentized.' },
        { name: 'tolerance', type: 'Integer (1-100)', required: 'No (default: 35)', desc: 'Higher values match more variant shades of target color.' },
        { name: 'softness', type: 'Integer (0-10)', required: 'No (default: 2)', desc: 'Size of blur kernel radius to smooth the cut out edges.' },
        { name: 'contiguous', type: 'Boolean', required: 'No (default: true)', desc: 'Only remove matching color regions sharing borders with seeds.' },
        { name: 'targetColor', type: 'Hex String', required: 'No (Auto-Detect)', desc: 'Hexadecimal color key of slot area (e.g. #cc0000).' }
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
                        <Link href="/pricing" className="nav-link">Pricing</Link>
                        <Link href="/api" className="nav-link active">API</Link>
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

            {/* API Section */}
            <section className="api-section">
                <div className="api-layout">
                    {/* API Information */}
                    <div className="api-info">
                        <div className="hero-badge">Developer API</div>
                        <h2>Integrate FrameCut into your workflow</h2>
                        <p>
                            Automate the transparentizing of solid background frame slots using our simple, high-performance REST API. 
                            Built with sub-millisecond response guarantees on multi-threaded infrastructure.
                        </p>

                        <div className="endpoint-badge">
                            <span className="endpoint-method">POST</span>
                            https://api.framecut.ai/v1/remove-background
                        </div>

                        <h3>Request Parameters</h3>
                        <div className="param-table-container">
                            <table className="param-table">
                                <thead>
                                    <tr>
                                        <th>Parameter</th>
                                        <th>Type</th>
                                        <th>Required</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {params.map((param, index) => (
                                        <tr key={index}>
                                            <td className="param-name">{param.name}</td>
                                            <td className="param-type">{param.type}</td>
                                            <td style={{ fontSize: '13px', color: param.required === 'Yes' ? '#ff5500' : 'var(--text-secondary)' }}>
                                                {param.required}
                                            </td>
                                            <td>{param.desc}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Code playground / terminal */}
                    <div className="api-code-panel">
                        <div className="code-terminal crop-box">
                            <div className="crop-corners-inner"></div>
                            <div className="terminal-header">
                                <div className="terminal-dots">
                                    <div className="terminal-dot" style={{ backgroundColor: '#ef4444' }}></div>
                                    <div className="terminal-dot" style={{ backgroundColor: '#eab308' }}></div>
                                    <div className="terminal-dot" style={{ backgroundColor: '#22c55e' }}></div>
                                </div>
                                <div className="terminal-tabs">
                                    <button 
                                        className={`terminal-tab-btn ${selectedTab === 'curl' ? 'active' : ''}`}
                                        onClick={() => setSelectedTab('curl')}
                                    >
                                        cURL
                                    </button>
                                    <button 
                                        className={`terminal-tab-btn ${selectedTab === 'js' ? 'active' : ''}`}
                                        onClick={() => setSelectedTab('js')}
                                    >
                                        JavaScript
                                    </button>
                                    <button 
                                        className={`terminal-tab-btn ${selectedTab === 'python' ? 'active' : ''}`}
                                        onClick={() => setSelectedTab('python')}
                                    >
                                        Python
                                    </button>
                                </div>
                            </div>
                            <div className="terminal-body">
                                <pre><code>{codeSamples[selectedTab]}</code></pre>
                            </div>
                        </div>
                        {user && user.tier === 'team' ? (
                            <div style={{ marginTop: '24px', padding: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>YOUR LIVE API KEY</span>
                                    <button 
                                        onClick={generateNewApiKey}
                                        style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                        Regenerate Key
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={user.apiKey || ''} 
                                        style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '10px 12px', fontSize: '13px', color: 'var(--accent)', fontFamily: 'monospace', outline: 'none' }}
                                    />
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(user.apiKey || '');
                                            alert('API Key copied to clipboard!');
                                        }}
                                        className="btn btn-primary"
                                        style={{ padding: '10px 16px' }}
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ marginTop: '24px', padding: '24px', background: 'var(--accent-glow)', border: '1px dashed var(--accent)', textAlign: 'center' }}>
                                <p style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                                    API credentials are locked. Please upgrade to the <strong>Team Plan</strong> to generate live tokens.
                                </p>
                                <button 
                                    onClick={() => {
                                        if (!user) {
                                            setAuthMode('signup');
                                            setShowAuthModal(true);
                                        } else {
                                            setShowUpgradeModal(true);
                                        }
                                    }}
                                    className="btn btn-primary"
                                >
                                    Unlock API Key
                                </button>
                            </div>
                        )}
                    </div>
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
