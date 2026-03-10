import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function AdminDashboardPage() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is a placeholder for your main dashboard content.</p>
          <p>Use the sidebar to navigate to different sections.</p>
        </CardContent>
      </Card>
    </div>
  );
}
