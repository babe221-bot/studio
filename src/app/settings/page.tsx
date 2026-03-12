'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { EmailPreferences } from '@/types';

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const PYTHON_API_URL =
    process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchPreferences = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${PYTHON_API_URL}/api/preferences`);
        if (response.ok) {
          setPreferences(await response.json());
        } else {
          console.error('Failed to fetch preferences', await response.text());
          setError('Failed to load preferences.');
        }
      } catch (err) {
        console.error('Error fetching preferences:', err);
        setError('An unexpected error occurred while fetching preferences.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPreferences();
  }, []);

  const handlePreferenceChange = (
    key: keyof EmailPreferences,
    value: boolean
  ) => {
    setPreferences((prev: EmailPreferences | null) =>
      prev ? { ...prev, [key]: value } : null
    );
  };

  const handleSavePreferences = async () => {
    if (!preferences) return;

    try {
      const response = await fetch(`${PYTHON_API_URL}/api/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_preferences: preferences }),
      });

      if (response.ok) {
        toast({
          title: 'Preferences saved',
          description: 'Your email notification settings have been updated.',
        });
      } else {
        console.error('Failed to save preferences', await response.text());
        setError('Failed to save preferences.');
        toast({
          title: 'Error',
          description: 'Failed to save preferences.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError('An unexpected error occurred.');
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <p>Loading settings...</p>;
  }

  if (error) {
    return <p className="text-destructive">Error: {error}</p>;
  }

  return (
    <div className="grid gap-6">
      <h2 className="text-3xl font-bold tracking-tight">
        Email Notification Settings
      </h2>
      <Card>
        <CardHeader>
          <CardTitle>Manage Your Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {preferences &&
              Object.keys(preferences).map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between space-x-4 rounded-md border p-3 shadow-sm"
                >
                  <div className="space-y-1">
                    <Label htmlFor={key} className="capitalize">
                      {key.replace(/_/g, ' ')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Receive notifications for {key.replace(/_/g, ' ')}{' '}
                      updates.
                    </p>
                  </div>
                  <Switch
                    id={key}
                    checked={preferences[key as keyof EmailPreferences]}
                    onCheckedChange={(checked) =>
                      handlePreferenceChange(
                        key as keyof EmailPreferences,
                        !!checked
                      )
                    }
                  />
                </div>
              ))}
          </div>
        </CardContent>
        <CardFooter className="pt-4 border-t">
          <Button onClick={handleSavePreferences} disabled={!preferences}>
            Save Preferences
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
