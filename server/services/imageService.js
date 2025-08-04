import fetch from 'node-fetch';
import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ImageService {
    constructor() {
        this.urlPatterns = [
            'https://www.aidsquilttouch.org/pyramids/quilt512/{paddedId}.png',
            'https://www.aidsquilttouch.org/pyramids/quilt512/{blockId}.png',
            'https://www.aidsquilttouch.org/pyramids/quilt512/block_{paddedId}.png',
            'https://www.aidsquilttouch.org/quilt512/{paddedId}.png',
            'https://www.aidsquilttouch.org/images/quilt512/{paddedId}.png'
        ];
    }

    async getBlockImage(blockId) {
        const paddedId = blockId.toString().padStart(5, '0');
        
        console.log(`Trying to find image for block ${blockId}...`);
        
        for (const pattern of this.urlPatterns) {
            const imageUrl = pattern
                .replace('{paddedId}', paddedId)
                .replace('{blockId}', blockId);
            
            try {
                console.log(`Trying: ${imageUrl}`);
                const response = await fetch(imageUrl);
                
                if (response.ok) {
                    console.log(`✓ Found image at: ${imageUrl}`);
                    return response;
                }
            } catch (error) {
                console.log(`✗ Error for ${imageUrl}:`, error.message);
            }
        }
        
        return null;
    }

    createPlaceholder(blockId) {
        return `
            <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
                <rect width="512" height="512" fill="#f0f0f0"/>
                <text x="256" y="256" text-anchor="middle" font-family="Arial" font-size="24" fill="#999">
                    Block ${blockId}
                </text>
                <text x="256" y="290" text-anchor="middle" font-family="Arial" font-size="16" fill="#666">
                    Image not found
                </text>
            </svg>
        `;
    }

    async getImageSize(imagePath) {
        return new Promise((resolve, reject) => {
            const command = `identify -format "%w %h" "${imagePath}"`;
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error('Error getting image size:', error);
                    reject(error);
                } else {
                    const [width, height] = stdout.trim().split(' ').map(Number);
                    resolve({ width, height });
                }
            });
        });
    }

    async cropImage(sourcePath, destPath, bounds) {
        const cropCommand = `convert "${sourcePath}" -crop ${bounds.width}x${bounds.height}+${bounds.x}+${bounds.y} "${destPath}"`;
        
        return new Promise((resolve, reject) => {
            exec(cropCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error('ImageMagick crop error:', error);
                    reject(error);
                } else {
                    console.log(`Image cropped: ${destPath}`);
                    resolve();
                }
            });
        });
    }

    async resizeImage(sourcePath, destPath, size) {
        const resizeCommand = `convert "${sourcePath}" -resize ${size} "${destPath}"`;
        
        return new Promise((resolve, reject) => {
            exec(resizeCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error('ImageMagick resize error:', error);
                    reject(error);
                } else {
                    console.log(`Image resized to ${size}: ${destPath}`);
                    resolve();
                }
            });
        });
    }

    getBoundingBoxFromCorners(corners) {
        const xs = corners.map(c => c.x);
        const ys = corners.map(c => c.y);
        
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    async getScaledBounds(corners, sourcePath) {
        const { width, height } = await this.getImageSize(sourcePath);
        
        const xScale = width / 512;
        const yScale = height / 512;
        
        const scaledCorners = corners.map(c => ({
            x: Math.round(c.x * xScale),
            y: Math.round(c.y * yScale)
        }));
        
        return this.getBoundingBoxFromCorners(scaledCorners);
    }
}

export default ImageService;