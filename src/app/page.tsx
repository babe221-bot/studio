import { Header } from '@/components/Header';
import { Lab } from '@/components/Lab';
import { AIAssistant } from '@/components/AIAssistant';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <Lab />
      <AIAssistant />
    </div>
  );
}
