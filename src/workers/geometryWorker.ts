
// Geometry Worker - generates stone slab mesh data off the main thread.
// Handles: all edge profiles (flat, smuš, bullnose), robust corner stitching,
//          okapnik groove as true bottom-face indentation, and UV generation.

self.onmessage = (e: MessageEvent) => {
    const { L, W, H, profile, processedEdges, okapnikEdges } = e.data;

    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const groups: { start: number; count: number; materialIndex: number }[] = [];
    let vertexCursor = 0;

    // --- Helper Functions ---
    const halfL = L / 2;
    const halfW = W / 2;

    const addVertex = (x: number, y: number, z: number) => {
        vertices.push(x, y, z);
        // Planar UV: map x/z to [0,1] across the stone face
        uvs.push((x + halfL) / L, (z + halfW) / W);
        return vertexCursor++;
    };

    const addFace = (v1: number, v2: number, v3: number) => {
        // Avoid degenerate triangles
        if (v1 !== v2 && v2 !== v3 && v1 !== v3) {
            indices.push(v1, v2, v3);
        }
    };

    const addQuad = (v1: number, v2: number, v3: number, v4: number) => {
        addFace(v1, v2, v3);
        addFace(v1, v3, v4);
    };

    let groupIndicesCount = 0;
    const addGroup = (materialIndex: number) => {
        const count = indices.length - groupIndicesCount;
        if (count > 0) {
            groups.push({ start: groupIndicesCount, count, materialIndex });
        }
        groupIndicesCount = indices.length;
    };

    // --- Profile Path Calculation ---
    // Returns an array of {x (outward offset), y (height)} points from bottom to top.
    // x is NEGATIVE meaning "inward" (for profile shapes that tuck in from the edge).
    const profileName = profile.name.toLowerCase();
    const smusMatch = profileName.match(/smuš c([\d.]+)/);
    const poluRMatch = profileName.match(/polu-zaobljena r([\d.]+)cm/);
    const punoRMatch = profileName.match(/puno-zaobljena r([\d.]+)cm/);

    // Number of arc segments for curved profiles
    const profileSegments = 12;

    let R = 0;
    if (smusMatch) {
        R = parseFloat(smusMatch[1]) / 1000; // mm -> m
    } else if (poluRMatch) {
        R = parseFloat(poluRMatch[1]) / 100; // cm -> m
    } else if (punoRMatch) {
        R = H / 2;
    }

    // Clamp R so it doesn't exceed slab dimensions
    R = Math.min(R, H / (punoRMatch ? 1 : 2), L / 2, W / 2);
    if (R < 1e-6) R = 0;

    /**
     * Build the edge profile path for one side.
     * @param isProcessed - whether this edge has the selected profile applied
     * @returns Array of {x, y} points from bottom (y=0) to top (y=H).
     *          x is the outward offset from the edge (negative = inward).
     */
    const getPath = (isProcessed: boolean): { x: number; y: number }[] => {
        if (!isProcessed || R === 0) {
            return [{ x: 0, y: 0 }, { x: 0, y: H }];
        }
        const path: { x: number; y: number }[] = [{ x: 0, y: 0 }];

        if (smusMatch) {
            // 45° chamfer: go straight up, then diagonally inward
            path.push({ x: 0, y: H - R });
            path.push({ x: -R, y: H });
        } else if (poluRMatch) {
            // Quarter-round: straight up to just below top, then arc inward
            const yCenter = H - R;
            path.push({ x: 0, y: yCenter });
            for (let i = 0; i <= profileSegments; i++) {
                const angle = (Math.PI / 2) * (i / profileSegments);
                path.push({
                    x: -R + R * Math.cos(angle),  // starts at 0, curves to -R
                    y: yCenter + R * Math.sin(angle)
                });
            }
        } else if (punoRMatch) {
            // Half-round: full semicircle from bottom to top
            const yCenter = H / 2;
            for (let i = 0; i <= profileSegments; i++) {
                const angle = Math.PI * (i / profileSegments); // 0 → π
                path.push({
                    x: -R + R * Math.cos(angle + Math.PI), // maps arc to left side
                    y: yCenter + R * Math.sin(angle)
                });
            }
        }
        return path;
    };

    // --- Build Pillar Paths (4 corners × 2 paths each) ---
    // Each corner has two edge paths that meet. We compute world-space vertex indices.
    // Naming: bl=back-left, br=back-right, fr=front-right, fl=front-left (XZ plane, Y=up)

    type PillarSet = number[][];

    const frontPath = getPath(processedEdges.front);
    const backPath = getPath(processedEdges.back);
    const leftPath = getPath(processedEdges.left);
    const rightPath = getPath(processedEdges.right);

    // pillar[cornerName][0] = indices for the "Z-axis" edge at that corner
    // pillar[cornerName][1] = indices for the "X-axis" edge at that corner
    const pillars: { [key: string]: PillarSet } = { bl: [], br: [], fr: [], fl: [] };

    // Back edge (z = -halfW), left-to-right
    pillars.bl[0] = backPath.map(p => addVertex(-halfL + p.x, p.y, -halfW));
    pillars.br[0] = backPath.map(p => addVertex(halfL - p.x, p.y, -halfW));

    // Right edge (x = +halfL), back-to-front
    pillars.br[1] = rightPath.map(p => addVertex(halfL, p.y, -halfW + p.x));
    pillars.fr[1] = rightPath.map(p => addVertex(halfL, p.y, halfW - p.x));

    // Front edge (z = +halfW), right-to-left
    pillars.fr[0] = frontPath.map(p => addVertex(halfL - p.x, p.y, halfW));
    pillars.fl[0] = frontPath.map(p => addVertex(-halfL + p.x, p.y, halfW));

    // Left edge (x = -halfL), front-to-back
    pillars.fl[1] = leftPath.map(p => addVertex(-halfL, p.y, halfW - p.x));
    pillars.bl[1] = leftPath.map(p => addVertex(-halfL, p.y, -halfW + p.x));

    // --- Bottom Face (y=0) ---
    // The bottom spans all 4 outer corners at y=0
    addQuad(pillars.bl[0][0], pillars.br[0][0], pillars.fr[1][0], pillars.fl[1][0]);
    addGroup(0);

    // --- Top Face (y=H) ---
    // The top spans all 4 outer corners at the top of each corner's profile path
    // bl[0] top = back-left corner (back edge side)
    // br[0] top = back-right corner (back edge side)  
    // fr[0] top = front-right corner (front edge side)
    // fl[0] top = front-left corner (front edge side)
    const topBL = pillars.bl[0][pillars.bl[0].length - 1];
    const topBR = pillars.br[0][pillars.br[0].length - 1];
    const topFR = pillars.fr[0][pillars.fr[0].length - 1];
    const topFL = pillars.fl[0][pillars.fl[0].length - 1];
    addQuad(topBL, topBR, topFR, topFL);
    addGroup(0);

    // --- Robust Corner Stitching ---
    // Handles any combination of path lengths by clamping to endpoint.
    const stitchCorner = (p1: number[], p2: number[]) => {
        const len1 = p1.length;
        const len2 = p2.length;
        const maxLen = Math.max(len1, len2);
        for (let i = 0; i < maxLen - 1; i++) {
            const a = p1[Math.min(i, len1 - 1)];
            const b = p1[Math.min(i + 1, len1 - 1)];
            const c = p2[Math.min(i, len2 - 1)];
            const d = p2[Math.min(i + 1, len2 - 1)];
            // Skip if both edges collapse to the same vertex
            if (a !== b || c !== d) {
                if (a !== c) addFace(a, b, c);
                if (b !== d) addFace(b, d, c);
            }
        }
    };

    // --- Robust Side Wall Stitching ---
    // Stitches two edge paths into a quad strip (side/profile face).
    const stitch = (p1: number[], p2: number[], isProfile: boolean) => {
        const len1 = p1.length;
        const len2 = p2.length;
        const maxLen = Math.max(len1, len2);
        for (let i = 0; i < maxLen - 1; i++) {
            const a = p1[Math.min(i, len1 - 1)];
            const b = p1[Math.min(i + 1, len1 - 1)];
            const c = p2[Math.min(i, len2 - 1)];
            const d = p2[Math.min(i + 1, len2 - 1)];
            if (a !== b || c !== d) {
                addQuad(a, c, d, b);
            }
        }
        addGroup(isProfile ? 2 : 1);
    };

    // Stitch the 4 sides
    stitch(pillars.bl[0], pillars.br[0], processedEdges.back);
    stitch(pillars.br[1], pillars.fr[1], processedEdges.right);
    stitch(pillars.fr[0], pillars.fl[0], processedEdges.front);
    stitch(pillars.fl[1], pillars.bl[1], processedEdges.left);

    // Stitch the 4 corners
    stitchCorner(pillars.fr[1], pillars.fr[0]);
    stitchCorner(pillars.fl[0], pillars.fl[1]);
    stitchCorner(pillars.bl[1], pillars.bl[0]);
    stitchCorner(pillars.br[0], pillars.br[1]);
    addGroup(2);

    // --- Okapnik Groove (carved into bottom face) ---
    // We add geometry below the bottom face to represent the drip groove.
    // Groove is a channel running parallel to the edge, inset by `okapnikOffset`,
    // with depth `okapnikDepth` and width `okapnikWidth`.

    const hasOkapnik = okapnikEdges &&
        (okapnikEdges.front || okapnikEdges.back || okapnikEdges.left || okapnikEdges.right);

    if (hasOkapnik) {
        const oD = 0.006;   // groove depth (6mm), going DOWN from y=0
        const oW = 0.008;   // groove width (8mm)
        const oOff = 0.020; // inset from edge (20mm)

        // Helper: add a rectangular groove running along an axis
        // Arguments: along-axis start/end, perpendicular position, direction (z or x axis)
        const addGroove = (
            axisStart: number, axisEnd: number,
            edgePos: number, inward: number,  // edgePos = edge coord, inward = direction toward center
            axis: 'x' | 'z'
        ) => {
            // Groove outer wall = edgePos + inward * oOff
            // Groove inner wall = edgePos + inward * (oOff + oW)
            const gOuter = edgePos + inward * oOff;
            const gInner = edgePos + inward * (oOff + oW);

            const mkV = (along: number, perp: number, y: number) =>
                axis === 'x'
                    ? addVertex(along, y, perp)
                    : addVertex(perp, y, along);

            // 8 vertices: outer top/bottom, inner top/bottom × 2 ends
            const o0t = mkV(axisStart, gOuter, 0);
            const o0b = mkV(axisStart, gOuter, -oD);
            const i0t = mkV(axisStart, gInner, 0);
            const i0b = mkV(axisStart, gInner, -oD);
            const o1t = mkV(axisEnd, gOuter, 0);
            const o1b = mkV(axisEnd, gOuter, -oD);
            const i1t = mkV(axisEnd, gInner, 0);
            const i1b = mkV(axisEnd, gInner, -oD);

            // Bottom of groove
            addQuad(o0b, i0b, i1b, o1b);
            // Outer wall (facing edge)
            addQuad(o0t, o1t, o1b, o0b);
            // Inner wall (facing center)
            addQuad(i0b, i1b, i1t, i0t);
            // End caps
            addQuad(o0t, o0b, i0b, i0t);
            addQuad(i1t, i1b, o1b, o1t);
        };

        if (okapnikEdges.front) {
            addGroove(-halfL, halfL, halfW, -1, 'x');
        }
        if (okapnikEdges.back) {
            addGroove(-halfL, halfL, -halfW, 1, 'x');
        }
        if (okapnikEdges.right) {
            addGroove(-halfW, halfW, halfL, -1, 'z');
        }
        if (okapnikEdges.left) {
            addGroove(-halfW, halfW, -halfL, 1, 'z');
        }

        addGroup(1); // side material for groove
    }

    // --- Transfer buffers to main thread ---
    const positions = new Float32Array(vertices);
    const uvsArray = new Float32Array(uvs);
    const indexArray = new Uint32Array(indices);

    self.postMessage(
        { positions, uvs: uvsArray, indices: indexArray, groups },
        [positions.buffer, uvsArray.buffer, indexArray.buffer] as any
    );
};
