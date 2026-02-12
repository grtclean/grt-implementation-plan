import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Calculator, 
  Loader2, 
  FileText,
  Sparkles,
  TrendingUp,
  DollarSign,
  Clock,
  Users,
  Package,
  Download,
  RefreshCw
} from "lucide-react";

interface QuotationItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  aiSuggestion?: string;
}

interface QuotationSummary {
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  profitMargin: number;
  totalPrice: number;
  competitiveAnalysis: {
    marketAverage: number;
    ourPosition: string;
    recommendation: string;
  };
}

export default function AIQuotationAssistant() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [summary, setSummary] = useState<QuotationSummary | null>(null);

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      'title': { zh: 'AI 报价助手', en: 'AI Quotation Assistant', de: 'KI-Angebotsassistent', fr: 'Assistant Devis IA' },
      'subtitle': { zh: '智能生成项目报价，基于历史数据和市场分析', en: 'Intelligently generate project quotations based on historical data and market analysis', de: 'Intelligente Angebotserstellung basierend auf historischen Daten', fr: 'Génération intelligente de devis basée sur les données historiques' },
      'newQuote': { zh: '新建报价', en: 'New Quote', de: 'Neues Angebot', fr: 'Nouveau devis' },
      'templates': { zh: '报价模板', en: 'Templates', de: 'Vorlagen', fr: 'Modèles' },
      'projectName': { zh: '项目名称', en: 'Project Name', de: 'Projektname', fr: 'Nom du projet' },
      'generate': { zh: '生成报价', en: 'Generate Quote', de: 'Angebot erstellen', fr: 'Générer le devis' },
      'generating': { zh: '正在生成...', en: 'Generating...', de: 'Wird erstellt...', fr: 'Génération en cours...' },
      'category': { zh: '类别', en: 'Category', de: 'Kategorie', fr: 'Catégorie' },
      'description': { zh: '描述', en: 'Description', de: 'Beschreibung', fr: 'Description' },
      'quantity': { zh: '数量', en: 'Qty', de: 'Menge', fr: 'Qté' },
      'unitPrice': { zh: '单价', en: 'Unit Price', de: 'Stückpreis', fr: 'Prix unitaire' },
      'totalPrice': { zh: '总价', en: 'Total', de: 'Gesamt', fr: 'Total' },
      'materialCost': { zh: '材料成本', en: 'Material Cost', de: 'Materialkosten', fr: 'Coût matériel' },
      'laborCost': { zh: '人工成本', en: 'Labor Cost', de: 'Arbeitskosten', fr: 'Coût main d\'œuvre' },
      'overheadCost': { zh: '管理费用', en: 'Overhead', de: 'Gemeinkosten', fr: 'Frais généraux' },
      'profitMargin': { zh: '利润率', en: 'Profit Margin', de: 'Gewinnspanne', fr: 'Marge bénéficiaire' },
      'totalQuote': { zh: '报价总额', en: 'Total Quote', de: 'Gesamtangebot', fr: 'Devis total' },
      'marketAnalysis': { zh: '市场分析', en: 'Market Analysis', de: 'Marktanalyse', fr: 'Analyse de marché' },
      'marketAverage': { zh: '市场均价', en: 'Market Average', de: 'Marktdurchschnitt', fr: 'Moyenne du marché' },
      'ourPosition': { zh: '我们的定位', en: 'Our Position', de: 'Unsere Position', fr: 'Notre position' },
      'recommendation': { zh: 'AI建议', en: 'AI Recommendation', de: 'KI-Empfehlung', fr: 'Recommandation IA' },
      'exportPDF': { zh: '导出PDF', en: 'Export PDF', de: 'PDF exportieren', fr: 'Exporter PDF' },
      'regenerate': { zh: '重新生成', en: 'Regenerate', de: 'Neu generieren', fr: 'Régénérer' },
    };
    return translations[key]?.[language] || translations[key]?.['en'] || key;
  };

  const handleGenerate = async () => {
    if (!projectName) {
      toast({
        title: language === 'zh' ? '请输入项目名称' : 'Please enter project name',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Mock quotation items
      setItems([
        { id: '1', category: '主设备', description: '超声波清洗槽 (40kHz, 1000L)', quantity: 3, unitPrice: 45000, totalPrice: 135000 },
        { id: '2', category: '主设备', description: '真空干燥槽', quantity: 1, unitPrice: 68000, totalPrice: 68000 },
        { id: '3', category: '传输系统', description: '自动传输机构', quantity: 1, unitPrice: 85000, totalPrice: 85000 },
        { id: '4', category: '控制系统', description: 'PLC控制柜 (西门子S7-1500)', quantity: 1, unitPrice: 42000, totalPrice: 42000, aiSuggestion: '建议升级到触摸屏HMI' },
        { id: '5', category: '辅助设备', description: '过滤循环系统', quantity: 1, unitPrice: 28000, totalPrice: 28000 },
        { id: '6', category: '安装调试', description: '现场安装调试服务', quantity: 1, unitPrice: 35000, totalPrice: 35000 },
      ]);

      setSummary({
        materialCost: 358000,
        laborCost: 45000,
        overheadCost: 32000,
        profitMargin: 18,
        totalPrice: 512820,
        competitiveAnalysis: {
          marketAverage: 550000,
          ourPosition: '低于市场均价7%',
          recommendation: '当前报价具有竞争力，建议保持。如客户预算充足，可推荐升级HMI系统增加利润空间。'
        }
      });

      toast({
        title: language === 'zh' ? '报价生成完成' : 'Quote Generated',
        description: language === 'zh' ? '已基于历史数据生成智能报价' : 'Smart quote generated based on historical data',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate quote',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="w-6 h-6 text-primary" />
          {t('title')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      <Tabs defaultValue="new" className="space-y-4">
        <TabsList>
          <TabsTrigger value="new" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {t('newQuote')}
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {t('templates')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{language === 'zh' ? '项目信息' : 'Project Info'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('projectName')}</Label>
                  <Input 
                    placeholder={language === 'zh' ? '输入项目名称' : 'Enter project name'}
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('generating')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('generate')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {items.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{language === 'zh' ? '报价明细' : 'Quote Details'}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-1" />
                        {t('regenerate')}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        {t('exportPDF')}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('category')}</TableHead>
                        <TableHead>{t('description')}</TableHead>
                        <TableHead className="text-right">{t('quantity')}</TableHead>
                        <TableHead className="text-right">{t('unitPrice')}</TableHead>
                        <TableHead className="text-right">{t('totalPrice')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge variant="outline">{item.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              {item.description}
                              {item.aiSuggestion && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-primary">
                                  <Sparkles className="w-3 h-3" />
                                  {item.aiSuggestion}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        {language === 'zh' ? '成本分析' : 'Cost Analysis'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          <span>{t('materialCost')}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(summary.materialCost)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{t('laborCost')}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(summary.laborCost)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{t('overheadCost')}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(summary.overheadCost)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t pt-4">
                        <span>{t('profitMargin')}</span>
                        <Badge className="bg-green-500/20 text-green-500">{summary.profitMargin}%</Badge>
                      </div>
                      <div className="flex items-center justify-between border-t pt-4">
                        <span className="font-semibold">{t('totalQuote')}</span>
                        <span className="text-xl font-bold text-primary">{formatCurrency(summary.totalPrice)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        {t('marketAnalysis')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>{t('marketAverage')}</span>
                        <span className="font-medium">{formatCurrency(summary.competitiveAnalysis.marketAverage)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{t('ourPosition')}</span>
                        <Badge className="bg-blue-500/20 text-blue-500">{summary.competitiveAnalysis.ourPosition}</Badge>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-primary mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-primary">{t('recommendation')}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {summary.competitiveAnalysis.recommendation}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{language === 'zh' ? '报价模板功能即将上线' : 'Quote templates coming soon'}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
