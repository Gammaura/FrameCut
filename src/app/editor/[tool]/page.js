'use client';

import { use } from 'react';
import EditorWorkspace from '../EditorWorkspace';

export default function Page({ params }) {
    const { tool } = use(params);
    return <EditorWorkspace defaultTool={tool} />;
}
