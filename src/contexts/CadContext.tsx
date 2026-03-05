'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { CADContextData } from '@/lib/cad-context';

interface CadContextType {
    cadData: CADContextData;
    setCadData: React.Dispatch<React.SetStateAction<CADContextData>>;
}

const CadContext = createContext<CadContextType | undefined>(undefined);

export function CadProvider({ children }: { children: ReactNode }) {
    const [cadData, setCadData] = useState<CADContextData>({});

    return (
        <CadContext.Provider value={{ cadData, setCadData }}>
            {children}
        </CadContext.Provider>
    );
}

export function useCadContext() {
    const context = useContext(CadContext);
    if (context === undefined) {
        throw new Error('useCadContext must be used within a CadProvider');
    }
    return context;
}