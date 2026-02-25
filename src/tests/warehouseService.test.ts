/**
 * Unit tests for warehouseService.ts
 *
 * The Supabase client is fully mocked — no network calls are made.
 * Each function (getMaterials, getSurfaceFinishes, getEdgeProfiles) is tested
 * for the happy path (data returned) and the error path (Supabase returns error).
 */

// ── Mock @supabase/supabase-js before any imports ───────────────────────────
const mockSelect = jest.fn();
const mockOrder = jest.fn();
const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        from: mockFrom,
    })),
}));

// ── Import under test (after mock is registered) ────────────────────────────
import {
    getMaterials,
    getSurfaceFinishes,
    getEdgeProfiles,
    getWarehouseData,
} from '@/services/warehouseService';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a chainable Supabase query mock resolving to { data, error }. */
function mockSupabaseQuery(data: unknown[] | null, error: object | null) {
    // .order() is the terminal call → returns the promise
    mockOrder.mockResolvedValueOnce({ data, error });
    // .select() returns { order }
    mockSelect.mockReturnValueOnce({ order: mockOrder });
    // .from()   returns { select }
    mockFrom.mockReturnValueOnce({ select: mockSelect });
}

// ── Reset mocks between tests ────────────────────────────────────────────────
beforeEach(() => {
    jest.clearAllMocks();
});

// ────────────────────────────────────────────────────────────────────────────
// getMaterials
// ────────────────────────────────────────────────────────────────────────────
describe('getMaterials()', () => {
    const sampleMaterials = [
        { id: 1, name: 'Plano', density: 2.7, cost_sqm: 220, texture: 'https://example.com/plano.png', color: '#EAE6D9' },
        { id: 2, name: 'Kirmenjak', density: 2.65, cost_sqm: 180, texture: 'https://example.com/kirm.png', color: '#E1DCC5' },
    ];

    it('returns an array of Material objects on success', async () => {
        mockSupabaseQuery(sampleMaterials, null);

        const result = await getMaterials();

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({ id: 1, name: 'Plano', color: '#EAE6D9' });
        expect(mockFrom).toHaveBeenCalledWith('materials');
        expect(mockSelect).toHaveBeenCalledWith('id, name, density, cost_sqm, texture, color');
        expect(mockOrder).toHaveBeenCalledWith('id');
    });

    it('throws when Supabase returns an error', async () => {
        mockSupabaseQuery(null, { message: 'relation "materials" does not exist' });

        await expect(getMaterials()).rejects.toThrow('Failed to fetch materials.');
    });
});

// ────────────────────────────────────────────────────────────────────────────
// getSurfaceFinishes
// ────────────────────────────────────────────────────────────────────────────
describe('getSurfaceFinishes()', () => {
    const sampleFinishes = [
        { id: 0, name: 'Bez obrade', cost_sqm: 0 },
        { id: 1, name: 'Poliranje (Polished)', cost_sqm: 15 },
        { id: 2, name: 'Brušenje (Honed)', cost_sqm: 12 },
    ];

    it('returns an array of SurfaceFinish objects on success', async () => {
        mockSupabaseQuery(sampleFinishes, null);

        const result = await getSurfaceFinishes();

        expect(result).toHaveLength(3);
        expect(result[1]).toMatchObject({ id: 1, name: 'Poliranje (Polished)', cost_sqm: 15 });
        expect(mockFrom).toHaveBeenCalledWith('surface_finishes');
        expect(mockSelect).toHaveBeenCalledWith('id, name, cost_sqm');
    });

    it('throws when Supabase returns an error', async () => {
        mockSupabaseQuery(null, { message: 'permission denied' });

        await expect(getSurfaceFinishes()).rejects.toThrow('Failed to fetch surface finishes.');
    });
});

// ────────────────────────────────────────────────────────────────────────────
// getEdgeProfiles
// ────────────────────────────────────────────────────────────────────────────
describe('getEdgeProfiles()', () => {
    const sampleProfiles = [
        { id: 1, name: 'Ravni rez (Pilan)', cost_m: 2 },
        { id: 10, name: 'Smuš C0.5 (0.5mm)', cost_m: 5 },
        { id: 20, name: 'Polu-zaobljena R1cm', cost_m: 12 },
    ];

    it('returns an array of EdgeProfile objects on success', async () => {
        mockSupabaseQuery(sampleProfiles, null);

        const result = await getEdgeProfiles();

        expect(result).toHaveLength(3);
        expect(result[2]).toMatchObject({ id: 20, name: 'Polu-zaobljena R1cm', cost_m: 12 });
        expect(mockFrom).toHaveBeenCalledWith('edge_profiles');
        expect(mockSelect).toHaveBeenCalledWith('id, name, cost_m');
    });

    it('throws when Supabase returns an error', async () => {
        mockSupabaseQuery(null, { message: 'network timeout' });

        await expect(getEdgeProfiles()).rejects.toThrow('Failed to fetch edge profiles.');
    });
});

// ────────────────────────────────────────────────────────────────────────────
// getWarehouseData (deprecated alias)
// ────────────────────────────────────────────────────────────────────────────
describe('getWarehouseData() — deprecated alias', () => {
    it('delegates to getMaterials() and returns the same data', async () => {
        const sampleMaterials = [
            { id: 1, name: 'Plano', density: 2.7, cost_sqm: 220, texture: '', color: '#EAE6D9' },
        ];
        mockSupabaseQuery(sampleMaterials, null);

        const result = await getWarehouseData();

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Plano');
        expect(mockFrom).toHaveBeenCalledWith('materials');
    });
});
