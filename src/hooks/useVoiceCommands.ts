"use client";

import { useEffect, useState, useCallback } from 'react';

interface VoiceCommandHandlers {
    setLength: (val: number) => void;
    setWidth: (val: number) => void;
    setHeight: (val: number) => void;
    addToOrder: () => void;
    downloadPdf: () => void;
    reset: () => void;
}

export function useVoiceCommands(handlers: VoiceCommandHandlers) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    const startListening = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            setError("Speech recognition not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'hr-HR'; // Croatian
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => setError(event.error);

        recognition.onresult = (event: any) => {
            const current = event.resultIndex;
            const result = event.results[current][0].transcript.toLowerCase();
            setTranscript(result);

            if (event.results[current].isFinal) {
                processCommand(result);
            }
        };

        recognition.start();
        return recognition;
    }, [handlers]);

    const processCommand = (cmd: string) => {
        console.log("Voice Command:", cmd);

        // Regex for numbers
        const numMatch = cmd.match(/\d+/);
        const val = numMatch ? parseInt(numMatch[0]) : null;

        if (cmd.includes('dužina') || cmd.includes('dužinu')) {
            if (val) handlers.setLength(val);
        } else if (cmd.includes('širina') || cmd.includes('širinu')) {
            if (val) handlers.setWidth(val);
        } else if (cmd.includes('debljina') || cmd.includes('debljinu')) {
            if (val) handlers.setHeight(val);
        } else if (cmd.includes('dodaj') || cmd.includes('ubaci')) {
            handlers.addToOrder();
        } else if (cmd.includes('pdf') || cmd.includes('preuzmi') || cmd.includes('nalog')) {
            handlers.downloadPdf();
        } else if (cmd.includes('reset') || cmd.includes('obriši')) {
            handlers.reset();
        }
    };

    return { isListening, transcript, error, startListening };
}
