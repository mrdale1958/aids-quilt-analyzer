// Create test-blocks.js in the same directory as blocks.js
import express from 'express';

console.log('🔍 Testing if blocks.js can load...');

try {
    const createBlockRoutes = await import('./blocks.js');
    console.log('✅ blocks.js imported successfully');
    
    // Try to create the router
    const mockDb = { get: () => {}, all: () => {}, run: () => {} };
    const mockConsensus = {};
    
    const router = createBlockRoutes.default(mockDb, mockConsensus);
    console.log('✅ Router created successfully');
    console.log('📋 Router stack length:', router.stack?.length || 'unknown');
    
} catch (error) {
    console.error('❌ Failed to load blocks.js:', error);
    console.error('❌ Stack trace:', error.stack);
}