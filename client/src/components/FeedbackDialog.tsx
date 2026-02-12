import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"suggestion" | "bug" | "other">("suggestion");
  const [content, setContent] = useState("");
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  const submitMutation = (trpc.feedback as any).submit.useMutation({
    onSuccess: () => {
      setOpen(false);
      setContent("");
      setType("suggestion");
      toast.success(t("feedback.success"));
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit feedback");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error("Please login to submit feedback");
      window.location.href = getLoginUrl();
      return;
    }

    if (!content.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    submitMutation.mutate({ type, content });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-3 px-4 py-3 text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:border-sidebar-border h-auto font-normal">
          <MessageSquare className="w-5 h-5" />
          <span className="font-medium tracking-wide">{t("nav.feedback")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading">{t("feedback.title")}</DialogTitle>
          <DialogDescription>
            {t("feedback.desc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="type">{t("feedback.label.type")}</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="suggestion">Suggestion</SelectItem>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="content">{t("feedback.label.content")}</Label>
            <Textarea 
              id="content" 
              placeholder={t("feedback.placeholder.content")}
              className="min-h-[100px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? "Submitting..." : t("feedback.btn.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
