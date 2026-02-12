import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ChangeManagementDashboardProps {
  year: number;
}

export default function ChangeManagementDashboard({ year }: ChangeManagementDashboardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Execution Dashboard</CardTitle>
        <CardDescription>
          Track and manage approved changes for {year}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Change management dashboard component - to be implemented
        </p>
      </CardContent>
    </Card>
  );
}
