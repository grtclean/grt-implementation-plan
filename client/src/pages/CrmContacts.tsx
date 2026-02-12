import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Users, 
  Plus, 
  Search, 
  Phone,
  Mail,
  Building2,
  User,
  Star,
  Edit,
  Eye
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function CrmContacts() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newContact, setNewContact] = useState<{
    name: string;
    customerId: number;
    position: string;
    department: string;
    phone: string;
    mobile: string;
    email: string;
    isKeyPerson: "yes" | "no";
    remark: string;
  }>({
    name: "",
    customerId: 0,
    position: "",
    department: "",
    phone: "",
    mobile: "",
    email: "",
    isKeyPerson: "no",
    remark: "",
  });

  const { data: contacts = [], isLoading, refetch } = (trpc.crm.contacts as any).list.useQuery({
    search: search || undefined,
    customerId: customerFilter !== "all" ? parseInt(customerFilter) : undefined,
  });

  const { data: customers = [] } = (trpc.crm.customers as any).list.useQuery({});

  const createMutation = (trpc.crm.contacts as any).create.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreateOpen(false);
      setNewContact({
        name: "",
        customerId: 0,
        position: "",
        department: "",
        phone: "",
        mobile: "",
        email: "",
        isKeyPerson: "no",
        remark: "",
      });
    },
  });

  const handleCreate = () => {
    if (!newContact.name || !newContact.customerId) return;
    createMutation.mutate({
      ...newContact,
      isKeyPerson: newContact.isKeyPerson,
    });
  };

  // Statistics
  const totalContacts = contacts.length;
  const keyContacts = contacts.filter(c => c.isKeyPerson === "yes").length;
  const uniqueCustomers = new Set(contacts.map(c => c.customerId)).size;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-sm"></span>
              {t("crm.contacts.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("crm.contacts.subtitle")}
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                {t("crm.contacts.newContact")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("crm.contacts.newContact")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t("crm.contacts.name")} *</Label>
                  <Input
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    placeholder={t("crm.contacts.enterName")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("crm.contacts.customer")} *</Label>
                  <Select
                    value={newContact.customerId.toString()}
                    onValueChange={(v) => setNewContact({ ...newContact, customerId: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("crm.contacts.selectCustomer")} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("crm.contacts.position")}</Label>
                    <Input
                      value={newContact.position}
                      onChange={(e) => setNewContact({ ...newContact, position: e.target.value })}
                      placeholder={t("crm.contacts.enterPosition")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("crm.contacts.department")}</Label>
                    <Input
                      value={newContact.department}
                      onChange={(e) => setNewContact({ ...newContact, department: e.target.value })}
                      placeholder={t("crm.contacts.enterDepartment")}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("crm.contacts.mobile")}</Label>
                    <Input
                      value={newContact.mobile}
                      onChange={(e) => setNewContact({ ...newContact, mobile: e.target.value })}
                      placeholder={t("crm.contacts.enterMobile")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("crm.contacts.landline")}</Label>
                    <Input
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      placeholder={t("crm.contacts.enterLandline")}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("crm.email")}</Label>
                  <Input
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    placeholder={t("crm.contacts.enterEmail")}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isKeyContact"
                    checked={newContact.isKeyPerson === "yes"}
                    onChange={(e) => setNewContact({ ...newContact, isKeyPerson: e.target.checked ? "yes" : "no" })}
                    className="rounded border-border"
                  />
                  <Label htmlFor="isKeyContact">{t("crm.contacts.setAsKeyPerson")}</Label>
                </div>
                <div className="space-y-2">
                  <Label>{t("crm.remark")}</Label>
                  <Textarea
                    value={newContact.remark}
                    onChange={(e) => setNewContact({ ...newContact, remark: e.target.value })}
                    placeholder={t("crm.contacts.enterRemark")}
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? t("crm.contacts.creating") : t("common.create")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-sm bg-primary/10 text-primary">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("crm.contacts.totalContacts")}</p>
                <p className="text-2xl font-bold">{totalContacts}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-sm bg-yellow-500/10 text-yellow-500">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("crm.contacts.keyContacts")}</p>
                <p className="text-2xl font-bold">{keyContacts}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-sm bg-blue-500/10 text-blue-500">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("crm.contacts.relatedCustomers")}</p>
                <p className="text-2xl font-bold">{uniqueCustomers}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t("crm.contacts.searchPlaceholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t("crm.contacts.customer")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("crm.contacts.allCustomers")}</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Contacts Table */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t("crm.contacts.contactList")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("common.loading")}
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("crm.contacts.noContacts")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("crm.contacts.name")}</TableHead>
                    <TableHead>{t("crm.contacts.customer")}</TableHead>
                    <TableHead>{t("crm.contacts.position")}/{t("crm.contacts.department")}</TableHead>
                    <TableHead>{t("crm.contacts.mobile")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{contact.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          {customers.find(c => c.id === contact.customerId)?.name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {contact.position && <div className="text-sm">{contact.position}</div>}
                          {contact.department && (
                            <div className="text-xs text-muted-foreground">{contact.department}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {contact.mobile && (
                            <div className="flex items-center gap-1 text-xs">
                              <Phone className="w-3 h-3" />
                              {contact.mobile}
                            </div>
                          )}
                          {contact.email && (
                            <div className="flex items-center gap-1 text-xs">
                              <Mail className="w-3 h-3" />
                              {contact.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.isKeyPerson === "yes" && (
                          <Badge variant="default" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                            <Star className="w-3 h-3 mr-1" />
                            {t("crm.contacts.isKeyPerson")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="flex gap-4">
          <Link href="/crm/customers">
            <Button variant="outline" className="gap-2">
              <Building2 className="w-4 h-4" />
              {t("crm.customers")}
            </Button>
          </Link>
          <Link href="/crm/opportunities">
            <Button variant="outline" className="gap-2">
              <Users className="w-4 h-4" />
              {t("crm.opportunities")}
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
