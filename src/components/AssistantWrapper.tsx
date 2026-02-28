'use client';

import dynamic from 'next/dynamic';

const AIAssistant = dynamic(() => import('@/components/AIAssistant').then(mod => mod.AIAssistant), {
    ssr: false,
    loading: () => <div className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary/10 animate-pulse" />
});

export function AssistantWrapper() {
    return <AIAssistant />;
}
