import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Award, Download, Clock, CheckCircle2 } from "lucide-react";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";

interface Certificate {
  id: string;
  course_id: string;
  status: string;
  approved_at: string | null;
  requested_at: string;
  courses: {
    title: string;
    slug: string;
  };
}

const Certificates = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCertificates();
    }
  }, [user]);

  const fetchCertificates = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("certificates")
        .select(`
          *,
          courses (title, slug)
        `)
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
    } catch (error: any) {
      console.error("Error fetching certificates:", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = (courseTitle: string) => {
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const width = 297;
    const height = 210;

    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, width, height, "F");

    pdf.setDrawColor(139, 92, 246);
    pdf.setLineWidth(2);
    pdf.rect(10, 10, width - 20, height - 20);

    pdf.setDrawColor(168, 85, 247);
    pdf.setLineWidth(0.5);
    pdf.rect(15, 15, width - 30, height - 30);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(36);
    pdf.setTextColor(168, 85, 247);
    const bitEduWidth = pdf.getTextWidth("BitEdu");
    pdf.text("BitEdu", (width - bitEduWidth) / 2, 40);

    pdf.setFontSize(16);
    pdf.setTextColor(148, 163, 184);
    const certText = "Certificate of Completion";
    const certWidth = pdf.getTextWidth(certText);
    pdf.text(certText, (width - certWidth) / 2, 55);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(28);
    pdf.setTextColor(255, 255, 255);
    const courseTitleWidth = pdf.getTextWidth(courseTitle);
    pdf.text(courseTitle, (width - courseTitleWidth) / 2, 85);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(14);
    pdf.setTextColor(148, 163, 184);
    const completedByText = "Completed by";
    const completedByWidth = pdf.getTextWidth(completedByText);
    pdf.text(completedByText, (width - completedByWidth) / 2, 105);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.setTextColor(255, 255, 255);
    const userName = profile?.username || "User";
    const userNameWidth = pdf.getTextWidth(userName);
    pdf.text(userName, (width - userNameWidth) / 2, 120);

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

    pdf.setDrawColor(139, 92, 246);
    pdf.setLineWidth(0.5);
    pdf.line(80, 145, width - 80, 145);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(100, 116, 139);
    const poweredByText = "Powered by Stack";
    const poweredByWidth = pdf.getTextWidth(poweredByText);
    pdf.text(poweredByText, (width - poweredByWidth) / 2, height - 25);

    return pdf;
  };

  const handleDownload = (courseTitle: string) => {
    const pdf = generatePDF(courseTitle);
    pdf.save(`${courseTitle.replace(/\s+/g, "-")}-Certificate.pdf`);
    toast({
      title: "Certificate Downloaded",
      description: "Your certificate has been downloaded successfully",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading certificates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              BitEdu
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">My Certificates</h1>
          <p className="text-xl text-muted-foreground">
            View and download your earned certificates
          </p>
        </div>

        {certificates.length === 0 ? (
          <Card className="bg-gradient-card border-primary/20">
            <CardContent className="p-12 text-center">
              <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">No Certificates Yet</h2>
              <p className="text-muted-foreground mb-6">
                Complete courses and pass quizzes to earn certificates
              </p>
              <Link to="/">
                <Button className="bg-gradient-primary hover:opacity-90">
                  Browse Courses
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => (
              <Card key={cert.id} className="bg-gradient-card border-primary/20 hover:shadow-glow transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Award className="h-8 w-8 text-primary" />
                    <Badge
                      variant={
                        cert.status === "approved"
                          ? "default"
                          : cert.status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {cert.status === "pending" && <Clock className="mr-1 h-3 w-3" />}
                      {cert.status === "approved" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                      {cert.status}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4">{cert.courses.title}</CardTitle>
                  <CardDescription>
                    {cert.approved_at
                      ? `Issued ${new Date(cert.approved_at).toLocaleDateString()}`
                      : `Requested ${new Date(cert.requested_at).toLocaleDateString()}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {cert.status === "approved" && (
                      <Button
                        onClick={() => handleDownload(cert.courses.title)}
                        className="flex-1 bg-gradient-primary hover:opacity-90"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    )}
                    <Link to={`/course/${cert.courses.slug}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        View Course
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Certificates;
