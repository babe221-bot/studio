"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { listPdfsFromStorage } from '@/app/actions';
import { FileText, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

interface PdfFile {
  name: string;
  url: string;
}

export function WorkOrderHistory() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listPdfsFromStorage();
      if (result.success && result.pdfs) {
        // Sort files by name descending, assuming name contains a timestamp
        const sortedFiles = result.pdfs.sort((a, b) => b.name.localeCompare(a.name));
        setFiles(sortedFiles);
      } else {
        setError(result.error || 'Nepoznata greška pri dohvaćanju datoteka.');
      }
    } catch (e: any) {
      setError(e.message || 'Greška pri komunikaciji sa serverom.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Arhiva Radnih Naloga (Cloud Storage)</CardTitle>
        <Button variant="ghost" size="icon" onClick={fetchFiles} disabled={isLoading} title="Osvježi popis">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3 pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-4 text-muted-foreground">Učitavanje arhive...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 text-destructive">
                <AlertTriangle className="h-8 w-8" />
                <p className="mt-4 text-center">Greška: {error}</p>
              </div>
            ) : files.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Arhiva radnih naloga je prazna.</p>
            ) : (
              files.map(file => (
                <div key={file.name} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="font-medium">{file.name}</span>
                  </div>
                  <Button asChild variant="secondary" size="sm">
                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                      Otvori PDF
                    </a>
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
