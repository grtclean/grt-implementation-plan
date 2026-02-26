import { useState, useRef, forwardRef } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Send,
  CheckCircle2,
  Building2,
  User,
  Mail,
  Phone,
  MessageSquare,
  Factory,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Fortune 500 automotive client logo placeholders
const CLIENT_LOGOS = [
  "BMW Group",
  "Mercedes-Benz",
  "Volkswagen AG",
  "BOSCH",
  "Continental",
  "BorgWarner",
  "CATL",
  "BYD",
  "Hyundai",
  "Toyota",
  "Denso",
  "Magna International",
  "ZF Friedrichshafen",
  "Schaeffler",
  "Mahle",
  "Dana Inc.",
  "Aisin",
  "Valeo",
  "HELLA",
  "Nidec",
];

const CERTIFICATIONS = [
  {
    name: "ISO 9001:2015",
    description: "Quality Management System",
    color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  },
  {
    name: "CE",
    description: "European Conformity",
    color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  },
  {
    name: "TISAX",
    description: "Information Security Assessment",
    color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  },
  {
    name: "GDPR",
    description: "Data Protection Compliance",
    color: "text-violet-400 border-violet-500/30 bg-violet-500/10",
  },
  {
    name: "ISO 14001",
    description: "Environmental Management",
    color: "text-green-400 border-green-500/30 bg-green-500/10",
  },
  {
    name: "IATF 16949",
    description: "Automotive Quality Standard",
    color: "text-red-400 border-red-500/30 bg-red-500/10",
  },
];

const TrustAndConversion = forwardRef<HTMLElement, { industry: string }>(
  function TrustAndConversion({ industry }, ref) {
    const [formData, setFormData] = useState({
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      industry: industry,
      requirements: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.companyName || !formData.contactName || !formData.email) {
        toast.error("Please fill in all required fields.");
        return;
      }

      setIsSubmitting(true);

      try {
        const res = await fetch("/api/crm/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            source: "showcase-portal",
            industry,
            timestamp: new Date().toISOString(),
          }),
        });

        if (!res.ok) throw new Error("Submission failed");

        setIsSubmitted(true);
        toast.success("Your proposal request has been received!", {
          description:
            "A GRT senior engineer will contact you within 24 hours. Thank you for your interest.",
          duration: 6000,
        });
      } catch {
        toast.error("Submission failed. Please try again or contact us directly.");
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <section ref={ref} className="py-24 px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          {/* ===================== Customer Wall ===================== */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-24"
          >
            <div className="text-center mb-10">
              <span className="text-xs tracking-[0.3em] uppercase text-neutral-500 block mb-3">
                Trusted by Global Leaders / 全球客户信赖
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Our Customers Drive the World
              </h2>
            </div>

            {/* Scrolling marquee */}
            <div className="relative overflow-hidden py-4">
              {/* Fade edges */}
              <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-neutral-950 to-transparent z-10" />
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-neutral-950 to-transparent z-10" />

              <div className="flex animate-marquee gap-6">
                {[...CLIENT_LOGOS, ...CLIENT_LOGOS].map((logo, i) => (
                  <div
                    key={`${logo}-${i}`}
                    className="flex-shrink-0 w-44 h-20 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-center hover:border-white/20 transition-colors"
                  >
                    <div className="text-center">
                      <Building2 className="w-5 h-5 text-neutral-600 mx-auto mb-1" />
                      <span className="text-xs font-medium text-neutral-400 tracking-wide">
                        {logo}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ===================== Certifications ===================== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-24"
          >
            <div className="text-center mb-10">
              <span className="text-xs tracking-[0.3em] uppercase text-neutral-500 block mb-3">
                Compliance & Certifications / 合规与认证
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Industry-Leading Standards
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {CERTIFICATIONS.map((cert) => (
                <div
                  key={cert.name}
                  className={`rounded-2xl border p-5 text-center transition-transform hover:scale-105 ${cert.color}`}
                >
                  <ShieldCheck className="w-8 h-8 mx-auto mb-3 opacity-80" />
                  <div className="text-sm font-bold">{cert.name}</div>
                  <div className="text-[10px] mt-1 opacity-60">
                    {cert.description}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ===================== The Conversion Engine ===================== */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            id="proposal-form"
          >
            <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-br from-neutral-900/90 via-neutral-900/70 to-neutral-800/50 backdrop-blur-xl overflow-hidden">
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />

              <div className="grid lg:grid-cols-2">
                {/* Left: form info */}
                <div className="p-8 lg:p-12 flex flex-col justify-center">
                  <span className="text-xs tracking-[0.3em] uppercase text-emerald-400 mb-4 block">
                    Get Started / 立即开始
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                    Request Custom Engineering Proposal
                  </h2>
                  <p className="text-2xl font-semibold text-emerald-400/80 mb-4">
                    定制工程方案申请
                  </p>
                  <p className="text-neutral-400 mb-8 leading-relaxed">
                    Share your cleaning requirements and our senior engineers will
                    design a tailored solution within 48 hours. All proposals include
                    cleanliness target analysis, equipment specification, and ROI
                    projection.
                  </p>

                  <div className="space-y-3 text-sm text-neutral-400">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Free engineering consultation
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ISO 16232 / VDA 19 cleanliness target analysis
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Custom equipment configuration & 3D layout
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ROI projection within 48 hours
                    </div>
                  </div>
                </div>

                {/* Right: form */}
                <div className="p-8 lg:p-12 border-t lg:border-t-0 lg:border-l border-white/[0.06]">
                  {isSubmitted ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                      <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">
                        Proposal Request Received
                      </h3>
                      <p className="text-emerald-400 font-medium mb-4">
                        方案申请已收到
                      </p>
                      <p className="text-neutral-400 max-w-sm">
                        Your request has been injected into our M0-CRM system. A
                        senior engineer will contact you within 24 hours.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div>
                        <label className="text-xs font-medium text-neutral-400 mb-1.5 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" />
                          Company Name / 公司名称 *
                        </label>
                        <Input
                          value={formData.companyName}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              companyName: e.target.value,
                            }))
                          }
                          placeholder="e.g., BMW Manufacturing"
                          className="bg-white/[0.04] border-white/10 text-white placeholder:text-neutral-600 focus:border-emerald-500/50"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-neutral-400 mb-1.5 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            Contact Name / 联系人 *
                          </label>
                          <Input
                            value={formData.contactName}
                            onChange={(e) =>
                              setFormData((f) => ({
                                ...f,
                                contactName: e.target.value,
                              }))
                            }
                            placeholder="Full name"
                            className="bg-white/[0.04] border-white/10 text-white placeholder:text-neutral-600 focus:border-emerald-500/50"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-neutral-400 mb-1.5 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" />
                            Phone / 电话
                          </label>
                          <Input
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData((f) => ({
                                ...f,
                                phone: e.target.value,
                              }))
                            }
                            placeholder="+86 ..."
                            className="bg-white/[0.04] border-white/10 text-white placeholder:text-neutral-600 focus:border-emerald-500/50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-neutral-400 mb-1.5 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" />
                          Business Email / 企业邮箱 *
                        </label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              email: e.target.value,
                            }))
                          }
                          placeholder="name@company.com"
                          className="bg-white/[0.04] border-white/10 text-white placeholder:text-neutral-600 focus:border-emerald-500/50"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-neutral-400 mb-1.5 flex items-center gap-1.5">
                          <Factory className="w-3.5 h-3.5" />
                          Industry / 行业
                        </label>
                        <select
                          value={formData.industry}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              industry: e.target.value,
                            }))
                          }
                          className="w-full rounded-md bg-white/[0.04] border border-white/10 text-white px-3 py-2 text-sm focus:border-emerald-500/50 focus:outline-none"
                        >
                          <option value="die-casting">Die Casting (压力铸造)</option>
                          <option value="ice">ICE (内燃机)</option>
                          <option value="new-energy">New Energy (新能源)</option>
                          <option value="fuel-injection">
                            Fuel Injection (燃油喷射)
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-neutral-400 mb-1.5 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" />
                          Requirements / 需求描述
                        </label>
                        <textarea
                          value={formData.requirements}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              requirements: e.target.value,
                            }))
                          }
                          rows={3}
                          placeholder="Describe your cleaning requirements, part types, volumes, and target cleanliness standards..."
                          className="w-full rounded-md bg-white/[0.04] border border-white/10 text-white placeholder:text-neutral-600 px-3 py-2 text-sm focus:border-emerald-500/50 focus:outline-none resize-none"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 hover:opacity-90 py-6 rounded-xl text-base font-semibold shadow-2xl shadow-emerald-500/20"
                      >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Send className="w-5 h-5 mr-2" />
                            Submit Proposal Request / 提交方案申请
                          </>
                        )}
                      </Button>

                      <p className="text-[10px] text-neutral-600 text-center">
                        <Globe className="w-3 h-3 inline mr-1" />
                        Your data is protected under GDPR & TISAX compliance.
                        We will never share your information.
                      </p>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }
);

export default TrustAndConversion;
