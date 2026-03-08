'use client';

import { useEffect, useState, use } from 'react';
import { useSupabasePersistence } from '@/hooks/useSupabasePersistence';
import { ProjectVersion } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowRight, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { fetchSharedProject } = useSupabasePersistence();
  const [project, setProject] = useState<ProjectVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchSharedProject(token);
        setProject(data);
      } catch (err: any) {
        setError('Projekt nije pronađen ili je uklonjen.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, fetchSharedProject]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          Učitavanje dijeljenog projekta...
        </p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <Share2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold">Ups!</h1>
        <p className="text-muted-foreground mt-2">
          {error || 'Projekt nije dostupan.'}
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Povratak u studio</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{project.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Podijeljen projekt s {project.items.length} stavki
              </p>
            </div>
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
              Dijeljeno
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-2">Pregled materijala:</h3>
            <ul className="text-sm space-y-1">
              {project.items.map((item, i) => (
                <li key={i} className="flex justify-between">
                  <span>
                    {item.id} - {item.material.name}
                  </span>
                  <span className="font-medium">
                    €{item.totalCost.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {project.notes && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Napomene:
              </h3>
              <p className="text-sm italic text-muted-foreground border-l-2 pl-4">
                "{project.notes}"
              </p>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1"
              onClick={() => {
                // We'll use a URL param to tell the Lab to load this
                router.push(`/?shared_token=${token}`);
              }}
            >
              Otvori u Studiju <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Izradi novi projekt</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
