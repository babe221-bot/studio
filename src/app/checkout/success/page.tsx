import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export default function SuccessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
      <h1 className="text-2xl font-bold mb-2">Uplata uspješna!</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        Vaša uplata depozita je uspješno obrađena. Naš tim će vas kontaktirati
        uskoro radi dogovora o daljnjim koracima i detaljima projekta.
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/">Povratak u studio</Link>
        </Button>
      </div>
    </div>
  );
}
