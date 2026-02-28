
// Use a lightweight approach - we don't need the full THREE library in the worker
// if we just calculate raw vertex data.

self.onmessage = (e: MessageEvent) => {
    const { L, W, H, profile, processedEdges } = e.data;

    const vertices: number[] = [];
    const indices: number[] = [];
    const groups: { start: number; count: number; materialIndex: number }[] = [];
    let vertexCursor = 0;

    // --- Helper Functions ---
    const addVertex = (x: number, y: number, z: number) => {
        vertices.push(x, y, z);
        return vertexCursor++;
    };
    const addFace = (v1: number, v2: number, v3: number) => indices.push(v1, v2, v3);
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

    // --- Profile Calculation (Logic copied from original VisualizationCanvas.tsx) ---
    const profileName = profile.name.toLowerCase();
    const smusMatch = profileName.match(/smuš c([\d.]+)/);
    const poluRMatch = profileName.match(/polu-zaobljena r([\d.]+)cm/);
    const punoRMatch = profileName.match(/puno-zaobljena r([\d.]+)cm/);

    let R = 0;
    const profileSegments = 8;

    if (smusMatch) {
        R = parseFloat(smusMatch[1]) / 1000;
    } else if (poluRMatch) {
        R = parseFloat(poluRMatch[1]) / 100;
    } else if (punoRMatch) {
        R = H / 2;
    }

    R = Math.min(R, H / (punoRMatch ? 1 : 2), L / 2, W / 2);
    if (R < 1e-6) R = 0;

    const getPath = (isProcessed: boolean) => {
        if (!isProcessed || R === 0) {
            return [{ x: 0, y: 0 }, { x: 0, y: H }];
        }
        const path = [{ x: 0, y: 0 }];
        if (smusMatch) {
            path.push({ x: 0, y: H - R });
            path.push({ x: -R, y: H });
        } else if (poluRMatch) {
            const yCenter = H - R;
            path.push({ x: 0, y: yCenter });
            for (let i = 0; i <= profileSegments; i++) {
                const angle = (Math.PI / 2) * (i / profileSegments);
                path.push({ x: -R * Math.cos(angle), y: yCenter + R * Math.sin(angle) });
            }
        } else if (punoRMatch) {
            const yCenter = H / 2;
            path.push({ x: 0, y: 0 });
            for (let i = 0; i <= profileSegments; i++) {
                const angle = Math.PI * (i / profileSegments);
                path.push({ x: -R * Math.cos(angle), y: yCenter + R * Math.sin(angle) });
            }
        }
        return path;
    };

    const halfL = L / 2;
    const halfW = W / 2;
    const pillars: { [key: string]: number[][] } = { bl: [], br: [], fr: [], fl: [] };

    const frontPath = getPath(processedEdges.front);
    const backPath = getPath(processedEdges.back);
    const leftPath = getPath(processedEdges.left);
    const rightPath = getPath(processedEdges.right);

    pillars.bl[0] = backPath.map(p => addVertex(-halfL + p.x, p.y, -halfW));
    pillars.bl[1] = leftPath.map(p => addVertex(-halfL, p.y, -halfW + p.x));
    pillars.br[0] = backPath.map(p => addVertex(halfL - p.x, p.y, -halfW));
    pillars.br[1] = rightPath.map(p => addVertex(halfL, p.y, -halfW + p.x));
    pillars.fr[0] = frontPath.map(p => addVertex(halfL - p.x, p.y, halfW));
    pillars.fr[1] = rightPath.map(p => addVertex(halfL, p.y, halfW - p.x));
    pillars.fl[0] = frontPath.map(p => addVertex(-halfL + p.x, p.y, halfW));
    pillars.fl[1] = leftPath.map(p => addVertex(-halfL, p.y, halfW - p.x));

    addQuad(pillars.bl[0][0], pillars.br[0][0], pillars.fr[1][0], pillars.fl[1][0]);
    addGroup(0);

    const tlIndex = pillars.fl[0][pillars.fl[0].length - 1];
    const trIndex = pillars.fr[0][pillars.fr[0].length - 1];
    const brIndex = pillars.br[0][pillars.br[0].length - 1];
    const blIndex = pillars.bl[0][pillars.bl[0].length - 1];
    addQuad(blIndex, brIndex, trIndex, tlIndex);
    addGroup(0);

    const stitch = (p1: number[], p2: number[], isProfile: boolean) => {
        const len = Math.min(p1.length, p2.length);
        for (let i = 0; i < len - 1; i++) {
            addQuad(p1[i], p2[i], p2[i + 1], p1[i + 1]);
        }
        addGroup(isProfile ? 2 : 1);
    };

    stitch(pillars.bl[0], pillars.br[0], processedEdges.back);
    stitch(pillars.br[1], pillars.fr[1], processedEdges.right);
    stitch(pillars.fr[0], pillars.fl[0], processedEdges.front);
    stitch(pillars.fl[1], pillars.bl[1], processedEdges.left);

    const stitchCorner = (p1: number[], p2: number[]) => {
        const len = Math.min(p1.length, p2.length);
        for (let i = 0; i < len - 1; i++) {
            addFace(p1[i], p1[i + 1], p2[i + 1]);
            addFace(p1[i], p2[i + 1], p2[i]);
        }
    };

    stitchCorner(pillars.fr[1], pillars.fr[0]);
    stitchCorner(pillars.fl[0], pillars.fl[1]);
    stitchCorner(pillars.bl[1], pillars.bl[0]);
    stitchCorner(pillars.br[0], pillars.br[1]);
    addGroup(2);

    const positions = new Float32Array(vertices);
    const indexArray = new Uint32Array(indices);

    self.postMessage({
        positions,
        indices: indexArray,
        groups
    }, [positions.buffer, indexArray.buffer] as any);
};
