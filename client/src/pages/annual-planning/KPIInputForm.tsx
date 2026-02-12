/**
 * KPI Input Form Component
 * Allows administrators to input annual KPIs
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Send } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface KPI {
  id: string;
  name: string;
  category: string;
  target: number;
  unit: string;
  owner?: string;
  description?: string;
  calculationMethod?: string;
  dataSource?: string;
  reviewFrequency?: string;
}

interface KPIInputFormProps {
  year: number;
  onSubmit: (content: string, documentType: string) => void;
}

export default function KPIInputForm({ year, onSubmit }: KPIInputFormProps) {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<Partial<KPI>>({
    name: '',
    category: 'Revenue',
    target: 0,
    unit: '',
    owner: '',
    description: '',
    calculationMethod: '',
    dataSource: 'System',
    reviewFrequency: 'Monthly'
  });

  const handleAddKPI = () => {
    if (!formData.name || !formData.unit) {
      alert('Please fill in required fields');
      return;
    }

    const newKPI: KPI = {
      id: `kpi-${Date.now()}`,
      name: formData.name || '',
      category: formData.category || 'Revenue',
      target: formData.target || 0,
      unit: formData.unit || '',
      owner: formData.owner,
      description: formData.description,
      calculationMethod: formData.calculationMethod,
      dataSource: formData.dataSource,
      reviewFrequency: formData.reviewFrequency
    };

    if (editingId) {
      setKpis(kpis.map(k => k.id === editingId ? newKPI : k));
      setEditingId(null);
    } else {
      setKpis([...kpis, newKPI]);
    }

    // Reset form
    setFormData({
      name: '',
      category: 'Revenue',
      target: 0,
      unit: '',
      owner: '',
      description: '',
      calculationMethod: '',
      dataSource: 'System',
      reviewFrequency: 'Monthly'
    });
  };

  const handleEditKPI = (kpi: KPI) => {
    setFormData(kpi);
    setEditingId(kpi.id);
  };

  const handleDeleteKPI = (id: string) => {
    setKpis(kpis.filter(k => k.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setFormData({
        name: '',
        category: 'Revenue',
        target: 0,
        unit: '',
        owner: '',
        description: '',
        calculationMethod: '',
        dataSource: 'System',
        reviewFrequency: 'Monthly'
      });
    }
  };

  const handleSubmit = async () => {
    if (kpis.length === 0) {
      alert('Please add at least one KPI');
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert KPIs to text for interpretation
      const content = kpis.map(k => `
        KPI: ${k.name}
        Category: ${k.category}
        Target: ${k.target} ${k.unit}
        Owner: ${k.owner || 'Unassigned'}
        Description: ${k.description || 'N/A'}
        Calculation Method: ${k.calculationMethod || 'N/A'}
        Data Source: ${k.dataSource || 'System'}
        Review Frequency: ${k.reviewFrequency || 'Monthly'}
      `).join('\n---\n');

      // Call the submission handler
      onSubmit(content, 'KPI');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add KPI</CardTitle>
          <CardDescription>
            Define annual Key Performance Indicators for {year}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="kpi-name">KPI Name *</Label>
              <Input
                id="kpi-name"
                placeholder="e.g., Annual Revenue"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="kpi-category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger id="kpi-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Revenue">Revenue</SelectItem>
                  <SelectItem value="Cost">Cost</SelectItem>
                  <SelectItem value="Quality">Quality</SelectItem>
                  <SelectItem value="Delivery">Delivery</SelectItem>
                  <SelectItem value="Customer">Customer</SelectItem>
                  <SelectItem value="Employee">Employee</SelectItem>
                  <SelectItem value="Innovation">Innovation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="kpi-target">Target Value *</Label>
              <Input
                id="kpi-target"
                type="number"
                placeholder="0"
                value={formData.target || ''}
                onChange={(e) => setFormData({ ...formData, target: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <Label htmlFor="kpi-unit">Unit *</Label>
              <Input
                id="kpi-unit"
                placeholder="e.g., Million USD"
                value={formData.unit || ''}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="kpi-owner">Owner</Label>
              <Input
                id="kpi-owner"
                placeholder="Person responsible"
                value={formData.owner || ''}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="kpi-datasource">Data Source</Label>
              <Select value={formData.dataSource} onValueChange={(value) => setFormData({ ...formData, dataSource: value })}>
                <SelectTrigger id="kpi-datasource">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="System">System</SelectItem>
                  <SelectItem value="Manual">Manual</SelectItem>
                  <SelectItem value="External">External</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="kpi-frequency">Review Frequency</Label>
              <Select value={formData.reviewFrequency} onValueChange={(value) => setFormData({ ...formData, reviewFrequency: value })}>
                <SelectTrigger id="kpi-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="kpi-description">Description</Label>
            <Textarea
              id="kpi-description"
              placeholder="Detailed description of this KPI"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="kpi-calculation">Calculation Method</Label>
            <Textarea
              id="kpi-calculation"
              placeholder="How is this KPI calculated?"
              value={formData.calculationMethod || ''}
              onChange={(e) => setFormData({ ...formData, calculationMethod: e.target.value })}
              rows={2}
            />
          </div>

          <Button onClick={handleAddKPI} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            {editingId ? 'Update KPI' : 'Add KPI'}
          </Button>
        </CardContent>
      </Card>

      {/* KPI List */}
      {kpis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>KPIs ({kpis.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {kpis.map((kpi) => (
                <div key={kpi.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-grow">
                      <h3 className="font-semibold text-foreground">{kpi.name}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Category:</span> {kpi.category}
                        </div>
                        <div>
                          <span className="font-medium">Target:</span> {kpi.target} {kpi.unit}
                        </div>
                        <div>
                          <span className="font-medium">Owner:</span> {kpi.owner || 'Unassigned'}
                        </div>
                        <div>
                          <span className="font-medium">Frequency:</span> {kpi.reviewFrequency}
                        </div>
                      </div>
                      {kpi.description && (
                        <p className="text-sm text-muted-foreground mt-2">{kpi.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditKPI(kpi)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteKPI(kpi.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      {kpis.length > 0 && (
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Processing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit for AI Analysis
            </>
          )}
        </Button>
      )}
    </div>
  );
}
