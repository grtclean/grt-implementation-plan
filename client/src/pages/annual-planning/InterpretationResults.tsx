import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface InterpretationResultsProps {
  interpretation: any;
  onApprove: () => void;
}

export default function InterpretationResults({ interpretation, onApprove }: InterpretationResultsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Interpretation Results</CardTitle>
        <CardDescription>
          Review AI-generated insights and recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Interpretation results component - to be implemented
        </p>
        <Button onClick={onApprove}>Proceed to Confirmation</Button>
      </CardContent>
    </Card>
  );
}
