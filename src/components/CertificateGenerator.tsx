import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Award, Download } from "lucide-react";
import jsPDF from "jspdf";

interface CertificateGeneratorProps {
  courseTitle: string;
  userName: string;
  userId: string;
  courseId: string;
  onRequestSubmitted?: () => void;
}

const CertificateGenerator = ({
  courseTitle,
  userName,
  userId,
  courseId,
  onRequestSubmitted,
}: CertificateGeneratorProps) => {
  const { toast } = useToast();

  const generatePDF = () => {
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // A4 landscape: 297mm x 210mm
    const width = 297;
    const height = 210;

    // Background gradient
    pdf.setFillColor(15, 23, 42); // slate-900
    pdf.rect(0, 0, width, height, "F");

    // Decorative border
    pdf.setDrawColor(139, 92, 246); // primary purple
    pdf.setLineWidth(2);
    pdf.rect(10, 10, width - 20, height - 20);

    // Inner border
    pdf.setDrawColor(168, 85, 247);
    pdf.setLineWidth(0.5);
    pdf.rect(15, 15, width - 30, height - 30);

    // BitEdu logo/title
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(36);
    pdf.setTextColor(168, 85, 247);
    const bitEduWidth = pdf.getTextWidth("BitEdu");
    pdf.text("BitEdu", (width - bitEduWidth) / 2, 40);

    // Certificate of Completion
    pdf.setFontSize(16);
    pdf.setTextColor(148, 163, 184); // slate-400
    const certText = "Certificate of Completion";
    const certWidth = pdf.getTextWidth(certText);
    pdf.text(certText, (width - certWidth) / 2, 55);

    // Course Title (large)
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(28);
    pdf.setTextColor(255, 255, 255);
    const courseTitleWidth = pdf.getTextWidth(courseTitle);
    pdf.text(courseTitle, (width - courseTitleWidth) / 2, 85);

    // "Completed by" text
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(14);
    pdf.setTextColor(148, 163, 184);
    const completedByText = "Completed by";
    const completedByWidth = pdf.getTextWidth(completedByText);
    pdf.text(completedByText, (width - completedByWidth) / 2, 105);

    // User Name
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.setTextColor(255, 255, 255);
    const userNameWidth = pdf.getTextWidth(userName);
    pdf.text(userName, (width - userNameWidth) / 2, 120);

    // Date
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    pdf.setTextColor(148, 163, 184);
    const dateText = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const dateWidth = pdf.getTextWidth(dateText);
    pdf.text(dateText, (width - dateWidth) / 2, 135);

    // Decorative line
    pdf.setDrawColor(139, 92, 246);
    pdf.setLineWidth(0.5);
    pdf.line(80, 145, width - 80, 145);

    // "Powered by Stack" at bottom
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(100, 116, 139); // slate-500
    const poweredByText = "Powered by Stack";
    const poweredByWidth = pdf.getTextWidth(poweredByText);
    pdf.text(poweredByText, (width - poweredByWidth) / 2, height - 25);

    return pdf;
  };

  const handleRequestCertificate = async () => {
    try {
      // Check if already requested
      const { data: existing } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Already Requested",
          description: "You've already requested a certificate for this course",
        });
        return;
      }

      // Insert certificate request
      const { error } = await supabase.from("certificates").insert({
        user_id: userId,
        course_id: courseId,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Certificate Requested",
        description: "Your certificate request has been submitted to admin",
      });

      onRequestSubmitted?.();
    } catch (error: any) {
      console.error("Error requesting certificate:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to request certificate",
        variant: "destructive",
      });
    }
  };

  const handleDownloadCertificate = async () => {
    try {
      const { data: cert } = await supabase
        .from("certificates")
        .select("status")
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .single();

      if (cert?.status !== "approved") {
        toast({
          title: "Certificate Not Approved",
          description: "Please wait for admin approval before downloading",
          variant: "destructive",
        });
        return;
      }

      const pdf = generatePDF();
      pdf.save(`${courseTitle.replace(/\s+/g, "-")}-Certificate.pdf`);

      toast({
        title: "Certificate Downloaded",
        description: "Your certificate has been downloaded successfully",
      });
    } catch (error: any) {
      console.error("Error downloading certificate:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to download certificate",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-gradient-card border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Award className="h-8 w-8 text-primary" />
          <div>
            <CardTitle>Course Completed!</CardTitle>
            <CardDescription>Request your certificate or download it</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button
            onClick={handleRequestCertificate}
            className="flex-1 bg-gradient-primary hover:opacity-90"
          >
            <Award className="mr-2 h-4 w-4" />
            Request Certificate
          </Button>
          <Button
            onClick={handleDownloadCertificate}
            variant="outline"
            className="flex-1"
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CertificateGenerator;
