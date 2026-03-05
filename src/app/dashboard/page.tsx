"use client";

import React from 'react';
import { useProjectHistory } from '@/hooks/useProjectHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, FileText, LayoutTemplate, ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { hr } from 'date-fns/locale';

export default function DashboardPage() {
    const { versions, templates, deleteVersion, deleteTemplate } = useProjectHistory();

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Upravljačka ploča</h1>
                    <p className="text-muted-foreground">Pregledajte vaše spremljene projekte i predloške</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Povratak u Lab
                    </Link>
                </Button>
            </div>

            <Tabs defaultValue="history" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Povijest verzija ({versions.length})
                    </TabsTrigger>
                    <TabsTrigger value="templates" className="flex items-center gap-2">
                        <LayoutTemplate className="h-4 w-4" />
                        Predlošci ({templates.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Povijest verzija</CardTitle>
                            <CardDescription>
                                Vaše spremljene točke u vremenu. Kliknite na "Lab" za povratak i nastavak rada.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[500px] pr-4">
                                {versions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                        <Clock className="h-12 w-12 mb-4 opacity-20" />
                                        <p>Još niste spremili nijednu verziju projekta.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {versions.map((version) => (
                                            <Card key={version.id} className="overflow-hidden">
                                                <CardHeader className="pb-3">
                                                    <div className="flex justify-between items-start">
                                                        <CardTitle className="text-lg truncate mr-2">{version.name}</CardTitle>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => deleteVersion(version.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <CardDescription className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {format(version.timestamp, 'PPp', { locale: hr })}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[2.5rem]">
                                                        {version.notes || 'Nema opisa.'}
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs text-muted-foreground bg-muted/50 p-2 rounded mb-4">
                                                        <span>{version.items.length} stavki</span>
                                                        <span>€{version.items.reduce((sum, item) => sum + item.totalCost, 0).toFixed(2)}</span>
                                                    </div>
                                                    <Button variant="secondary" className="w-full" asChild>
                                                        <Link href={`/?version=${version.id}`}>
                                                            Otvori u Labu
                                                        </Link>
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="templates">
                    <Card>
                        <CardHeader>
                            <CardTitle>Moji predlošci</CardTitle>
                            <CardDescription>
                                Spremljene konfiguracije koje možete ponovno koristiti kao bazu za nove projekte.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[500px] pr-4">
                                {templates.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                        <LayoutTemplate className="h-12 w-12 mb-4 opacity-20" />
                                        <p>Još niste kreirali nijedan predložak.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {templates.map((template) => (
                                            <Card key={template.id} className="overflow-hidden">
                                                <CardHeader className="pb-3">
                                                    <div className="flex justify-between items-start">
                                                        <CardTitle className="text-lg truncate mr-2">{template.name}</CardTitle>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => deleteTemplate(template.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <CardDescription>
                                                        Kreirano {format(template.createdAt, 'PP', { locale: hr })}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[2.5rem]">
                                                        {template.description || 'Nema opisa.'}
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs text-muted-foreground bg-muted/50 p-2 rounded mb-4">
                                                        <span>{template.items.length} stavki</span>
                                                    </div>
                                                    <Button variant="secondary" className="w-full" asChild>
                                                        <Link href={`/?template=${template.id}`}>
                                                            Koristi predložak
                                                        </Link>
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
