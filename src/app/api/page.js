'use client';

import { useState } from 'react';
import Link from 'next/link';
import '../landing.css';

export default function ApiDocs() {
    const [selectedTab, setSelectedTab] = useState('curl'); // 'curl' | 'js' | 'python'

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
            {/* Header */}
            <header className="navbar">
                <div className="navbar-container">
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
                        <Link href="/pricing" className="nav-link">Pricing</Link>
                        <Link href="/api" className="nav-link active">API</Link>
                    </nav>
                    <Link href="/editor" className="btn btn-glass">Launch App</Link>
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
                                            <td style={{ fontSize: '13px', color: param.required === 'Yes' ? '#ef4444' : 'var(--text-muted)' }}>
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
                    <div className="api-code-panel" style={{ marginTop: '24px' }}>
                        <div className="code-terminal">
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
                        <p className="control-hint" style={{ marginTop: '16px', textAlign: 'center' }}>
                            Sign up for the <strong>Team Plan</strong> to get your API Token key.
                        </p>
                    </div>
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
