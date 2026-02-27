/**
 * GRT Cloud Vault — Project File Manager
 * 4-tab file management component: Commercial, Engineering, Production & ECO, Service Logs
 */
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Wrench, ClipboardList, Headphones, Upload, RefreshCw } from "lucide-react";

interface ProjectCloudVaultProps {
  projectId: number;
}

const FILE_TYPE_COLORS: Record<string, string> = {
  SOLIDWORKS: "bg-blue-500/20 text-blue-400",
  EPLAN: "bg-purple-500/20 text-purple-400",
  WORD: "bg-sky-500/20 text-sky-400",
  PDF: "bg-red-500/20 text-red-400",
  EMAIL_EML: "bg-amber-500/20 text-amber-400",
  MEETING_RECORD: "bg-green-500/20 text-green-400",
};

const ECO_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400",
  pending_review: "bg-yellow-500/20 text-yellow-400",
  approved: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  implemented: "bg-blue-500/20 text-blue-400",
};

type FileType = "SOLIDWORKS" | "EPLAN" | "WORD" | "PDF" | "EMAIL_EML" | "MEETING_RECORD";

export default function ProjectCloudVault({ projectId }: ProjectCloudVaultProps) {
  const [activeTab, setActiveTab] = useState("commercial");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ fileName: "", fileType: "WORD" as FileType });

  const utils = trpc.useUtils();

  // Queries for each tab's data
  const commercialFiles = trpc.vault.list.useQuery({ projectId, fileType: undefined });
  const ecoList = trpc.vault.listEcos.useQuery({ projectId });

  const uploadMutation = trpc.vault.upload.useMutation({
    onSuccess: () => {
      toast.success("File uploaded successfully");
      setUploadOpen(false);
      setUploadForm({ fileName: "", fileType: "WORD" });
      utils.vault.list.invalidate();
    },
    onError: (err) => toast.error("Upload failed", { description: err.message }),
  });

  const checkinMutation = trpc.vault.checkin.useMutation({
    onSuccess: (data) => {
      toast.success(`Checked in — now ${data.version}`);
      utils.vault.list.invalidate();
    },
    onError: (err) => toast.error("Check-in failed", { description: err.message }),
  });

  const handleUpload = () => {
    if (!uploadForm.fileName.trim()) {
      toast.error("File name is required");
      return;
    }
    uploadMutation.mutate({
      projectId,
      fileName: uploadForm.fileName.trim(),
      fileType: uploadForm.fileType,
      uploadedBy: "Current User",
    });
  };

  const allFiles = commercialFiles.data?.items ?? [];

  // Filter files per tab
  const commercial = allFiles.filter(f => ["WORD", "PDF", "EMAIL_EML"].includes(f.fileType));
  const engineering = allFiles.filter(f => ["SOLIDWORKS", "EPLAN"].includes(f.fileType));
  const serviceLogs = allFiles.filter(f => f.fileType === "MEETING_RECORD");
  const ecos = ecoList.data?.items ?? [];

  const renderFileTable = (files: typeof allFiles) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Uploaded By</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              No files yet. Upload one to get started.
            </TableCell>
          </TableRow>
        ) : (
          files.map((file) => (
            <TableRow key={file.id}>
              <TableCell className="font-medium">{file.fileName}</TableCell>
              <TableCell>
                <Badge className={FILE_TYPE_COLORS[file.fileType] ?? ""}>
                  {file.fileType}
                </Badge>
              </TableCell>
              <TableCell>{file.version}</TableCell>
              <TableCell>{(file as any).uploadedBy ?? "—"}</TableCell>
              <TableCell>{file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : "-"}</TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => checkinMutation.mutate({ id: file.id })}
                  disabled={checkinMutation.isPending}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Check-in
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const renderEcoTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Requested By</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Linked Files</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ecos.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              No engineering change orders yet.
            </TableCell>
          </TableRow>
        ) : (
          ecos.map((eco) => (
            <TableRow key={eco.id}>
              <TableCell className="font-mono">ECO-{String(eco.id).padStart(4, "0")}</TableCell>
              <TableCell className="max-w-[300px] truncate">{eco.description}</TableCell>
              <TableCell>{eco.requestedBy}</TableCell>
              <TableCell>
                <Badge className={ECO_STATUS_COLORS[eco.status] ?? ""}>
                  {eco.status.replace(/_/g, " ")}
                </Badge>
              </TableCell>
              <TableCell>{(eco.affectedFiles as number[] | null)?.length ?? 0} files</TableCell>
              <TableCell>{eco.updatedAt ? new Date(eco.updatedAt).toLocaleDateString() : "-"}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Cloud Vault</CardTitle>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Upload to Vault</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="vault-filename">File Name <span className="text-red-500">*</span></Label>
                <Input
                  id="vault-filename"
                  placeholder="e.g. Housing_Assembly.sldasm"
                  value={uploadForm.fileName}
                  onChange={e => setUploadForm(f => ({ ...f, fileName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vault-filetype">File Type</Label>
                <Select
                  value={uploadForm.fileType}
                  onValueChange={val => setUploadForm(f => ({ ...f, fileType: val as FileType }))}
                >
                  <SelectTrigger id="vault-filetype">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SOLIDWORKS">SolidWorks</SelectItem>
                    <SelectItem value="EPLAN">E-Plan</SelectItem>
                    <SelectItem value="WORD">Word</SelectItem>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="EMAIL_EML">Email (EML)</SelectItem>
                    <SelectItem value="MEETING_RECORD">Meeting Record</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
                <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-muted">
            <TabsTrigger value="commercial"><FileText className="w-4 h-4 mr-1" />Commercial</TabsTrigger>
            <TabsTrigger value="engineering"><Wrench className="w-4 h-4 mr-1" />Engineering</TabsTrigger>
            <TabsTrigger value="eco"><ClipboardList className="w-4 h-4 mr-1" />Production & ECO</TabsTrigger>
            <TabsTrigger value="service"><Headphones className="w-4 h-4 mr-1" />Service Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="commercial" className="mt-4">
            {renderFileTable(commercial)}
          </TabsContent>

          <TabsContent value="engineering" className="mt-4">
            {renderFileTable(engineering)}
          </TabsContent>

          <TabsContent value="eco" className="mt-4">
            {renderEcoTable()}
          </TabsContent>

          <TabsContent value="service" className="mt-4">
            {renderFileTable(serviceLogs)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
