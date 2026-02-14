import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/grt";
import Layout from "@/components/Layout";
import {
  Lightbulb,
  Send,
  Loader2,
  CheckCircle2,
  History,
  Sparkles,
  FileText,
  Settings,
  ArrowRight
} from "lucide-react";

interface SolutionRecommendation {
  id: string;
  title: string;
  description: string;
  confidence: number;
  matchedCases: number;
  keyFeatures: string[];
  estimatedCost: string;
  estimatedDuration: string;
}

interface CustomerRequirement {
  industry: string;
  cleaningType: string;
  partSize: string;
  throughput: string;
  contaminants: string;
  specialRequirements: string;
}

export default function AISolutionAssistant() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<SolutionRecommendation[]>([]);
  const [requirements, setRequirements] = useState<CustomerRequirement>({
    industry: '',
    cleaningType: '',
    partSize: '',
    throughput: '',
    contaminants: '',
    specialRequirements: ''
  });

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      'title': { zh: 'AI 方案助手', en: 'AI Solution Assistant', de: 'KI-Lösungsassistent', fr: 'Assistant Solution IA' },
      'description': { zh: '基于客户需求智能推荐最佳清洗设备方案', en: 'Intelligently recommend optimal cleaning equipment solutions based on customer requirements', de: 'Intelligente Empfehlung optimaler Reinigungsanlagen', fr: 'Recommandation intelligente de solutions de nettoyage' },
      'newAnalysis': { zh: '新建分析', en: 'New Analysis', de: 'Neue Analyse', fr: 'Nouvelle analyse' },
      'history': { zh: '历史记录', en: 'History', de: 'Verlauf', fr: 'Historique' },
      'industry': { zh: '行业领域', en: 'Industry', de: 'Branche', fr: 'Industrie' },
      'cleaningType': { zh: '清洗类型', en: 'Cleaning Type', de: 'Reinigungstyp', fr: 'Type de nettoyage' },
      'partSize': { zh: '工件尺寸', en: 'Part Size', de: 'Teilegröße', fr: 'Taille des pièces' },
      'throughput': { zh: '产能需求', en: 'Throughput', de: 'Durchsatz', fr: 'Débit' },
      'contaminants': { zh: '污染物类型', en: 'Contaminants', de: 'Verunreinigungen', fr: 'Contaminants' },
      'specialRequirements': { zh: '特殊要求', en: 'Special Requirements', de: 'Besondere Anforderungen', fr: 'Exigences spéciales' },
      'analyze': { zh: '开始分析', en: 'Start Analysis', de: 'Analyse starten', fr: 'Démarrer l\'analyse' },
      'analyzing': { zh: '正在分析...', en: 'Analyzing...', de: 'Analysiere...', fr: 'Analyse en cours...' },
      'recommendations': { zh: '推荐方案', en: 'Recommendations', de: 'Empfehlungen', fr: 'Recommandations' },
      'confidence': { zh: '匹配度', en: 'Confidence', de: 'Konfidenz', fr: 'Confiance' },
      'matchedCases': { zh: '相似案例', en: 'Matched Cases', de: 'Ähnliche Fälle', fr: 'Cas similaires' },
      'keyFeatures': { zh: '核心特性', en: 'Key Features', de: 'Hauptmerkmale', fr: 'Caractéristiques clés' },
      'estimatedCost': { zh: '预估成本', en: 'Est. Cost', de: 'Gesch. Kosten', fr: 'Coût estimé' },
      'estimatedDuration': { zh: '预估工期', en: 'Est. Duration', de: 'Gesch. Dauer', fr: 'Durée estimée' },
      'applyToQuote': { zh: '应用到报价', en: 'Apply to Quote', de: 'Auf Angebot anwenden', fr: 'Appliquer au devis' },
      'viewDetails': { zh: '查看详情', en: 'View Details', de: 'Details anzeigen', fr: 'Voir les détails' },
      'automotive': { zh: '汽车制造', en: 'Automotive', de: 'Automobil', fr: 'Automobile' },
      'aerospace': { zh: '航空航天', en: 'Aerospace', de: 'Luft- und Raumfahrt', fr: 'Aérospatiale' },
      'electronics': { zh: '电子电器', en: 'Electronics', de: 'Elektronik', fr: 'Électronique' },
      'medical': { zh: '医疗器械', en: 'Medical', de: 'Medizin', fr: 'Médical' },
      'precision': { zh: '精密机械', en: 'Precision', de: 'Präzision', fr: 'Précision' },
      'ultrasonic': { zh: '超声波清洗', en: 'Ultrasonic', de: 'Ultraschall', fr: 'Ultrasons' },
      'spray': { zh: '喷淋清洗', en: 'Spray', de: 'Sprühen', fr: 'Pulvérisation' },
      'immersion': { zh: '浸泡清洗', en: 'Immersion', de: 'Eintauchen', fr: 'Immersion' },
      'vacuum': { zh: '真空干燥', en: 'Vacuum Dry', de: 'Vakuumtrocknung', fr: 'Séchage sous vide' },
    };
    return translations[key]?.[language] || translations[key]?.['en'] || key;
  };

  // tRPC mutation for solution recommendation
  const recommendMutation = trpc.aiServices.solution.recommend.useMutation({
    onSuccess: (data) => {
      if ((data as any).recommendations) {
        setRecommendations(((data as any).recommendations as any[]).map((rec: any, idx: number) => ({
          id: String(idx + 1),
          title: rec.equipmentModel || rec.title,
          description: rec.description || '',
          confidence: rec.confidence || 85,
          matchedCases: rec.matchedCases || 5,
          keyFeatures: rec.keyFeatures || [],
          estimatedCost: rec.estimatedCost || 'TBD',
          estimatedDuration: rec.estimatedDuration || 'TBD'
        })));
      }
      toast({
        title: language === 'zh' ? '分析完成' : 'Analysis Complete',
        description: language === 'zh' ? `已生成${(data as any).recommendations?.length || 0}个推荐方案` : `${(data as any).recommendations?.length || 0} recommendations generated`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Analysis failed',
        variant: 'destructive',
      });
    }
  });

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      // Call backend API
      await recommendMutation.mutateAsync({
        product: requirements.industry,
        cleanlinessLevel: requirements.cleaningType,
        cycleTime: parseInt(requirements.throughput) || 100,
        loadingForm: requirements.partSize,
        additionalRequirements: `${requirements.contaminants} ${requirements.specialRequirements}`
      });
    } catch (error) {
      // Error handled in mutation onError
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeFallback = async () => {
    // Fallback with mock data if API fails
    setIsAnalyzing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setRecommendations([
        {
          id: '1',
          title: 'USC-3000 超声波清洗系统',
          description: '适用于中型精密零件的多槽超声波清洗系统，配备自动传输和真空干燥',
          confidence: 95,
          matchedCases: 12,
          keyFeatures: ['40kHz超声波', '自动传输', '真空干燥', 'PLC控制'],
          estimatedCost: '¥450,000 - ¥550,000',
          estimatedDuration: '8-10周'
        },
        {
          id: '2',
          title: 'USC-2000 标准超声波清洗机',
          description: '经济型超声波清洗解决方案，适合中小批量生产',
          confidence: 82,
          matchedCases: 8,
          keyFeatures: ['28kHz超声波', '手动操作', '热风干燥'],
          estimatedCost: '¥180,000 - ¥250,000',
          estimatedDuration: '4-6周'
        },
        {
          id: '3',
          title: 'ASC-5000 自动化清洗产线',
          description: '全自动化清洗生产线，适合大批量连续生产',
          confidence: 75,
          matchedCases: 5,
          keyFeatures: ['机器人上下料', '多工位清洗', 'MES集成', '在线检测'],
          estimatedCost: '¥1,200,000 - ¥1,500,000',
          estimatedDuration: '16-20周'
        }
      ]);

      toast({
        title: language === 'zh' ? '分析完成' : 'Analysis Complete',
        description: language === 'zh' ? '已生成3个推荐方案' : '3 recommendations generated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Analysis failed',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={Lightbulb}
        title={t('title')}
        description={t('description')}
      />

      <Tabs defaultValue="new" className="space-y-4">
        <TabsList>
          <TabsTrigger value="new" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {t('newAnalysis')}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            {t('history')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {language === 'zh' ? '客户需求输入' : 'Customer Requirements'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('industry')}</Label>
                  <Select 
                    value={requirements.industry} 
                    onValueChange={(v) => setRequirements(prev => ({ ...prev, industry: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'zh' ? '选择行业' : 'Select industry'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automotive">{t('automotive')}</SelectItem>
                      <SelectItem value="aerospace">{t('aerospace')}</SelectItem>
                      <SelectItem value="electronics">{t('electronics')}</SelectItem>
                      <SelectItem value="medical">{t('medical')}</SelectItem>
                      <SelectItem value="precision">{t('precision')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('cleaningType')}</Label>
                  <Select 
                    value={requirements.cleaningType} 
                    onValueChange={(v) => setRequirements(prev => ({ ...prev, cleaningType: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'zh' ? '选择清洗类型' : 'Select type'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ultrasonic">{t('ultrasonic')}</SelectItem>
                      <SelectItem value="spray">{t('spray')}</SelectItem>
                      <SelectItem value="immersion">{t('immersion')}</SelectItem>
                      <SelectItem value="vacuum">{t('vacuum')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('partSize')}</Label>
                  <Input 
                    placeholder="e.g., 100x50x30mm"
                    value={requirements.partSize}
                    onChange={(e) => setRequirements(prev => ({ ...prev, partSize: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('throughput')}</Label>
                  <Input 
                    placeholder="e.g., 500 pcs/day"
                    value={requirements.throughput}
                    onChange={(e) => setRequirements(prev => ({ ...prev, throughput: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('contaminants')}</Label>
                  <Input 
                    placeholder={language === 'zh' ? '油污、切削液、粉尘等' : 'Oil, coolant, dust, etc.'}
                    value={requirements.contaminants}
                    onChange={(e) => setRequirements(prev => ({ ...prev, contaminants: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('specialRequirements')}</Label>
                <Textarea 
                  placeholder={language === 'zh' ? '请描述其他特殊要求...' : 'Describe any special requirements...'}
                  value={requirements.specialRequirements}
                  onChange={(e) => setRequirements(prev => ({ ...prev, specialRequirements: e.target.value }))}
                  rows={3}
                />
              </div>

              <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full md:w-auto">
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('analyzing')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('analyze')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {recommendations.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                {t('recommendations')}
              </h2>
              
              <div className="grid grid-cols-1 gap-4">
                {recommendations.map((rec, index) => (
                  <Card key={rec.id} className={`${index === 0 ? 'border-primary' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {rec.title}
                            {index === 0 && (
                              <Badge className="bg-primary text-primary-foreground">
                                {language === 'zh' ? '最佳匹配' : 'Best Match'}
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="mt-1">{rec.description}</CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">{rec.confidence}%</div>
                          <div className="text-xs text-muted-foreground">{t('confidence')}</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {rec.keyFeatures.map((feature, i) => (
                          <Badge key={i} variant="outline">{feature}</Badge>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">{t('matchedCases')}</p>
                          <p className="font-medium">{rec.matchedCases} {language === 'zh' ? '个' : ''}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('estimatedCost')}</p>
                          <p className="font-medium">{rec.estimatedCost}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('estimatedDuration')}</p>
                          <p className="font-medium">{rec.estimatedDuration}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm">
                          {t('applyToQuote')}
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                        <Button variant="outline" size="sm">{t('viewDetails')}</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{language === 'zh' ? '暂无历史记录' : 'No history yet'}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </Layout>
  );
}
