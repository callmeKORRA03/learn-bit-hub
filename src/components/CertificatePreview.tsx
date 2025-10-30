import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Award, Sparkles } from "lucide-react";

interface CertificatePreviewProps {
  courseName: string;
  recipientName: string;
  completionDate: string;
  onImageReady?: (dataUrl: string) => void;
}

export const CertificatePreview = ({
  courseName,
  recipientName,
  completionDate,
  onImageReady,
}: CertificatePreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = 1200;
    canvas.height = 800;

    // Background gradient
    const gradient = ctx.createLinearGradient(
      0,
      0,
      canvas.width,
      canvas.height
    );
    gradient.addColorStop(0, "#8b5cf6");
    gradient.addColorStop(0.5, "#a855f7");
    gradient.addColorStop(1, "#eab308");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 20;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    // Inner border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 72px Arial";
    ctx.textAlign = "center";
    ctx.fillText("CERTIFICATE", canvas.width / 2, 150);

    ctx.font = "36px Arial";
    ctx.fillText("OF COMPLETION", canvas.width / 2, 200);

    // Decorative line
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 200, 230);
    ctx.lineTo(canvas.width / 2 + 200, 230);
    ctx.stroke();

    // This certifies that
    ctx.font = "28px Arial";
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillText("This certifies that", canvas.width / 2, 300);

    // Recipient name
    ctx.font = "bold 56px Arial";
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(recipientName || "Your Name", canvas.width / 2, 380);

    // Underline for name
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const nameWidth = ctx.measureText(recipientName || "Your Name").width;
    ctx.moveTo(canvas.width / 2 - nameWidth / 2 - 20, 395);
    ctx.lineTo(canvas.width / 2 + nameWidth / 2 + 20, 395);
    ctx.stroke();

    // Has successfully completed
    ctx.font = "28px Arial";
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillText("has successfully completed", canvas.width / 2, 450);

    // Course name
    ctx.font = "bold 42px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(courseName || "Course Name", canvas.width / 2, 520);

    // Date
    ctx.font = "24px Arial";
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillText(
      completionDate || new Date().toLocaleDateString(),
      canvas.width / 2,
      600
    );

    // Achievement badge
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 680, 40, 0, Math.PI * 2);
    ctx.fill();

    // Badge text
    ctx.fillStyle = "#8b5cf6";
    ctx.font = "bold 24px Arial";
    ctx.fillText("✓", canvas.width / 2, 695);

    // Convert to data URL
    if (onImageReady) {
      const dataUrl = canvas.toDataURL("image/png");
      onImageReady(dataUrl);
    }
  }, [courseName, recipientName, completionDate, onImageReady]);

  return (
    <Card className="p-4 bg-gradient-to-br from-card to-muted/30 border-2 border-primary/20 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <Award className="w-5 h-5 text-accent" />
        <h3 className="font-semibold">Certificate Preview</h3>
        <Sparkles className="w-4 h-4 text-accent" />
      </div>
      <div className="relative overflow-hidden rounded-lg shadow-xl">
        <canvas
          ref={canvasRef}
          className="w-full h-auto"
          style={{ maxHeight: "400px", objectFit: "contain" }}
        />
      </div>
    </Card>
  );
};
