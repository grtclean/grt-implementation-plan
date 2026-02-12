import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { 
  Settings, 
  Calendar, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink
} from "lucide-react";

interface GraphConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  calendarEnabled: boolean;
  teamsEnabled: boolean;
  lastSyncAt?: string;
  status: 'connected' | 'disconnected' | 'error';
}

export default function MicrosoftGraphSettings() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [config, setConfig] = useState<GraphConfig>({
    tenantId: '',
    clientId: '',
    clientSecret: '',
    calendarEnabled: true,
    teamsEnabled: true,
    status: 'disconnected'
  });

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      'title': { zh: 'Microsoft Graph API 配置', en: 'Microsoft Graph API Settings', de: 'Microsoft Graph API Einstellungen', fr: 'Paramètres Microsoft Graph API' },
      'description': { zh: '配置Azure AD应用凭据以启用Outlook日历和Teams消息同步', en: 'Configure Azure AD app credentials to enable Outlook Calendar and Teams message sync', de: 'Konfigurieren Sie Azure AD-App-Anmeldeinformationen', fr: 'Configurer les identifiants de l\'application Azure AD' },
      'azureConfig': { zh: 'Azure AD 配置', en: 'Azure AD Configuration', de: 'Azure AD Konfiguration', fr: 'Configuration Azure AD' },
      'tenantId': { zh: '租户 ID', en: 'Tenant ID', de: 'Mandanten-ID', fr: 'ID du locataire' },
      'clientId': { zh: '客户端 ID', en: 'Client ID', de: 'Client-ID', fr: 'ID client' },
      'clientSecret': { zh: '客户端密钥', en: 'Client Secret', de: 'Client-Geheimnis', fr: 'Secret client' },
      'features': { zh: '功能设置', en: 'Features', de: 'Funktionen', fr: 'Fonctionnalités' },
      'calendarSync': { zh: 'Outlook 日历同步', en: 'Outlook Calendar Sync', de: 'Outlook Kalender-Sync', fr: 'Synchronisation calendrier Outlook' },
      'teamsSync': { zh: 'Teams 消息同步', en: 'Teams Message Sync', de: 'Teams Nachrichten-Sync', fr: 'Synchronisation messages Teams' },
      'status': { zh: '连接状态', en: 'Connection Status', de: 'Verbindungsstatus', fr: 'État de connexion' },
      'connected': { zh: '已连接', en: 'Connected', de: 'Verbunden', fr: 'Connecté' },
      'disconnected': { zh: '未连接', en: 'Disconnected', de: 'Nicht verbunden', fr: 'Déconnecté' },
      'error': { zh: '连接错误', en: 'Connection Error', de: 'Verbindungsfehler', fr: 'Erreur de connexion' },
      'save': { zh: '保存配置', en: 'Save Configuration', de: 'Konfiguration speichern', fr: 'Enregistrer la configuration' },
      'test': { zh: '测试连接', en: 'Test Connection', de: 'Verbindung testen', fr: 'Tester la connexion' },
      'lastSync': { zh: '上次同步', en: 'Last Sync', de: 'Letzte Synchronisierung', fr: 'Dernière synchronisation' },
      'howToGet': { zh: '如何获取凭据', en: 'How to get credentials', de: 'So erhalten Sie Anmeldeinformationen', fr: 'Comment obtenir les identifiants' },
      'step1': { zh: '1. 登录 Azure Portal', en: '1. Login to Azure Portal', de: '1. Bei Azure Portal anmelden', fr: '1. Connectez-vous au portail Azure' },
      'step2': { zh: '2. 进入 Azure Active Directory > 应用注册', en: '2. Go to Azure Active Directory > App registrations', de: '2. Gehen Sie zu Azure Active Directory > App-Registrierungen', fr: '2. Accédez à Azure Active Directory > Inscriptions d\'applications' },
      'step3': { zh: '3. 创建新应用或选择现有应用', en: '3. Create new app or select existing', de: '3. Neue App erstellen oder vorhandene auswählen', fr: '3. Créer une nouvelle application ou sélectionner une existante' },
      'step4': { zh: '4. 复制应用程序(客户端) ID 和目录(租户) ID', en: '4. Copy Application (client) ID and Directory (tenant) ID', de: '4. Kopieren Sie die Anwendungs-(Client-)ID und Verzeichnis-(Mandanten-)ID', fr: '4. Copiez l\'ID d\'application (client) et l\'ID de répertoire (locataire)' },
      'step5': { zh: '5. 在"证书和密码"中创建客户端密钥', en: '5. Create client secret in "Certificates & secrets"', de: '5. Erstellen Sie ein Client-Geheimnis unter "Zertifikate & Geheimnisse"', fr: '5. Créez un secret client dans "Certificats et secrets"' },
      'permissions': { zh: '所需权限', en: 'Required Permissions', de: 'Erforderliche Berechtigungen', fr: 'Autorisations requises' },
      'saveSuccess': { zh: '配置已保存', en: 'Configuration saved', de: 'Konfiguration gespeichert', fr: 'Configuration enregistrée' },
      'testSuccess': { zh: '连接测试成功', en: 'Connection test successful', de: 'Verbindungstest erfolgreich', fr: 'Test de connexion réussi' },
      'testFailed': { zh: '连接测试失败', en: 'Connection test failed', de: 'Verbindungstest fehlgeschlagen', fr: 'Échec du test de connexion' },
    };
    return translations[key]?.[language] || translations[key]?.['en'] || key;
  };

  // tRPC mutation for saving config
  const saveConfigMutation = trpc.microsoftGraph.saveConfig.useMutation({
    onSuccess: () => {
      toast({
        title: t('saveSuccess'),
        description: language === 'zh' ? '您的Microsoft Graph配置已更新' : 'Your Microsoft Graph configuration has been updated',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save configuration',
        variant: 'destructive',
      });
    }
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveConfigMutation.mutateAsync({
        tenantId: config.tenantId,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        calendarEnabled: config.calendarEnabled,
        teamsEnabled: config.teamsEnabled
      });
    } catch (error) {
      // Error handled in mutation onError
    } finally {
      setIsSaving(false);
    }
  };

  // tRPC mutation for testing connection
  const testConnectionMutation = trpc.microsoftGraph.testConnection.useMutation({
    onSuccess: (data) => {
      setConfig(prev => ({ ...prev, status: data.success ? 'connected' : 'error', lastSyncAt: new Date().toISOString() }));
      if (data.success) {
        toast({
          title: t('testSuccess'),
          description: language === 'zh' ? 'Microsoft Graph API连接正常' : 'Microsoft Graph API connection is working',
        });
      } else {
        toast({
          title: t('testFailed'),
          description: data.error || 'Please check your credentials',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      setConfig(prev => ({ ...prev, status: 'error' }));
      toast({
        title: t('testFailed'),
        description: error.message || 'Please check your credentials',
        variant: 'destructive',
      });
    }
  });

  const handleTest = async () => {
    setIsTesting(true);
    try {
      await testConnectionMutation.mutateAsync({
        tenantId: config.tenantId,
        clientId: config.clientId,
        clientSecret: config.clientSecret
      });
    } catch (error) {
      // Error handled in mutation onError
    } finally {
      setIsTesting(false);
    }
  };

  const statusBadge = {
    connected: <Badge className="bg-green-500/20 text-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />{t('connected')}</Badge>,
    disconnected: <Badge variant="outline" className="text-muted-foreground"><AlertCircle className="w-3 h-3 mr-1" />{t('disconnected')}</Badge>,
    error: <Badge className="bg-red-500/20 text-red-500"><AlertCircle className="w-3 h-3 mr-1" />{t('error')}</Badge>,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('description')}</p>
        </div>
        {statusBadge[config.status]}
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">{t('azureConfig')}</TabsTrigger>
          <TabsTrigger value="features">{t('features')}</TabsTrigger>
          <TabsTrigger value="help">{t('howToGet')}</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('azureConfig')}</CardTitle>
              <CardDescription>
                {language === 'zh' ? '输入您的Azure AD应用程序凭据' : 'Enter your Azure AD application credentials'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenantId">{t('tenantId')}</Label>
                <Input
                  id="tenantId"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={config.tenantId}
                  onChange={(e) => setConfig(prev => ({ ...prev, tenantId: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientId">{t('clientId')}</Label>
                <Input
                  id="clientId"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={config.clientId}
                  onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientSecret">{t('clientSecret')}</Label>
                <div className="relative">
                  <Input
                    id="clientSecret"
                    type={showSecret ? 'text' : 'password'}
                    placeholder="••••••••••••••••"
                    value={config.clientSecret}
                    onChange={(e) => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('save')}
                </Button>
                <Button variant="outline" onClick={handleTest} disabled={isTesting || !config.clientId}>
                  {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  {t('test')}
                </Button>
              </div>

              {config.lastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  {t('lastSync')}: {new Date(config.lastSyncAt).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('features')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium">{t('calendarSync')}</p>
                    <p className="text-sm text-muted-foreground">
                      {language === 'zh' ? '同步Outlook日历事件到仪表盘' : 'Sync Outlook calendar events to dashboard'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={config.calendarEnabled}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, calendarEnabled: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="font-medium">{t('teamsSync')}</p>
                    <p className="text-sm text-muted-foreground">
                      {language === 'zh' ? '同步Teams未读消息到仪表盘' : 'Sync Teams unread messages to dashboard'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={config.teamsEnabled}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, teamsEnabled: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="help" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('howToGet')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</span>
                  <span>{t('step1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</span>
                  <span>{t('step2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">3</span>
                  <span>{t('step3')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">4</span>
                  <span>{t('step4')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">5</span>
                  <span>{t('step5')}</span>
                </li>
              </ol>

              <div className="mt-6 p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">{t('permissions')}</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Calendars.Read</li>
                  <li>• Calendars.ReadWrite</li>
                  <li>• Chat.Read</li>
                  <li>• ChannelMessage.Read.All</li>
                  <li>• User.Read</li>
                </ul>
              </div>

              <Button variant="outline" className="mt-4" asChild>
                <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {language === 'zh' ? '打开 Azure Portal' : 'Open Azure Portal'}
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
