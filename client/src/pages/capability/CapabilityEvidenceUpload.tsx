import { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  Award,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Trash2,
  Plus,
  GraduationCap,
  Briefcase,
  Star
} from "lucide-react";

interface EvidenceItem {
  id: string;
  type: 'project' | 'certificate' | 'training' | 'achievement';
  title: string;
  description: string;
  domain: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewComment?: string;
  points?: number;
}

export default function CapabilityEvidenceUpload() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    type: '',
    title: '',
    description: '',
    domain: '',
  });
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([
    { id: '1', type: 'project', title: '超声波清洗机项目交付', description: '成功交付USC-3000项目，客户满意度4.8分', domain: '项目管理', fileName: 'project_report.pdf', fileSize: '2.3 MB', uploadDate: '2024-01-28', status: 'approved', points: 50 },
    { id: '2', type: 'certificate', title: 'PLC编程高级证书', description: '西门子S7-1500高级编程认证', domain: '电气设计', fileName: 'certificate.pdf', fileSize: '1.1 MB', uploadDate: '2024-01-25', status: 'approved', points: 30 },
    { id: '3', type: 'training', title: '精益生产培训', description: '完成公司组织的精益生产培训课程', domain: '生产管理', fileName: 'training_cert.pdf', fileSize: '0.8 MB', uploadDate: '2024-01-20', status: 'pending' },
    { id: '4', type: 'achievement', title: '技术创新奖', description: '2023年度技术创新二等奖', domain: '技术创新', fileName: 'award.pdf', fileSize: '0.5 MB', uploadDate: '2024-01-15', status: 'rejected', reviewComment: '请提供获奖证书原件扫描件' },
  ]);

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      'title': { zh: '能力证据上传', en: 'Capability Evidence Upload', de: 'Kompetenznachweis hochladen', fr: 'Téléchargement des preuves de compétence' },
      'description': { zh: '上传项目交付物、培训证书等作为能力升级依据', en: 'Upload project deliverables, training certificates as evidence for capability upgrade', de: 'Laden Sie Projektleistungen und Zertifikate hoch', fr: 'Téléchargez les livrables de projet et certificats' },
      'upload': { zh: '上传证据', en: 'Upload Evidence', de: 'Nachweis hochladen', fr: 'Télécharger une preuve' },
      'myEvidence': { zh: '我的证据', en: 'My Evidence', de: 'Meine Nachweise', fr: 'Mes preuves' },
      'evidenceType': { zh: '证据类型', en: 'Evidence Type', de: 'Nachweistyp', fr: 'Type de preuve' },
      'project': { zh: '项目交付物', en: 'Project Deliverable', de: 'Projektleistung', fr: 'Livrable de projet' },
      'certificate': { zh: '资格证书', en: 'Certificate', de: 'Zertifikat', fr: 'Certificat' },
      'training': { zh: '培训记录', en: 'Training Record', de: 'Schulungsnachweis', fr: 'Formation' },
      'achievement': { zh: '荣誉奖项', en: 'Achievement/Award', de: 'Auszeichnung', fr: 'Récompense' },
      'evidenceTitle': { zh: '证据标题', en: 'Evidence Title', de: 'Nachweistitel', fr: 'Titre de la preuve' },
      'evidenceDescription': { zh: '详细描述', en: 'Description', de: 'Beschreibung', fr: 'Description' },
      'domain': { zh: '能力领域', en: 'Capability Domain', de: 'Kompetenzbereich', fr: 'Domaine de compétence' },
      'selectFile': { zh: '选择文件', en: 'Select File', de: 'Datei auswählen', fr: 'Sélectionner un fichier' },
      'dragDrop': { zh: '或拖拽文件到此处', en: 'or drag and drop here', de: 'oder hierher ziehen', fr: 'ou glisser-déposer ici' },
      'supportedFormats': { zh: '支持 PDF, DOC, DOCX, JPG, PNG (最大 10MB)', en: 'Supports PDF, DOC, DOCX, JPG, PNG (max 10MB)', de: 'Unterstützt PDF, DOC, DOCX, JPG, PNG (max 10MB)', fr: 'Supporte PDF, DOC, DOCX, JPG, PNG (max 10MB)' },
      'submit': { zh: '提交审核', en: 'Submit for Review', de: 'Zur Prüfung einreichen', fr: 'Soumettre pour examen' },
      'submitting': { zh: '正在提交...', en: 'Submitting...', de: 'Wird eingereicht...', fr: 'Soumission en cours...' },
      'pending': { zh: '待审核', en: 'Pending', de: 'Ausstehend', fr: 'En attente' },
      'approved': { zh: '已通过', en: 'Approved', de: 'Genehmigt', fr: 'Approuvé' },
      'rejected': { zh: '已拒绝', en: 'Rejected', de: 'Abgelehnt', fr: 'Rejeté' },
      'points': { zh: '积分', en: 'Points', de: 'Punkte', fr: 'Points' },
      'view': { zh: '查看', en: 'View', de: 'Ansehen', fr: 'Voir' },
      'delete': { zh: '删除', en: 'Delete', de: 'Löschen', fr: 'Supprimer' },
      'projectManagement': { zh: '项目管理', en: 'Project Management', de: 'Projektmanagement', fr: 'Gestion de projet' },
      'mechanicalDesign': { zh: '机械设计', en: 'Mechanical Design', de: 'Mechanische Konstruktion', fr: 'Conception mécanique' },
      'electricalDesign': { zh: '电气设计', en: 'Electrical Design', de: 'Elektrokonstruktion', fr: 'Conception électrique' },
      'production': { zh: '生产管理', en: 'Production', de: 'Produktion', fr: 'Production' },
      'quality': { zh: '质量管理', en: 'Quality', de: 'Qualität', fr: 'Qualité' },
      'innovation': { zh: '技术创新', en: 'Innovation', de: 'Innovation', fr: 'Innovation' },
      'totalPoints': { zh: '累计积分', en: 'Total Points', de: 'Gesamtpunkte', fr: 'Points totaux' },
      'approvedCount': { zh: '已通过', en: 'Approved', de: 'Genehmigt', fr: 'Approuvés' },
      'pendingCount': { zh: '待审核', en: 'Pending', de: 'Ausstehend', fr: 'En attente' },
    };
    return translations[key]?.[language] || translations[key]?.['en'] || key;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: language === 'zh' ? '文件过大' : 'File too large',
          description: language === 'zh' ? '请选择小于10MB的文件' : 'Please select a file smaller than 10MB',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  // tRPC mutation for evidence upload
  const uploadMutation = trpc.capabilityEvidence.upload.useMutation({
    onSuccess: (data) => {
      const newEvidence: EvidenceItem = {
        id: (data as any).id || Date.now().toString(),
        type: formData.type as any,
        title: formData.title,
        description: formData.description,
        domain: formData.domain,
        fileName: selectedFile?.name || '',
        fileSize: selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : '0 MB',
        uploadDate: new Date().toISOString().split('T')[0],
        status: 'pending',
      };
      setEvidenceList(prev => [newEvidence, ...prev]);
      setFormData({ type: '', title: '', description: '', domain: '' });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast({
        title: language === 'zh' ? '提交成功' : 'Submitted Successfully',
        description: language === 'zh' ? '您的证据已提交审核' : 'Your evidence has been submitted for review',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Upload failed',
        variant: 'destructive',
      });
    }
  });

  const handleSubmit = async () => {
    if (!formData.type || !formData.title || !formData.domain || !selectedFile) {
      toast({
        title: language === 'zh' ? '请填写完整信息' : 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Convert file to base64 for upload
      const fileBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(selectedFile);
      });

      // Call backend API
      await uploadMutation.mutateAsync({
        evidenceType: formData.type as any,
        capabilityDomain: formData.domain as any,
        title: formData.title,
        description: formData.description,
        file: { data: fileBase64, name: selectedFile.name, size: selectedFile.size } as any,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
    } catch (error) {
      // Error handled in mutation onError
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 500);
    }
  };

  const typeIcons: Record<string, React.ReactNode> = {
    project: <Briefcase className="w-4 h-4" />,
    certificate: <Award className="w-4 h-4" />,
    training: <GraduationCap className="w-4 h-4" />,
    achievement: <Star className="w-4 h-4" />,
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-500',
    approved: 'bg-green-500/20 text-green-500',
    rejected: 'bg-red-500/20 text-red-500',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="w-3 h-3" />,
    approved: <CheckCircle2 className="w-3 h-3" />,
    rejected: <XCircle className="w-3 h-3" />,
  };

  const totalPoints = evidenceList.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.points || 0), 0);
  const approvedCount = evidenceList.filter(e => e.status === 'approved').length;
  const pendingCount = evidenceList.filter(e => e.status === 'pending').length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Upload}
        title={t('title')}
        description={t('description')}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Star} label={t('totalPoints')} value={totalPoints} />
        <StatCard icon={CheckCircle2} label={t('approvedCount')} value={approvedCount} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Clock} label={t('pendingCount')} value={pendingCount} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t('upload')}
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {t('myEvidence')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('upload')}</CardTitle>
              <CardDescription>
                {language === 'zh' ? '上传您的能力证明材料' : 'Upload your capability evidence materials'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('evidenceType')} *</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'zh' ? '选择类型' : 'Select type'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project">{t('project')}</SelectItem>
                      <SelectItem value="certificate">{t('certificate')}</SelectItem>
                      <SelectItem value="training">{t('training')}</SelectItem>
                      <SelectItem value="achievement">{t('achievement')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('domain')} *</Label>
                  <Select 
                    value={formData.domain} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, domain: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'zh' ? '选择领域' : 'Select domain'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="项目管理">{t('projectManagement')}</SelectItem>
                      <SelectItem value="机械设计">{t('mechanicalDesign')}</SelectItem>
                      <SelectItem value="电气设计">{t('electricalDesign')}</SelectItem>
                      <SelectItem value="生产管理">{t('production')}</SelectItem>
                      <SelectItem value="质量管理">{t('quality')}</SelectItem>
                      <SelectItem value="技术创新">{t('innovation')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('evidenceTitle')} *</Label>
                <Input 
                  placeholder={language === 'zh' ? '输入证据标题' : 'Enter evidence title'}
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('evidenceDescription')}</Label>
                <Textarea 
                  placeholder={language === 'zh' ? '详细描述您的能力证明...' : 'Describe your capability evidence...'}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('selectFile')} *</Label>
                <div 
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-8 h-8 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">{t('selectFile')}</p>
                      <p className="text-xs text-muted-foreground">{t('dragDrop')}</p>
                      <p className="text-xs text-muted-foreground mt-2">{t('supportedFormats')}</p>
                    </>
                  )}
                </div>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{language === 'zh' ? '上传中...' : 'Uploading...'}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              <Button onClick={handleSubmit} disabled={isUploading} className="w-full md:w-auto">
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('submitting')}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {t('submit')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardContent className="py-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('evidenceType')}</TableHead>
                    <TableHead>{t('evidenceTitle')}</TableHead>
                    <TableHead>{t('domain')}</TableHead>
                    <TableHead>{language === 'zh' ? '上传日期' : 'Upload Date'}</TableHead>
                    <TableHead>{language === 'zh' ? '状态' : 'Status'}</TableHead>
                    <TableHead>{t('points')}</TableHead>
                    <TableHead className="text-right">{language === 'zh' ? '操作' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evidenceList.map((evidence) => (
                    <TableRow key={evidence.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {typeIcons[evidence.type]}
                          <span>{t(evidence.type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{evidence.title}</p>
                          <p className="text-xs text-muted-foreground">{evidence.fileName}</p>
                        </div>
                      </TableCell>
                      <TableCell>{evidence.domain}</TableCell>
                      <TableCell>{evidence.uploadDate}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[evidence.status]} flex items-center gap-1 w-fit`}>
                          {statusIcons[evidence.status]}
                          {t(evidence.status)}
                        </Badge>
                        {evidence.reviewComment && (
                          <p className="text-xs text-red-500 mt-1">{evidence.reviewComment}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {evidence.points ? (
                          <Badge variant="outline" className="text-primary">+{evidence.points}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
