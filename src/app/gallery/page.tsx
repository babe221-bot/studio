'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ProjectVersion } from '@/types';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function GalleryPage() {
  const [projects, setProjects] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGallery() {
      try {
        const { data, error } = await supabase
          .from('project_versions')
          .select('*')
          .eq('is_public', true)
          .order('timestamp', { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (err) {
        console.error('Gallery fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchGallery();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Učitavanje galerije...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Inspiracija iz zajednice</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Pregledajte javne projekte i prilagodite ih svojim potrebama u našem
          3D studiju.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border-2 border-dashed">
          <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Galerija je trenutno prazna</h3>
          <p className="text-muted-foreground mt-2">
            Budite prvi koji će podijeliti svoj projekt!
          </p>
          <Button asChild className="mt-6">
            <Link href="/">Započni dizajn</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow"
            >
              <div className="aspect-video bg-muted flex items-center justify-center relative">
                {project.items[0]?.planSnapshotDataUri ? (
                  <Image
                    src={project.items[0].planSnapshotDataUri}
                    alt={project.name}
                    fill
                    className="object-contain p-4"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                )}
                <div className="absolute top-3 right-3 bg-background/80 backdrop-blur px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                  {project.items.length} stavki
                </div>
              </div>
              <CardHeader>
                <CardTitle className="text-lg line-clamp-1">
                  {project.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Glavni materijal:{' '}
                  <span className="font-medium text-foreground">
                    {project.items[0]?.material.name || 'N/A'}
                  </span>
                </p>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-2 italic">
                  {project.notes ? `"${project.notes}"` : 'Nema opisa.'}
                </p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button asChild className="w-full gap-2">
                  <Link href={`/share/${project.share_token || project.id}`}>
                    Pogledaj u Studiju <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
