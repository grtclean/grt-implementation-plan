import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProcessImprovementFormProps {
  year: number;
  onSubmit: (content: string, documentType: string) => void;
}

export default function ProcessImprovementForm({ year, onSubmit }: ProcessImprovementFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Process Improvements</CardTitle>
        <CardDescription>
          Define process improvement initiatives for {year}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Process improvement form component - to be implemented
        </p>
      </CardContent>
    </Card>
  );
}
