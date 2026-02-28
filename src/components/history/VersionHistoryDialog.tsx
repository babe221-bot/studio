"use client";

import React, { useState } from 'react';
import { ProjectVersion, OrderItem } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, ArrowLeftRight, Check, Trash2, Clock } from 'lucide-react';
import { DiffViewer } from './DiffViewer';
import { format } from 'date-fns';
import { hr } from 'date-fns/locale';

interface VersionHistoryDialogProps {
    versions: ProjectVersion[];
    currentItems: OrderItem[];
    onRestore: (items: OrderItem[]) => void;
    onDelete: (id: string) => void;
}

export function VersionHistoryDialog({ versions, currentItems, onRestore, onDelete }: VersionHistoryDialogProps) {
    const [selectedVersion, setSelectedVersion] = useState<ProjectVersion | null>(null);
    const [isComparing, setIsComparing] = useState(false);

    const handleRestore = (version: ProjectVersion) => {
        onRestore(version.items);
        setSelectedVersion(null);
        setIsComparing(false);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <History className="h-4 w-4" />
                    Povijest verzija
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Povijest verzija projekta
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col gap-4">
                    {!isComparing ? (
                        <ScrollArea className="flex-1 pr-4">
                            <div className="space-y-3">
                                {versions.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground italic">
                                        Nema spremljenih verzija.
                                    </div>
                                ) : (
                                    versions.map((version) => (
                                        <div
                                            key={version.id}
                                            className={`p-4 rounded-lg border transition-colors cursor-pointer hover:bg-accent/50 ${selectedVersion?.id === version.id ? 'border-primary ring-1 ring-primary' : ''}`}
                                            onClick={() => setSelectedVersion(version)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-semibold">{version.name}</h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        {format(new Date(version.timestamp), 'PPP p', { locale: hr })}
                                                    </p>
                                                    {version.notes && <p className="text-sm mt-2 italic">"{version.notes}"</p>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDelete(version.id);
                                                            if (selectedVersion?.id === version.id) setSelectedVersion(null);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex gap-2">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="text-xs h-7"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedVersion(version);
                                                        setIsComparing(true);
                                                    }}
                                                >
                                                    <ArrowLeftRight className="h-3 w-3 mr-1" />
                                                    Usporedi s trenutnim
                                                </Button>
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    className="text-xs h-7"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRestore(version);
                                                    }}
                                                >
                                                    <Check className="h-3 w-3 mr-1" />
                                                    Vrati ovu verziju
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="flex flex-col gap-4 h-full">
                            <div className="flex items-center justify-between">
                                <Button variant="ghost" size="sm" onClick={() => setIsComparing(false)}>
                                    Natrag na popis
                                </Button>
                                <div className="text-sm font-medium">
                                    Usporedba: <span className="text-primary">{selectedVersion?.name}</span> vs. <span className="text-primary">Trenutno</span>
                                </div>
                            </div>
                            <DiffViewer
                                versionA={selectedVersion?.items || []}
                                versionB={currentItems}
                                labelA={selectedVersion?.name || "Verzija"}
                                labelB="Trenutno stanje"
                            />
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => {
                        setSelectedVersion(null);
                        setIsComparing(false);
                    }}>
                        Zatvori
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
