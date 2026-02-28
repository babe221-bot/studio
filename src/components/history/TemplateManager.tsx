"use client";

import React, { useState } from 'react';
import { ProjectTemplate, OrderItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, FolderOpen, Trash2, LayoutTemplate } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface TemplateManagerProps {
    templates: ProjectTemplate[];
    currentItems: OrderItem[];
    onSave: (name: string, items: OrderItem[]) => void;
    onLoad: (items: OrderItem[]) => void;
    onDelete: (id: string) => void;
}

export function TemplateManager({ templates, currentItems, onSave, onLoad, onDelete }: TemplateManagerProps) {
    const { toast } = useToast();
    const [templateName, setTemplateName] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleSave = () => {
        if (!templateName.trim()) {
            toast({ title: "Greška", description: "Unesite naziv predloška.", variant: "destructive" });
            return;
        }
        if (currentItems.length === 0) {
            toast({ title: "Greška", description: "Nalog je prazan. Dodajte stavke prije spremanja predloška.", variant: "destructive" });
            return;
        }
        onSave(templateName, currentItems);
        setTemplateName('');
        setIsDialogOpen(false);
        toast({ title: "Predložak spremljen", description: `Predložak "${templateName}" je uspješno kreiran.` });
    };

    return (
        <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2" disabled={currentItems.length === 0}>
                        <Save className="h-4 w-4" />
                        Spremi kao predložak
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Spremi kao predložak projekta</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="template-name">Naziv predloška (npr. Standardni kuhinjski otok)</Label>
                            <Input
                                id="template-name"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="Unesite naziv..."
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Ovo će spremiti trenutnih {currentItems.length} stavki iz naloga kao višekratno upotrebljiv predložak.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Odustani</Button>
                        <Button onClick={handleSave}>Spremi predložak</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                        <FolderOpen className="h-4 w-4" />
                        Učitaj predložak
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <LayoutTemplate className="h-5 w-5" />
                            Vaši predlošci projekata
                        </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[300px] mt-4">
                        <div className="space-y-2 pr-4">
                            {templates.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8 italic">Nema spremljenih predložaka.</p>
                            ) : (
                                templates.map((template) => (
                                    <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 group">
                                        <div className="flex-1 cursor-pointer" onClick={() => {
                                            onLoad(template.items);
                                            toast({ title: "Predložak učitan", description: `Projekt "${template.name}" je učitan.` });
                                        }}>
                                            <h4 className="font-medium">{template.name}</h4>
                                            <p className="text-xs text-muted-foreground">{template.items.length} stavki</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onDelete(template.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}
