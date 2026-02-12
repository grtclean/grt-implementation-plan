/**
 * Organization Structure Input Form Component
 * Placeholder - to be implemented in Phase 4
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface OrgStructureFormProps {
  year: number;
  onSubmit: (content: string, documentType: string) => void;
}

export default function OrgStructureForm({ year, onSubmit }: OrgStructureFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Structure</CardTitle>
        <CardDescription>
          Define organizational changes for {year}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Organization structure form component - to be implemented
        </p>
      </CardContent>
    </Card>
  );
}
