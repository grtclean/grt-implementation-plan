import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ConfirmationWorkflowProps {
  interpretation: any;
  year: number;
  onComplete: () => void;
}

export default function ConfirmationWorkflow({ interpretation, year, onComplete }: ConfirmationWorkflowProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Multi-Level Confirmation Workflow</CardTitle>
        <CardDescription>
          Review and approve changes through 4 confirmation levels
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Confirmation workflow component - to be implemented
        </p>
      </CardContent>
    </Card>
  );
}
