// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { supabase } from "@/integrations/supabase/client";
// import { useToast } from "@/hooks/use-toast";
// import { Award, Download } from "lucide-react";
// import jsPDF from "jspdf";

// interface CertificateGeneratorProps {
//   courseTitle: string;
//   userName: string;
//   userId: string;
//   courseId: string;
//   onRequestSubmitted?: () => void;
// }

// const CertificateGenerator = ({
//   courseTitle,
//   userName,
//   userId,
//   courseId,
//   onRequestSubmitted,
// }: CertificateGeneratorProps) => {
//   const { toast } = useToast();

//   const generatePDF = () => {
//     const pdf = new jsPDF({
//       orientation: "landscape",
//       unit: "mm",
//       format: "a4",
//     });

//     const width = 297;
//     const height = 210;

//     pdf.setFillColor(15, 23, 42);
//     pdf.rect(0, 0, width, height, "F");

//     pdf.setDrawColor(139, 92, 246);
//     pdf.setLineWidth(2);
//     pdf.rect(10, 10, width - 20, height - 20);

//     pdf.setDrawColor(168, 85, 247);
//     pdf.setLineWidth(0.5);
//     pdf.rect(15, 15, width - 30, height - 30);

//     pdf.setFont("helvetica", "bold");
//     pdf.setFontSize(36);
//     pdf.setTextColor(168, 85, 247);
//     const bitEduWidth = pdf.getTextWidth("BitEdu");
//     pdf.text("BitEdu", (width - bitEduWidth) / 2, 40);

//     pdf.setFontSize(16);
//     pdf.setTextColor(148, 163, 184);
//     const certText = "Certificate of Completion";
//     const certWidth = pdf.getTextWidth(certText);
//     pdf.text(certText, (width - certWidth) / 2, 55);

//     pdf.setFont("helvetica", "bold");
//     pdf.setFontSize(28);
//     pdf.setTextColor(255, 255, 255);
//     const courseTitleWidth = pdf.getTextWidth(courseTitle);
//     pdf.text(courseTitle, (width - courseTitleWidth) / 2, 85);

//     pdf.setFont("helvetica", "normal");
//     pdf.setFontSize(14);
//     pdf.setTextColor(148, 163, 184);
//     const completedByText = "Completed by";
//     const completedByWidth = pdf.getTextWidth(completedByText);
//     pdf.text(completedByText, (width - completedByWidth) / 2, 105);

//     pdf.setFont("helvetica", "bold");
//     pdf.setFontSize(22);
//     pdf.setTextColor(255, 255, 255);
//     const userNameWidth = pdf.getTextWidth(userName);
//     pdf.text(userName, (width - userNameWidth) / 2, 120);

//     pdf.setFont("helvetica", "normal");
//     pdf.setFontSize(12);
//     pdf.setTextColor(148, 163, 184);
//     const dateText = new Date().toLocaleDateString("en-US", {
//       year: "numeric",
//       month: "long",
//       day: "numeric",
//     });
//     const dateWidth = pdf.getTextWidth(dateText);
//     pdf.text(dateText, (width - dateWidth) / 2, 135);

//     pdf.setDrawColor(139, 92, 246);
//     pdf.setLineWidth(0.5);
//     pdf.line(80, 145, width - 80, 145);

//     pdf.setFont("helvetica", "normal");
//     pdf.setFontSize(10);
//     pdf.setTextColor(100, 116, 139);
//     const poweredByText = "Powered by Stack";
//     const poweredByWidth = pdf.getTextWidth(poweredByText);
//     pdf.text(poweredByText, (width - poweredByWidth) / 2, height - 25);

//     return pdf;
//   };

//   const handleRequestCertificate = async () => {
//     try {
//       // Get current session to ensure we're authenticated
//       const {
//         data: { session },
//       } = await supabase.auth.getSession();

//       if (!session) {
//         toast({
//           title: "Not authenticated",
//           description: "Please sign in to request a certificate",
//           variant: "destructive",
//         });
//         return;
//       }

//       // Check if already requested
//       const { data: existing, error: checkError } = await supabase
//         .from("certificates")
//         .select("*")
//         .eq("user_id", session.user.id)
//         .eq("course_id", courseId)
//         .maybeSingle();

//       if (checkError) {
//         console.error("Error checking existing certificate:", checkError);
//         throw checkError;
//       }

//       if (existing) {
//         toast({
//           title: "Already Requested",
//           description: "You've already requested a certificate for this course",
//         });
//         return;
//       }

//       // Insert certificate request - this should now work with the fixed RLS policies
//       const { error } = await supabase.from("certificates").insert({
//         user_id: session.user.id,
//         course_id: courseId,
//         status: "pending",
//         requested_at: new Date().toISOString(),
//       });

//       if (error) {
//         console.error("Certificate insert error:", error);
//         throw error;
//       }

//       toast({
//         title: "Certificate Requested",
//         description: "Your certificate request has been submitted to admin",
//       });

//       onRequestSubmitted?.();
//     } catch (error: any) {
//       console.error("Error requesting certificate:", error);
//       toast({
//         title: "Error",
//         description: error.message || "Failed to request certificate",
//         variant: "destructive",
//       });
//     }
//   };

//   const handleDownloadCertificate = async () => {
//     try {
//       const {
//         data: { session },
//       } = await supabase.auth.getSession();

//       if (!session) {
//         toast({
//           title: "Not authenticated",
//           description: "Please sign in to download your certificate",
//           variant: "destructive",
//         });
//         return;
//       }

//       const { data: cert, error } = await supabase
//         .from("certificates")
//         .select("status")
//         .eq("user_id", session.user.id)
//         .eq("course_id", courseId)
//         .single();

//       if (error) throw error;

//       if (cert?.status !== "approved") {
//         toast({
//           title: "Certificate Not Approved",
//           description: "Please wait for admin approval before downloading",
//           variant: "destructive",
//         });
//         return;
//       }

//       const pdf = generatePDF();
//       pdf.save(`${courseTitle.replace(/\s+/g, "-")}-Certificate.pdf`);

//       toast({
//         title: "Certificate Downloaded",
//         description: "Your certificate has been downloaded successfully",
//       });
//     } catch (error: any) {
//       console.error("Error downloading certificate:", error);
//       toast({
//         title: "Error",
//         description: error.message || "Failed to download certificate",
//         variant: "destructive",
//       });
//     }
//   };

//   return (
//     <Card className="bg-gradient-card border-primary/20">
//       <CardHeader>
//         <div className="flex items-center gap-3">
//           <Award className="h-8 w-8 text-primary" />
//           <div>
//             <CardTitle>Course Completed!</CardTitle>
//             <CardDescription>
//               Request your certificate or download it
//             </CardDescription>
//           </div>
//         </div>
//       </CardHeader>
//       <CardContent className="space-y-4">
//         <div className="flex gap-4">
//           <Button
//             onClick={handleRequestCertificate}
//             className="flex-1 bg-gradient-primary hover:opacity-90"
//           >
//             <Award className="mr-2 h-4 w-4" />
//             Request Certificate
//           </Button>
//           <Button
//             onClick={handleDownloadCertificate}
//             variant="outline"
//             className="flex-1"
//           >
//             <Download className="mr-2 h-4 w-4" />
//             Download PDF
//           </Button>
//         </div>
//       </CardContent>
//     </Card>
//   );
// };

// export default CertificateGenerator;
// CertificateGenerator.tsx
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Award, Wallet, LogOut, RefreshCw } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useState } from "react";

/**
 * CertificateGenerator now contains the wallet connect logic (connect/disconnect),
 * and keeps the CertificateGenerator UI/look (Award header, card colors).
 *
 * Props kept simple — pass courseTitle/courseId if you want to display them here.
 */
interface CertificateGeneratorProps {
  courseTitle?: string;
  courseId?: string;
}

const CertificateGenerator = ({
  courseTitle = "Course Completed!",
  courseId,
}: CertificateGeneratorProps) => {
  const {
    connected,
    publicKey,
    balance,
    connecting,
    connect,
    disconnect,
    refreshBalance,
  } = useWallet();

  const [requestingAirdrop, setRequestingAirdrop] = useState(false);

  // optional helper if you still want to airdrop in devnet while connected
  const handleAirdrop = async () => {
    // noop here — keep minimal. You can re-add requestAirdrop logic if needed.
  };

  return (
    <Card className="bg-gradient-card border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Award className="h-8 w-8 text-primary" />
          <div>
            <CardTitle>{courseTitle}</CardTitle>
            <CardDescription>
              Connect your wallet to request or download certificates
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* If not connected -> show prominent Connect Phantom UI (keeps CertificateGenerator look) */}
        {!connected ? (
          <div className="flex flex-col items-center text-center space-y-4 p-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <Wallet className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Connect Your Wallet
              </h3>
              <p className="text-sm text-muted-foreground">
                Connect Phantom to request and download your course certificate.
              </p>
            </div>

            <Button
              onClick={connect}
              disabled={connecting}
              size="lg"
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
            >
              {connecting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Phantom
                </>
              )}
            </Button>
          </div>
        ) : (
          // Connected view (keeps CertificateGenerator card/visual style)
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Connected Wallet
                  </p>
                  <p className="font-mono text-sm font-medium">
                    {publicKey?.toBase58().slice(0, 8)}...
                    {publicKey?.toBase58().slice(-8)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={disconnect}
                  variant="outline"
                  size="sm"
                  className="hover:bg-destructive hover:text-destructive-foreground"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">
                  Balance (Devnet)
                </p>
                <p className="text-lg font-bold">{balance.toFixed(4)} SOL</p>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={refreshBalance}
                  size="sm"
                  variant="outline"
                  className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                >
                  Refresh
                </Button>

                <Button
                  onClick={handleAirdrop}
                  size="sm"
                  variant="outline"
                  className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                  disabled={requestingAirdrop}
                >
                  {requestingAirdrop ? "Requesting..." : "Airdrop (devnet)"}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Using Solana Devnet • Testnet funds only
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CertificateGenerator;
