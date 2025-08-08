// Minimal main.jsx to test if React is causing the hang:
console.log('🚀 main.jsx loading...');

import React from 'react';
import { createRoot } from 'react-dom/client';

console.log('🚀 React imported successfully');

function MinimalApp() {
    console.log('🚀 MinimalApp rendering...');
    return <h1>Minimal app works!</h1>;
}

console.log('🚀 About to create root...');
const root = createRoot(document.getElementById('root'));

console.log('🚀 About to render...');
root.render(<MinimalApp />);

console.log('🚀 Render complete');