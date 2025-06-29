import { Header } from '@/components/Header';
import { Lab } from '@/components/Lab';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <Lab />
    </div>
  );
}
