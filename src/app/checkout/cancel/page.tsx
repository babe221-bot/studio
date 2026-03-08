import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export default function CancelPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <XCircle className="w-16 h-16 text-red-500 mb-4" />
      <h1 className="text-2xl font-bold mb-2">Plaćanje otkazano</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        Postupak plaćanja je prekinut. Vaš radni nalog je i dalje dostupan u
        studiju ukoliko se odlučite za nastavak kasnije.
      </p>
      <div className="flex gap-4">
        <Button asChild variant="outline">
          <Link href="/">Povratak u studio</Link>
        </Button>
      </div>
    </div>
  );
}
