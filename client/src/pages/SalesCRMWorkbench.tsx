import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  BarChart3, Users, Target, MessageSquare, TrendingUp, Plus, Search,
  Phone, Mail, Calendar, ChevronRight, Star, ArrowUpRight, ArrowDownRight,
  Filter, RefreshCw, Eye, Edit, UserPlus, Building2, DollarSign, Zap,
  Clock, CheckCircle2, XCircle, AlertTriangle, Sparkles, Send
} from "lucide-react";

// ── Types ──
type TabKey = 'pipeline' | 'leads' | 'customers' | 'interactions' | 'analytics';

// ── Shared UI Primitives (Fluent Design, no shadcn) ──

function FluentCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-[#edebe9] rounded-xl shadow-sm ${className}`}>{children}</div>;
}

function FluentBadge({ children, color = '#0078d4', bg = '#e5f1fb' }: { children: React.ReactNode; color?: string; bg?: string }) {
  return <span style={{ color, backgroundColor: bg }} className="px-2 py-0.5 rounded-full text-xs font-medium">{children}</span>;
}

function FluentButton({ children, variant = 'primary', onClick, className = '', disabled = false }: {
  children: React.ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; onClick?: () => void; className?: string; disabled?: boolean;
}) {
  const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50';
  const styles = variant === 'primary' ? 'bg-[#0078d4] text-white hover:bg-[#106ebe]'
    : variant === 'secondary' ? 'bg-white border border-[#8a8886] text-[#323130] hover:bg-[#f3f2f1]'
    : 'text-[#0078d4] hover:bg-[#f3f2f1]';
  return <button className={`${base} ${styles} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

function FluentInput({ value, onChange, placeholder, className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className={`w-full px-3 py-1.5 border border-[#8a8886] rounded-lg text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] bg-white ${className}`} />;
}

function FluentSelect({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return <select value={value} onChange={e => onChange(e.target.value)}
    className="px-3 py-1.5 border border-[#8a8886] rounded-lg text-sm focus:outline-none focus:border-[#0078d4] bg-white">{children}</select>;
}

function FluentTextarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
    className="w-full px-3 py-2 border border-[#8a8886] rounded-lg text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] bg-white resize-none" />;
}

function FluentDialog({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl border border-[#edebe9] w-full max-w-[95vw] md:max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#edebe9]">
          <h3 className="text-lg font-semibold text-[#323130]">{title}</h3>
          <button onClick={onClose} className="text-[#605e5c] hover:text-[#323130] text-xl leading-none min-h-[44px] min-w-[44px] flex items-center justify-center">&times;</button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="text-sm font-medium text-[#323130]">{label}</label>{children}</div>;
}

function StatCard({ label, value, icon: Icon, trend, color = '#0078d4' }: {
  label: string; value: string | number; icon: any; trend?: number; color?: string;
}) {
  return (
    <FluentCard className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[#605e5c]">{label}</p>
          <p className="text-2xl font-bold text-[#323130] mt-1">{value}</p>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${trend >= 0 ? 'text-[#107c10]' : 'text-[#d13438]'}`}>
              {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div style={{ backgroundColor: color + '15' }} className="p-2 rounded-lg">
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </FluentCard>
  );
}

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  S: { bg: '#fff8e1', text: '#f57f17', border: '#ffe082' },
  A: { bg: '#e3f2fd', text: '#1565c0', border: '#90caf9' },
  B: { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7' },
  C: { bg: '#f5f5f5', text: '#616161', border: '#e0e0e0' },
  D: { bg: '#fafafa', text: '#9e9e9e', border: '#eeeeee' },
};

// ── Pipeline Tab ──
function PipelineTab() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', customerId: '', stage: 'lead', value: '', probability: '50', expectedCloseDate: '' });

  const PIPELINE_STAGES = [
    { key: 'lead', label: t("crm.workbench.stageLead"), color: '#0078d4' },
    { key: 'qualification', label: t("crm.workbench.stageQualification"), color: '#2b88d8' },
    { key: 'proposal', label: t("crm.workbench.stageProposal"), color: '#71afe5' },
    { key: 'negotiation', label: t("crm.workbench.stageNegotiation"), color: '#f7630c' },
    { key: 'closed_won', label: t("crm.workbench.stageWon"), color: '#107c10' },
    { key: 'closed_lost', label: t("crm.workbench.stageLost"), color: '#d13438' },
  ];

  const oppsQ = (trpc.crm as any).opportunities.list.useQuery({ search: search || undefined, stage: stageFilter || undefined });
  const statsQ = (trpc.crm as any).opportunities.stats.useQuery({});
  const funnelQ = (trpc.crm as any).opportunities.funnel.useQuery({});
  const utils = trpc.useUtils();
  const createM = (trpc.crm as any).opportunities.create.useMutation({
    onSuccess: () => { (utils.crm as any).opportunities.list.invalidate(); (utils.crm as any).opportunities.stats.invalidate(); setShowCreate(false); setForm({ name: '', customerId: '', stage: 'lead', value: '', probability: '50', expectedCloseDate: '' }); }
  });

  const opps = oppsQ.data?.items || [];
  const stats = statsQ.data;
  const funnel = funnelQ.data || [];
  const maxFunnelVal = Math.max(...funnel.map((f: any) => Number(f.totalValue) || 0), 1);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={t("crm.workbench.pipelineTotal")} value={stats ? `¥${(Number(stats.pipelineValue) / 10000).toFixed(0)}万` : '--'} icon={DollarSign} color="#0078d4" />
        <StatCard label={t("crm.workbench.oppCount")} value={stats?.pipelineCount ?? '--'} icon={Target} color="#f7630c" />
        <StatCard label={t("crm.workbench.winRate")} value={stats ? `${(Number(stats.winRate) * 100).toFixed(1)}%` : '--'} icon={TrendingUp} color="#107c10" />
        <StatCard label={t("crm.workbench.lostCount")} value={stats?.lostCount ?? '--'} icon={XCircle} color="#d13438" />
      </div>

      {/* Funnel */}
      <FluentCard className="p-4">
        <h4 className="text-sm font-semibold text-[#323130] mb-3">{t("crm.workbench.salesFunnel")}</h4>
        <div className="space-y-2">
          {funnel.map((f: any) => {
            const stage = PIPELINE_STAGES.find(s => s.key === f.stage);
            const pct = ((Number(f.totalValue) || 0) / maxFunnelVal) * 100;
            return (
              <div key={f.stage} className="flex items-center gap-3">
                <span className="text-xs text-[#605e5c] w-16 shrink-0">{stage?.label || f.stage}</span>
                <div className="flex-1 bg-[#f3f2f1] rounded-full h-6 overflow-hidden">
                  <div className="h-full rounded-full flex items-center px-2" style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: stage?.color || '#0078d4' }}>
                    <span className="text-xs text-white font-medium whitespace-nowrap">{f.count}{t("crm.workbench.countUnit")} / ¥{(Number(f.totalValue) / 10000).toFixed(0)}万</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </FluentCard>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#605e5c]" />
          <FluentInput value={search} onChange={setSearch} placeholder={t("crm.workbench.searchOpp")} className="pl-8" />
        </div>
        <FluentSelect value={stageFilter} onChange={setStageFilter}>
          <option value="">{t("crm.workbench.allStages")}</option>
          {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </FluentSelect>
        <FluentButton onClick={() => setShowCreate(true)}><Plus size={14} /> {t("crm.workbench.newOpp")}</FluentButton>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0">
        {PIPELINE_STAGES.filter(s => s.key !== 'closed_lost').map(stage => {
          const stageOpps = opps.filter((o: any) => o.stage === stage.key);
          return (
            <div key={stage.key} className="min-w-[240px] flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                <span className="text-sm font-medium text-[#323130]">{stage.label}</span>
                <span className="text-xs text-[#605e5c]">({stageOpps.length})</span>
              </div>
              <div className="space-y-2">
                {stageOpps.map((opp: any) => (
                  <FluentCard key={opp.id} className="p-3 hover:shadow-md transition-shadow cursor-pointer">
                    <p className="text-sm font-medium text-[#323130] truncate">{opp.name}</p>
                    <p className="text-xs text-[#605e5c] mt-1">¥{(Number(opp.value) / 10000).toFixed(1)}万</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="w-full bg-[#f3f2f1] rounded-full h-1.5">
                        <div className="h-full rounded-full" style={{ width: `${opp.probability || 0}%`, backgroundColor: stage.color }} />
                      </div>
                      <span className="text-xs text-[#605e5c] ml-2 shrink-0">{opp.probability || 0}%</span>
                    </div>
                  </FluentCard>
                ))}
                {stageOpps.length === 0 && <p className="text-xs text-[#a19f9d] text-center py-4">{t("crm.workbench.noOpp")}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Dialog */}
      <FluentDialog open={showCreate} onClose={() => setShowCreate(false)} title={t("crm.workbench.newSalesOpp")}>
        <div className="space-y-3">
          <FormField label={t("crm.workbench.oppName")}><FluentInput value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder={t("crm.workbench.enterOppName")} /></FormField>
          <FormField label={t("crm.workbench.customerId")}><FluentInput value={form.customerId} onChange={v => setForm(p => ({ ...p, customerId: v }))} placeholder={t("crm.workbench.enterCustomerId")} /></FormField>
          <FormField label={t("crm.workbench.stage")}>
            <FluentSelect value={form.stage} onChange={v => setForm(p => ({ ...p, stage: v }))}>
              {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </FluentSelect>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("crm.workbench.amount")}><FluentInput value={form.value} onChange={v => setForm(p => ({ ...p, value: v }))} placeholder="0" /></FormField>
            <FormField label={t("crm.workbench.probabilityPct")}><FluentInput value={form.probability} onChange={v => setForm(p => ({ ...p, probability: v }))} placeholder="50" /></FormField>
          </div>
          <FormField label={t("crm.workbench.expectedCloseDate")}><FluentInput value={form.expectedCloseDate} onChange={v => setForm(p => ({ ...p, expectedCloseDate: v }))} placeholder="YYYY-MM-DD" /></FormField>
          <div className="flex justify-end gap-2 pt-2">
            <FluentButton variant="secondary" onClick={() => setShowCreate(false)}>{t("crm.workbench.cancel")}</FluentButton>
            <FluentButton onClick={async () => {
              try {
                await createM.mutateAsync({
                  name: form.name, customerId: Number(form.customerId) || 1, stage: form.stage,
                  value: form.value, probability: Number(form.probability), expectedCloseDate: form.expectedCloseDate || undefined,
                });
              } catch (err) {
                console.error("Create opportunity failed:", err);
              }
            }} disabled={!form.name || createM.isPending}>{createM.isPending ? t("crm.workbench.creating") : t("crm.workbench.create")}</FluentButton>
          </div>
        </div>
      </FluentDialog>
    </div>
  );
}

// ── Leads Tab ──
function LeadsTab() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ companyName: '', contactName: '', contactPhone: '', contactEmail: '', source: 'website', priority: 'medium', notes: '' });

  const leadsQ = (trpc.crm as any).leads.list.useQuery({ search: search || undefined, status: statusFilter || undefined });
  const utils = trpc.useUtils();
  const createM = (trpc.crm as any).leads.create.useMutation({
    onSuccess: () => { (utils.crm as any).leads.list.invalidate(); setShowCreate(false); setForm({ companyName: '', contactName: '', contactPhone: '', contactEmail: '', source: 'website', priority: 'medium', notes: '' }); }
  });
  const convertM = (trpc.crm as any).leads.convertToCustomer.useMutation({
    onSuccess: () => { (utils.crm as any).leads.list.invalidate(); }
  });

  const leads = leadsQ.data || [];

  const priorityColors: Record<string, string> = { high: '#d13438', medium: '#f7630c', low: '#107c10' };
  const priorityLabels: Record<string, string> = { high: t("crm.leads.priority.high"), medium: t("crm.leads.priority.medium"), low: t("crm.leads.priority.low") };
  const statusLabels: Record<string, string> = { new: t("crm.workbench.statusNew"), contacted: t("crm.workbench.statusContacted"), qualified: t("crm.workbench.statusQualified"), converted: t("crm.workbench.statusConverted"), lost: t("crm.workbench.statusLost") };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#605e5c]" />
          <FluentInput value={search} onChange={setSearch} placeholder={t("crm.workbench.searchLead")} className="pl-8" />
        </div>
        <FluentSelect value={statusFilter} onChange={setStatusFilter}>
          <option value="">{t("crm.leads.allStatus")}</option>
          <option value="new">{t("crm.workbench.statusNew")}</option>
          <option value="contacted">{t("crm.workbench.statusContacted")}</option>
          <option value="qualified">{t("crm.workbench.statusQualified")}</option>
          <option value="converted">{t("crm.workbench.statusConverted")}</option>
        </FluentSelect>
        <FluentButton onClick={() => setShowCreate(true)}><Plus size={14} /> {t("crm.leads.newLead")}</FluentButton>
      </div>

      <div className="grid gap-3">
        {leads.map((lead: any) => (
          <FluentCard key={lead.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-[#323130]">{lead.companyName}</h4>
                  <FluentBadge color={priorityColors[lead.priority] || '#605e5c'} bg={priorityColors[lead.priority] + '18' || '#f3f2f1'}>
                    {priorityLabels[lead.priority] || lead.priority}
                  </FluentBadge>
                  <FluentBadge>{statusLabels[lead.status] || lead.status}</FluentBadge>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-[#605e5c]">
                  {lead.contactName && <span className="flex items-center gap-1"><Users size={12} />{lead.contactName}</span>}
                  {lead.contactPhone && <span className="flex items-center gap-1"><Phone size={12} />{lead.contactPhone}</span>}
                  {lead.contactEmail && <span className="flex items-center gap-1"><Mail size={12} />{lead.contactEmail}</span>}
                </div>
                {lead.aiConfidenceScore != null && (
                  <div className="mt-2 flex items-center gap-2">
                    <Sparkles size={12} className="text-[#0078d4]" />
                    <span className="text-xs text-[#605e5c]">{t("crm.workbench.aiConfidence")}</span>
                    <div className="flex-1 max-w-[120px] bg-[#f3f2f1] rounded-full h-2">
                      <div className="h-full rounded-full" style={{
                        width: `${lead.aiConfidenceScore}%`,
                        backgroundColor: lead.aiConfidenceScore >= 70 ? '#107c10' : lead.aiConfidenceScore >= 40 ? '#f7630c' : '#d13438',
                      }} />
                    </div>
                    <span className="text-xs font-medium text-[#323130]">{lead.aiConfidenceScore}%</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {lead.status !== 'converted' && lead.status !== 'lost' && (
                  <FluentButton variant="ghost" onClick={async () => {
                    try { await convertM.mutateAsync({ id: lead.id }); }
                    catch (err) { console.error("Convert lead failed:", err); }
                  }}>
                    <UserPlus size={14} /> {t("crm.workbench.convert")}
                  </FluentButton>
                )}
              </div>
            </div>
          </FluentCard>
        ))}
        {leads.length === 0 && <p className="text-sm text-[#605e5c] text-center py-8">{t("crm.leads.noLeads")}</p>}
      </div>

      {/* Create Dialog */}
      <FluentDialog open={showCreate} onClose={() => setShowCreate(false)} title={t("crm.leads.newLead")}>
        <div className="space-y-3">
          <FormField label={t("crm.workbench.companyName")}><FluentInput value={form.companyName} onChange={v => setForm(p => ({ ...p, companyName: v }))} placeholder={t("crm.workbench.enterCompanyName")} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("crm.workbench.contactPerson")}><FluentInput value={form.contactName} onChange={v => setForm(p => ({ ...p, contactName: v }))} placeholder={t("crm.contacts.name")} /></FormField>
            <FormField label={t("crm.phone")}><FluentInput value={form.contactPhone} onChange={v => setForm(p => ({ ...p, contactPhone: v }))} placeholder={t("crm.phone")} /></FormField>
          </div>
          <FormField label={t("crm.email")}><FluentInput value={form.contactEmail} onChange={v => setForm(p => ({ ...p, contactEmail: v }))} placeholder={t("crm.email")} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("crm.workbench.source")}>
              <FluentSelect value={form.source} onChange={v => setForm(p => ({ ...p, source: v }))}>
                <option value="website">{t("crm.workbench.sourceWebsite")}</option>
                <option value="referral">{t("crm.workbench.sourceReferral")}</option>
                <option value="exhibition">{t("crm.workbench.sourceExhibition")}</option>
                <option value="cold_call">{t("crm.workbench.sourceColdCall")}</option>
                <option value="other">{t("crm.workbench.sourceOther")}</option>
              </FluentSelect>
            </FormField>
            <FormField label={t("crm.workbench.priority")}>
              <FluentSelect value={form.priority} onChange={v => setForm(p => ({ ...p, priority: v }))}>
                <option value="high">{t("crm.leads.priority.high")}</option>
                <option value="medium">{t("crm.leads.priority.medium")}</option>
                <option value="low">{t("crm.leads.priority.low")}</option>
              </FluentSelect>
            </FormField>
          </div>
          <FormField label={t("crm.remark")}><FluentTextarea value={form.notes} onChange={v => setForm(p => ({ ...p, notes: v }))} placeholder={t("crm.workbench.remarkInfo")} /></FormField>
          <div className="flex justify-end gap-2 pt-2">
            <FluentButton variant="secondary" onClick={() => setShowCreate(false)}>{t("crm.workbench.cancel")}</FluentButton>
            <FluentButton onClick={async () => {
              try {
                await createM.mutateAsync({
                  companyName: form.companyName, contactName: form.contactName, contactPhone: form.contactPhone,
                  contactEmail: form.contactEmail, source: form.source, priority: form.priority, notes: form.notes || undefined,
                });
              } catch (err) {
                console.error("Create lead failed:", err);
              }
            }} disabled={!form.companyName || createM.isPending}>{createM.isPending ? t("crm.workbench.creating") : t("crm.workbench.create")}</FluentButton>
          </div>
        </div>
      </FluentDialog>
    </div>
  );
}

// ── Customers Tab ──
function CustomersTab() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const custQ = (trpc.crm as any).customers.list.useQuery({
    search: search || undefined,
    level: levelFilter || undefined,
    type: typeFilter || undefined,
  });
  const statsQ = (trpc.crm as any).customers.stats.useQuery({});

  const customers = custQ.data?.items || [];
  const stats = statsQ.data;

  const typeLabelsMap: Record<string, string> = {
    enterprise: t("crm.workbench.typeEnterprise"),
    individual: t("crm.workbench.typeIndividual"),
    government: t("crm.workbench.typeGovernment"),
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={t("crm.totalCustomers")} value={stats?.total ?? '--'} icon={Building2} color="#0078d4" />
        {(stats?.byLevel || []).slice(0, 3).map((bl: any) => {
          const lc = LEVEL_COLORS[bl.level] || LEVEL_COLORS.C;
          return <StatCard key={bl.level} label={`${bl.level}${t("crm.workbench.levelCustomer")}`} value={Number(bl.count) || 0} icon={Star} color={lc.text} />;
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#605e5c]" />
          <FluentInput value={search} onChange={setSearch} placeholder={t("crm.workbench.searchCustomer")} className="pl-8" />
        </div>
        <FluentSelect value={levelFilter} onChange={setLevelFilter}>
          <option value="">{t("crm.allLevels")}</option>
          {['S','A','B','C','D'].map(l => <option key={l} value={l}>{l}{t("crm.workbench.levelSuffix")}</option>)}
        </FluentSelect>
        <FluentSelect value={typeFilter} onChange={setTypeFilter}>
          <option value="">{t("crm.allTypes")}</option>
          <option value="enterprise">{t("crm.workbench.typeEnterprise")}</option>
          <option value="individual">{t("crm.workbench.typeIndividual")}</option>
          <option value="government">{t("crm.workbench.typeGovernment")}</option>
        </FluentSelect>
      </div>

      {/* Customer Cards */}
      <div className="grid gap-3">
        {customers.map((cust: any) => {
          const lc = LEVEL_COLORS[cust.level] || LEVEL_COLORS.C;
          return (
            <FluentCard key={cust.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: lc.bg, color: lc.text, border: `1px solid ${lc.border}` }}>
                    {cust.level || 'C'}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#323130]">{cust.name}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[#605e5c]">
                      {cust.industry && <span>{cust.industry}</span>}
                      {cust.region && <span>{cust.region}</span>}
                      {cust.type && <FluentBadge>{typeLabelsMap[cust.type] || cust.type}</FluentBadge>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FluentButton variant="ghost"><Eye size={14} /> {t("crm.workbench.details")}</FluentButton>
                </div>
              </div>
            </FluentCard>
          );
        })}
        {customers.length === 0 && <p className="text-sm text-[#605e5c] text-center py-8">{t("crm.noCustomers")}</p>}
      </div>
    </div>
  );
}

// ── Interactions Tab ──
function InteractionsTab() {
  const { t } = useLanguage();
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ customerId: '', type: 'call', subject: '', content: '' });

  const intQ = (trpc.crm as any).interactions.list.useQuery({ type: typeFilter || undefined });
  const utils = trpc.useUtils();
  const createM = (trpc.crm as any).interactions.create.useMutation({
    onSuccess: () => { (utils.crm as any).interactions.list.invalidate(); setShowCreate(false); setForm({ customerId: '', type: 'call', subject: '', content: '' }); }
  });

  const interactions = intQ.data?.items || [];

  const typeIcons: Record<string, any> = {
    call: Phone, email: Mail, meeting: Calendar, visit: Building2, other: MessageSquare,
  };
  const typeLabels: Record<string, string> = {
    call: t("crm.workbench.typeCall"), email: t("crm.workbench.typeEmail"), meeting: t("crm.workbench.typeMeeting"), visit: t("crm.workbench.typeVisit"), other: t("crm.workbench.typeOther"),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FluentSelect value={typeFilter} onChange={setTypeFilter}>
          <option value="">{t("crm.allTypes")}</option>
          <option value="call">{t("crm.workbench.typeCall")}</option>
          <option value="email">{t("crm.workbench.typeEmail")}</option>
          <option value="meeting">{t("crm.workbench.typeMeeting")}</option>
          <option value="visit">{t("crm.workbench.typeVisit")}</option>
        </FluentSelect>
        <FluentButton onClick={() => setShowCreate(true)}><Plus size={14} /> {t("crm.workbench.newRecord")}</FluentButton>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-[#edebe9]" />
        <div className="space-y-4">
          {interactions.map((item: any) => {
            const TIcon = typeIcons[item.type] || MessageSquare;
            return (
              <div key={item.id} className="relative flex gap-3 pl-1">
                <div className="z-10 w-10 h-10 rounded-full bg-white border-2 border-[#0078d4] flex items-center justify-center shrink-0">
                  <TIcon size={16} className="text-[#0078d4]" />
                </div>
                <FluentCard className="flex-1 p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <FluentBadge>{typeLabels[item.type] || item.type}</FluentBadge>
                        <span className="text-sm font-medium text-[#323130]">{item.subject}</span>
                      </div>
                      {item.content && <p className="text-xs text-[#605e5c] mt-1 line-clamp-2">{item.content}</p>}
                    </div>
                    <span className="text-xs text-[#a19f9d] shrink-0">{item.interactionDate ? new Date(item.interactionDate).toLocaleDateString() : ''}</span>
                  </div>
                  {item.isComplaint && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-[#d13438]">
                      <AlertTriangle size={12} /> {t("crm.workbench.customerComplaint")}
                    </div>
                  )}
                </FluentCard>
              </div>
            );
          })}
          {interactions.length === 0 && <p className="text-sm text-[#605e5c] text-center py-8 pl-12">{t("crm.workbench.noRecords")}</p>}
        </div>
      </div>

      {/* Create Dialog */}
      <FluentDialog open={showCreate} onClose={() => setShowCreate(false)} title={t("crm.workbench.newInteraction")}>
        <div className="space-y-3">
          <FormField label={t("crm.workbench.customerId")}><FluentInput value={form.customerId} onChange={v => setForm(p => ({ ...p, customerId: v }))} placeholder={t("crm.workbench.enterCustomerId")} /></FormField>
          <FormField label={t("crm.workbench.interactionType")}>
            <FluentSelect value={form.type} onChange={v => setForm(p => ({ ...p, type: v }))}>
              <option value="call">{t("crm.workbench.typeCall")}</option>
              <option value="email">{t("crm.workbench.typeEmail")}</option>
              <option value="meeting">{t("crm.workbench.typeMeeting")}</option>
              <option value="visit">{t("crm.workbench.typeVisit")}</option>
              <option value="other">{t("crm.workbench.typeOther")}</option>
            </FluentSelect>
          </FormField>
          <FormField label={t("crm.workbench.subject")}><FluentInput value={form.subject} onChange={v => setForm(p => ({ ...p, subject: v }))} placeholder={t("crm.workbench.enterSubject")} /></FormField>
          <FormField label={t("crm.workbench.content")}><FluentTextarea value={form.content} onChange={v => setForm(p => ({ ...p, content: v }))} placeholder={t("crm.workbench.recordContent")} /></FormField>
          <div className="flex justify-end gap-2 pt-2">
            <FluentButton variant="secondary" onClick={() => setShowCreate(false)}>{t("crm.workbench.cancel")}</FluentButton>
            <FluentButton onClick={async () => {
              try {
                await createM.mutateAsync({
                  customerId: Number(form.customerId) || 1, type: form.type,
                  subject: form.subject, content: form.content || undefined, createdBy: 1,
                });
              } catch (err) {
                console.error("Create interaction failed:", err);
              }
            }} disabled={!form.subject || createM.isPending}>
              <Send size={14} /> {createM.isPending ? t("crm.workbench.creating") : t("crm.workbench.create")}
            </FluentButton>
          </div>
        </div>
      </FluentDialog>
    </div>
  );
}

// ── Analytics Tab ──
function AnalyticsTab() {
  const { t } = useLanguage();

  const PIPELINE_STAGES = [
    { key: 'lead', label: t("crm.workbench.stageLead"), color: '#0078d4' },
    { key: 'qualification', label: t("crm.workbench.stageQualification"), color: '#2b88d8' },
    { key: 'proposal', label: t("crm.workbench.stageProposal"), color: '#71afe5' },
    { key: 'negotiation', label: t("crm.workbench.stageNegotiation"), color: '#f7630c' },
    { key: 'closed_won', label: t("crm.workbench.stageWon"), color: '#107c10' },
    { key: 'closed_lost', label: t("crm.workbench.stageLost"), color: '#d13438' },
  ];

  const oppStatsQ = (trpc.crm as any).opportunities.stats.useQuery({});
  const custStatsQ = (trpc.crm as any).customers.stats.useQuery({});
  const funnelQ = (trpc.crm as any).opportunities.funnel.useQuery({});
  const intStatsQ = (trpc.crm as any).interactions.stats.useQuery({});

  const queryError = oppStatsQ.error || custStatsQ.error || funnelQ.error || intStatsQ.error;
  const oppStats = oppStatsQ.data;
  const custStats = custStatsQ.data;
  const funnel = Array.isArray(funnelQ.data) ? funnelQ.data : [];
  const intStats = intStatsQ.data;
  const maxFunnelVal = Math.max(...funnel.map((f: any) => Number(f.totalValue) || 0), 1);

  const typeLabelsMap: Record<string, string> = {
    enterprise: t("crm.workbench.enterpriseCustomer"),
    individual: t("crm.workbench.individualCustomer"),
    government: t("crm.workbench.governmentCustomer"),
  };

  return (
    <div className="space-y-4">
      {queryError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
          <p className="font-semibold text-red-700">CRM data loading error</p>
          <p className="mt-1 text-red-600 font-mono text-xs">{queryError.message}</p>
          <button onClick={() => { oppStatsQ.refetch(); custStatsQ.refetch(); funnelQ.refetch(); intStatsQ.refetch(); }} className="mt-2 rounded bg-red-100 px-3 py-1 text-xs text-red-700 hover:bg-red-200">Retry</button>
        </div>
      )}
      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={t("crm.workbench.pipelineTotal")} value={oppStats ? `¥${(Number(oppStats.pipelineValue) / 10000).toFixed(0)}万` : '--'} icon={DollarSign} color="#0078d4" />
        <StatCard label={t("crm.workbench.winRate")} value={oppStats ? `${(Number(oppStats.winRate) * 100).toFixed(1)}%` : '--'} icon={TrendingUp} color="#107c10" />
        <StatCard label={t("crm.totalCustomers")} value={custStats?.total ?? '--'} icon={Users} color="#f7630c" />
        <StatCard label={t("crm.workbench.interactionCount")} value={intStats?.total ?? '--'} icon={MessageSquare} color="#8764b8" />
      </div>

      {/* Pipeline Funnel Analysis */}
      <FluentCard className="p-5">
        <h4 className="text-sm font-semibold text-[#323130] mb-4">{t("crm.workbench.funnelAnalysis")}</h4>
        <div className="space-y-3">
          {funnel.map((f: any, i: number) => {
            const stage = PIPELINE_STAGES.find(s => s.key === f.stage);
            const pct = ((Number(f.totalValue) || 0) / maxFunnelVal) * 100;
            return (
              <div key={f.stage}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: stage?.color || '#0078d4' }} />
                    <span className="text-sm text-[#323130]">{stage?.label || f.stage}</span>
                  </div>
                  <div className="text-xs text-[#605e5c]">
                    {f.count}{t("crm.workbench.oppUnit")} · ¥{(Number(f.totalValue) / 10000).toFixed(1)}万
                  </div>
                </div>
                <div className="bg-[#f3f2f1] rounded-full h-5 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${Math.max(pct, 5)}%`,
                    backgroundColor: stage?.color || '#0078d4',
                    opacity: 1 - i * 0.1,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </FluentCard>

      {/* Customer Level Breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        <FluentCard className="p-5">
          <h4 className="text-sm font-semibold text-[#323130] mb-3">{t("crm.workbench.levelDistribution")}</h4>
          <div className="space-y-2">
            {(custStats?.byLevel || []).map((bl: any) => {
              const lc = LEVEL_COLORS[bl.level] || LEVEL_COLORS.C;
              const total = Number(custStats?.total) || 1;
              const pct = (((Number(bl.count) || 0) / total) * 100).toFixed(1);
              return (
                <div key={bl.level} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: lc.bg, color: lc.text, border: `1px solid ${lc.border}` }}>
                    {bl.level}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#323130]">{bl.level}{t("crm.workbench.levelCustomer")}</span>
                      <span className="text-[#605e5c]">{Number(bl.count) || 0}{t("crm.workbench.countUnit")} ({pct}%)</span>
                    </div>
                    <div className="bg-[#f3f2f1] rounded-full h-2">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: lc.text }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </FluentCard>

        <FluentCard className="p-5">
          <h4 className="text-sm font-semibold text-[#323130] mb-3">{t("crm.workbench.typeDistribution")}</h4>
          <div className="space-y-3">
            {(custStats?.byType || []).map((bt: any) => {
              const total = Number(custStats?.total) || 1;
              const pct = (((Number(bt.count) || 0) / total) * 100).toFixed(1);
              const typeLabel = typeLabelsMap[bt.type] || bt.type;
              return (
                <div key={bt.type} className="flex items-center justify-between">
                  <span className="text-sm text-[#323130]">{typeLabel}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#323130]">{bt.count}</span>
                    <span className="text-xs text-[#605e5c]">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </FluentCard>
      </div>

      {/* Win/Loss Summary */}
      <FluentCard className="p-5">
        <h4 className="text-sm font-semibold text-[#323130] mb-3">{t("crm.workbench.winLossOverview")}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-[#107c10]">
              <CheckCircle2 size={20} />
              <span className="text-2xl font-bold">{oppStats?.wonCount ?? 0}</span>
            </div>
            <p className="text-xs text-[#605e5c] mt-1">{t("crm.workbench.won")}</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-[#d13438]">
              <XCircle size={20} />
              <span className="text-2xl font-bold">{oppStats?.lostCount ?? 0}</span>
            </div>
            <p className="text-xs text-[#605e5c] mt-1">{t("crm.workbench.lost")}</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-[#0078d4]">
              <Target size={20} />
              <span className="text-2xl font-bold">{oppStats?.pipelineCount ?? 0}</span>
            </div>
            <p className="text-xs text-[#605e5c] mt-1">{t("crm.workbench.inProgress")}</p>
          </div>
        </div>
      </FluentCard>
    </div>
  );
}

// ── Main Component ──
export default function SalesCRMWorkbench() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>('pipeline');

  const TABS: { key: TabKey; label: string; icon: any }[] = [
    { key: 'pipeline', label: t("crm.workbench.tabPipeline"), icon: Target },
    { key: 'leads', label: t("crm.workbench.tabLeads"), icon: Zap },
    { key: 'customers', label: t("crm.workbench.tabCustomers"), icon: Users },
    { key: 'interactions', label: t("crm.workbench.tabInteractions"), icon: MessageSquare },
    { key: 'analytics', label: t("crm.workbench.tabAnalytics"), icon: BarChart3 },
  ];

  const TabContent = {
    pipeline: PipelineTab,
    leads: LeadsTab,
    customers: CustomersTab,
    interactions: InteractionsTab,
    analytics: AnalyticsTab,
  };
  const ActivePanel = TabContent[activeTab];

  return (
    <div className="min-h-screen bg-[#faf9f8]">
      {/* Header */}
      <div className="bg-white border-b border-[#edebe9] px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#323130]">{t("crm.workbench.title")}</h1>
            <p className="text-xs sm:text-sm text-[#605e5c] mt-0.5">{t("crm.workbench.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <FluentButton variant="secondary"><RefreshCw size={14} /> {t("crm.workbench.refresh")}</FluentButton>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 mt-4 -mb-[17px] overflow-x-auto scrollbar-hide">
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                  isActive ? 'text-[#0078d4] bg-[#faf9f8] border border-[#edebe9] border-b-transparent -mb-px' : 'text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1]'
                }`}>
                <tab.icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 sm:p-6">
        <ActivePanel />
      </div>
    </div>
  );
}
