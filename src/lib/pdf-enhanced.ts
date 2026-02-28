
'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { OrderItem } from '@/types';

type EdgeNameMap = {
    [key: string]: string;
};

interface PDFOptions {
    companyName?: string;
    companyInfo?: string;
    logoDataUrl?: string;
    include3D?: boolean;
    include2DViews?: boolean;
    includeProfileDiagram?: boolean;
}

/**
 * Generate a comprehensive technical drawing with dimensions
 */
function generateTechnicalDrawingSVG(
    item: OrderItem,
    edgeNames: EdgeNameMap,
    view: 'top' | 'front' | 'side' = 'top'
): string {
    const { length, width, height } = item.dims;

    // Calculate scale to fit within reasonable size
    const maxSize = 300;
    const maxDim = Math.max(length, width, height);
    const scale = maxSize / maxDim;

    const scaledL = length * scale;
    const scaledW = width * scale;
    const scaledH = height * scale;

    // SVG dimensions with margins
    const margin = 60;
    let svgWidth = 0;
    let svgHeight = 0;

    if (view === 'top') {
        svgWidth = scaledL + margin * 2;
        svgHeight = scaledW + margin * 2;
    } else if (view === 'front') {
        svgWidth = scaledL + margin * 2;
        svgHeight = scaledH + margin * 2;
    } else {
        svgWidth = scaledW + margin * 2;
        svgHeight = scaledH + margin * 2;
    }

    // Start SVG
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`;

    // Background
    svg += `<rect width="100%" height="100%" fill="#ffffff"/>`;

    // Grid pattern
    svg += `<defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">`;
    svg += `<path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" stroke-width="0.5"/>`;
    svg += `</pattern></defs>`;
    svg += `<rect width="${svgWidth}" height="${svgHeight}" fill="url(#grid)"/>`;

    // Center the drawing
    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;

    if (view === 'top') {
        // Top view (plan)
        const x = centerX - scaledL / 2;
        const y = centerY - scaledW / 2;

        // Main slab rectangle
        svg += `<rect x="${x}" y="${y}" width="${scaledL}" height="${scaledW}" `;
        svg += `fill="#e8e8e8" stroke="#000000" stroke-width="2"/>`;

        // Centerlines
        svg += `<line x1="${centerX}" y1="${y - 10}" x2="${centerX}" y2="${y + scaledW + 10}" `;
        svg += `stroke="#0066cc" stroke-width="0.5" stroke-dasharray="5,5"/>`;
        svg += `<line x1="${x - 10}" y1="${centerY}" x2="${x + scaledL + 10}" y2="${centerY}" `;
        svg += `stroke="#0066cc" stroke-width="0.5" stroke-dasharray="5,5"/>`;

        // Edge processing indicators
        const edgeOffset = 8;
        if (item.processedEdges.front) {
            svg += `<line x1="${x}" y1="${y + scaledW - edgeOffset}" x2="${x + scaledL}" y2="${y + scaledW - edgeOffset}" `;
            svg += `stroke="#ff6600" stroke-width="3"/>`;
            svg += `<text x="${x + scaledL + 10}" y="${y + scaledW - edgeOffset}" font-size="10" fill="#ff6600">Prednja</text>`;
        }
        if (item.processedEdges.back) {
            svg += `<line x1="${x}" y1="${y + edgeOffset}" x2="${x + scaledL}" y2="${y + edgeOffset}" `;
            svg += `stroke="#ff6600" stroke-width="3"/>`;
            svg += `<text x="${x + scaledL + 10}" y="${y + edgeOffset}" font-size="10" fill="#ff6600">Zadnja</text>`;
        }
        if (item.processedEdges.left) {
            svg += `<line x1="${x + edgeOffset}" y1="${y}" x2="${x + edgeOffset}" y2="${y + scaledW}" `;
            svg += `stroke="#ff6600" stroke-width="3"/>`;
            svg += `<text x="${x + edgeOffset}" y="${y - 10}" font-size="10" fill="#ff6600" text-anchor="middle">Lijeva</text>`;
        }
        if (item.processedEdges.right) {
            svg += `<line x1="${x + scaledL - edgeOffset}" y1="${y}" x2="${x + scaledL - edgeOffset}" y2="${y + scaledW}" `;
            svg += `stroke="#ff6600" stroke-width="3"/>`;
            svg += `<text x="${x + scaledL - edgeOffset}" y="${y - 10}" font-size="10" fill="#ff6600" text-anchor="middle">Desna</text>`;
        }

        // Okapnik indicators
        const okapnikOffset = 15;
        const grooveSize = 6;
        if (item.okapnikEdges.front) {
            svg += `<rect x="${x + okapnikOffset}" y="${y + scaledW - grooveSize}" `;
            svg += `width="${scaledL - okapnikOffset * 2}" height="${grooveSize}" `;
            svg += `fill="none" stroke="#009900" stroke-width="1.5" stroke-dasharray="3,2"/>`;
        }
        if (item.okapnikEdges.back) {
            svg += `<rect x="${x + okapnikOffset}" y="${y}" `;
            svg += `width="${scaledL - okapnikOffset * 2}" height="${grooveSize}" `;
            svg += `fill="none" stroke="#009900" stroke-width="1.5" stroke-dasharray="3,2"/>`;
        }
        if (item.okapnikEdges.left) {
            svg += `<rect x="${x}" y="${y + okapnikOffset}" `;
            svg += `width="${grooveSize}" height="${scaledW - okapnikOffset * 2}" `;
            svg += `fill="none" stroke="#009900" stroke-width="1.5" stroke-dasharray="3,2"/>`;
        }
        if (item.okapnikEdges.right) {
            svg += `<rect x="${x + scaledL - grooveSize}" y="${y + okapnikOffset}" `;
            svg += `width="${grooveSize}" height="${scaledW - okapnikOffset * 2}" `;
            svg += `fill="none" stroke="#009900" stroke-width="1.5" stroke-dasharray="3,2"/>`;
        }

        // Dimensions
        // Length dimension
        svg += `<line x1="${x}" y1="${y + scaledW + 20}" x2="${x + scaledL}" y2="${y + scaledW + 20}" stroke="#000000" stroke-width="1"/>`;
        svg += `<line x1="${x}" y1="${y + scaledW + 15}" x2="${x}" y2="${y + scaledW + 25}" stroke="#000000" stroke-width="1"/>`;
        svg += `<line x1="${x + scaledL}" y1="${y + scaledW + 15}" x2="${x + scaledL}" y2="${y + scaledW + 25}" stroke="#000000" stroke-width="1"/>`;
        svg += `<text x="${centerX}" y="${y + scaledW + 35}" font-size="11" text-anchor="middle" font-family="Arial">${length} cm</text>`;

        // Width dimension
        svg += `<line x1="${x - 20}" y1="${y}" x2="${x - 20}" y2="${y + scaledW}" stroke="#000000" stroke-width="1"/>`;
        svg += `<line x1="${x - 25}" y1="${y}" x2="${x - 15}" y2="${y}" stroke="#000000" stroke-width="1"/>`;
        svg += `<line x1="${x - 25}" y1="${y + scaledW}" x2="${x - 15}" y2="${y + scaledW}" stroke="#000000" stroke-width="1"/>`;
        svg += `<text x="${x - 30}" y="${centerY}" font-size="11" text-anchor="middle" font-family="Arial" transform="rotate(-90, ${x - 30}, ${centerY})">${width} cm</text>`;

    } else if (view === 'front') {
        // Front view (elevation)
        const x = centerX - scaledL / 2;
        const y = centerY - scaledH / 2;

        // Main slab rectangle
        svg += `<rect x="${x}" y="${y}" width="${scaledL}" height="${scaledH}" `;
        svg += `fill="#e8e8e8" stroke="#000000" stroke-width="2"/>`;

        // Hatching pattern for stone
        svg += `<defs><pattern id="stoneHatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">`;
        svg += `<line x1="0" y1="0" x2="0" y2="10" stroke="#cccccc" stroke-width="1"/>`;
        svg += `</pattern></defs>`;
        svg += `<rect x="${x}" y="${y}" width="${scaledL}" height="${scaledH}" fill="url(#stoneHatch)"/>`;

        // Profile visualization
        if (item.processedEdges.front) {
            const profileName = item.profile.name.toLowerCase();
            if (profileName.includes('smuš')) {
                // Chamfer
                svg += `<polygon points="${x + scaledL},${y} ${x + scaledL - 10},${y} ${x + scaledL},${y + 10}" `;
                svg += `fill="#ff6600" stroke="#000000" stroke-width="1"/>`;
                svg += `<polygon points="${x},${y} ${x + 10},${y} ${x},${y + 10}" `;
                svg += `fill="#ff6600" stroke="#000000" stroke-width="1"/>`;
            } else if (profileName.includes('polu-zaobljena')) {
                // Half-round
                svg += `<path d="M ${x} ${y} Q ${x} ${y - 8} ${x + 8} ${y}" fill="none" stroke="#ff6600" stroke-width="2"/>`;
                svg += `<path d="M ${x + scaledL} ${y} Q ${x + scaledL} ${y - 8} ${x + scaledL - 8} ${y}" fill="none" stroke="#ff6600" stroke-width="2"/>`;
            }
        }

        // Height dimension
        svg += `<line x1="${x + scaledL + 20}" y1="${y}" x2="${x + scaledL + 20}" y2="${y + scaledH}" stroke="#000000" stroke-width="1"/>`;
        svg += `<line x1="${x + scaledL + 15}" y1="${y}" x2="${x + scaledL + 25}" y2="${y}" stroke="#000000" stroke-width="1"/>`;
        svg += `<line x1="${x + scaledL + 15}" y1="${y + scaledH}" x2="${x + scaledL + 25}" y2="${y + scaledH}" stroke="#000000" stroke-width="1"/>`;
        svg += `<text x="${x + scaledL + 35}" y="${centerY}" font-size="11" text-anchor="middle" font-family="Arial" transform="rotate(-90, ${x + scaledL + 35}, ${centerY})">${height} cm</text>`;

        // Length dimension
        svg += `<line x1="${x}" y1="${y - 15}" x2="${x + scaledL}" y2="${y - 15}" stroke="#000000" stroke-width="1"/>`;
        svg += `<text x="${centerX}" y="${y - 25}" font-size="11" text-anchor="middle" font-family="Arial">${length} cm</text>`;

    } else {
        // Side view (elevation from side)
        const x = centerX - scaledW / 2;
        const y = centerY - scaledH / 2;

        // Main slab rectangle
        svg += `<rect x="${x}" y="${y}" width="${scaledW}" height="${scaledH}" `;
        svg += `fill="#e8e8e8" stroke="#000000" stroke-width="2"/>`;

        // Hatching pattern for stone
        svg += `<rect x="${x}" y="${y}" width="${scaledW}" height="${scaledH}" fill="url(#stoneHatch)"/>`;

        // Height dimension
        svg += `<line x1="${x + scaledW + 20}" y1="${y}" x2="${x + scaledW + 20}" y2="${y + scaledH}" stroke="#000000" stroke-width="1"/>`;
        svg += `<text x="${x + scaledW + 35}" y="${centerY}" font-size="11" text-anchor="middle" font-family="Arial" transform="rotate(-90, ${x + scaledW + 35}, ${centerY})">${height} cm</text>`;

        // Width dimension
        svg += `<line x1="${x}" y1="${y - 15}" x2="${x + scaledW}" y2="${y - 15}" stroke="#000000" stroke-width="1"/>`;
        svg += `<text x="${centerX}" y="${y - 25}" font-size="11" text-anchor="middle" font-family="Arial">${width} cm</text>`;
    }

    // View label
    const viewLabels: Record<string, string> = {
        'top': 'POGLED OD IZNAD',
        'front': 'PREDNJI POGLED',
        'side': 'BOČNI POGLED'
    };
    svg += `<text x="${svgWidth / 2}" y="25" font-size="12" text-anchor="middle" font-family="Arial" font-weight="bold">${viewLabels[view]}</text>`;

    svg += `</svg>`;

    return svg;
}

/**
 * Generate edge profile diagram SVG
 */
function generateProfileDiagram(item: OrderItem): string {
    const profileName = item.profile.name.toLowerCase();
    const height = item.dims.height;

    const svgWidth = 200;
    const svgHeight = 120;
    const scale = 3;
    const h = height * scale;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`;
    svg += `<rect width="100%" height="100%" fill="#ffffff"/>`;

    const startX = 30;
    const startY = 80;
    const edgeW = 60;

// Draw the profile
