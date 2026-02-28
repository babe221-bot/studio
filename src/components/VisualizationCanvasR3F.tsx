/**
 * VisualizationCanvasR3F - Refactored Three.js Visualization using React Three Fiber
 * 
 * Architecture Improvements:
 * - Uses centralized ResourceManager with reference counting
 * - Worker Pool for geometry generation (2 persistent workers)
 * - Declarative React integration via @react-three/fiber
 * - Built-in disposal management via R3F lifecycle
 * - Optimized rendering with visibility detection
 */

import React, { useRef, useImperativeHandle, forwardRef, useCallback, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import type { Material as MaterialType, SurfaceFinish, EdgeProfile, ProcessedEdges } from '@/types';
import { StoneSlabMesh, StudioLighting, DimensionLabels, SceneEnvironment } from './three';
import { resourceManager } from '@/lib/ResourceManager';

// ============================================================================
// Types
// ============================================================================

export interface VisualizationProps {
