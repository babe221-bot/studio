"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-destructive/10 rounded-lg border border-destructive/20 min-h-[200px]">
                    <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Oops, nešto je pošlo po zlu</h2>
                    <p className="text-muted-foreground mb-6 max-w-md">
                        Došlo je do pogreške prilikom prikazivanja ove komponente.
                        Možete pokušati osvježiti prikaz ili se vratiti kasnije.
                    </p>
                    <Button onClick={handleReset} variant="outline" className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Pokušaj ponovno
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
