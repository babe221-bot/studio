'use client';

import React, { useState, useEffect } from 'react';
import { ProjectTemplate, OrderItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  FolderOpen,
  Trash2,
  Star,
  StarOff,
  Calendar,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  templateService,
  type TemplateFilters,
} from '@/lib/supabase/templates';

interface TemplateBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (items: OrderItem[]) => void;
}

export function TemplateBrowser({
  open,
  onOpenChange,
  onApply,
}: TemplateBrowserProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] =
    useState<ProjectTemplate | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Load templates on mount or when dialog opens
  useEffect(() => {
    if (open) {
      loadTemplates();
      loadFavorites();
    }
  }, [open]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await templateService.fetchAll();
      setTemplates(data);
    } catch (err) {
      console.error('Error loading templates:', err);
      toast({
        title: 'Greška',
        description: 'Neuspjelo učitavanje predložaka.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = () => {
    try {
      const stored = localStorage.getItem('template_favorites');
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)));
      }
    } catch {
      // Ignore
    }
  };

  const toggleFavorite = (id: string) => {
    const next = new Set(favorites);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setFavorites(next);
    localStorage.setItem('template_favorites', JSON.stringify([...next]));
  };

  const handleDelete = async (id: string) => {
    try {
      await templateService.delete(id);
      setTemplates(templates.filter((t) => t.id !== id));
      toast({
        title: 'Predložak obrisan',
        description: 'Predložak je uspješno obrisan.',
      });
    } catch (err) {
      toast({
        title: 'Greška',
        description: 'Neuspjelo brisanje predloška.',
        variant: 'destructive',
      });
    }
  };

  const handleApply = () => {
    if (selectedTemplate) {
      onApply(selectedTemplate.items);
      onOpenChange(false);
      toast({
        title: 'Predložak primijenjen',
        description: `Primijenjen predložak "${selectedTemplate.name}".`,
      });
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('hr-HR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Predlošci</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4">
          {/* Template List */}
          <div className="flex-1">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Traži predloške..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[400px] pr-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Učitavanje...
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery
                    ? 'Nema pronađenih predložaka.'
                    : 'Nema dostupnih predložaka.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">
                            {template.name}
                          </h4>
                          {template.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(template.createdAt)}
                            </span>
                            <span>{template.items.length} stavki</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(template.id);
                            }}
                          >
                            {favorites.has(template.id) ? (
                              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                            ) : (
                              <StarOff className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(template.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Template Details */}
          <div className="w-64 border-l pl-4">
            {selectedTemplate ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">{selectedTemplate.name}</h3>
                  {selectedTemplate.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTemplate.description}
                    </p>
                  )}
                </div>

                <div className="text-sm">
                  <h4 className="font-medium mb-2">
                    Stavke ({selectedTemplate.items.length})
                  </h4>
                  <ScrollArea className="h-48">
                    <div className="space-y-1">
                      {selectedTemplate.items.map((item, i) => (
                        <div key={i} className="text-xs p-2 bg-muted rounded">
                          <div className="font-medium">
                            {item.dims.length} × {item.dims.width} ×{' '}
                            {item.dims.height} cm
                          </div>
                          <div className="text-muted-foreground">
                            {item.material.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <Button onClick={handleApply} className="w-full">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Primijeni predložak
                </Button>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Odaberite predložak za pregled
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
