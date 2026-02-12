import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DocumentUploadAreaProps {
  year: number;
  onUpload: (content: string, documentType: string) => void;
}

export default function DocumentUploadArea({ year, onUpload }: DocumentUploadAreaProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Planning Document</CardTitle>
        <CardDescription>
          Upload images or documents for automatic analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Document upload component - to be implemented
        </p>
      </CardContent>
    </Card>
  );
}
