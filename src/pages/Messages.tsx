import { MobileLayout } from '@/components/layout/MobileLayout';

export default function Messages() {
  return (
    <MobileLayout>
      <div className="px-4 py-4">
        <h1 className="text-2xl font-bold text-foreground mb-4">Wiadomości</h1>
        <p className="text-muted-foreground">Wkrótce...</p>
      </div>
    </MobileLayout>
  );
}
