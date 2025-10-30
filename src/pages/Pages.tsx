import { useState, useEffect } from "react";
import { WalletConnect } from "@/components/WalletConnect";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useWallet } from "@/hooks/useWallet";
import { mintCertificateNFT } from "@/lib/mintNFT";
import {
  Award,
  ExternalLink,
  CheckCircle2,
  Loader2,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import bitEduLogo from "@/assets/bitedu-logo.png";

const Pages = () => {
  const { connected, provider } = useWallet();
  const [certificateImage, setCertificateImage] = useState<string>("");
  const [minting, setMinting] = useState(false);
  const [mintedNFT, setMintedNFT] = useState<{
    mintAddress: string;
    explorerUrl: string;
  } | null>(null);

  // Convert image to data URL on component mount
  useEffect(() => {
    const loadImage = async () => {
      try {
        const response = await fetch(bitEduLogo);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setCertificateImage(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error("Error loading image:", error);
        toast.error("Failed to load BitEdu logo");
      }
    };
    loadImage();
  }, []);

  const handleMint = async () => {
    if (!certificateImage) {
      toast.error("BitEdu logo not loaded yet. Please wait...");
      return;
    }

    setMinting(true);
    try {
      toast.loading("Minting BitEdu Certificate NFT...", { id: "minting" });

      const result = await mintCertificateNFT({
        wallet: provider,
        name: "BitEdu Certificate",
        description:
          "Official BitEdu educational certificate. Limited edition of 50. Issued on Solana blockchain.",
        imageDataUrl: certificateImage,
        attributes: [
          { trait_type: "Collection", value: "BitEdu Certificates" },
          { trait_type: "Max Supply", value: "50" },
          { trait_type: "Issue Date", value: new Date().toLocaleDateString() },
          { trait_type: "Type", value: "Educational Certificate" },
        ],
      });

      setMintedNFT({
        mintAddress: result.mintAddress,
        explorerUrl: result.explorerUrl,
      });

      toast.success("BitEdu Certificate NFT minted successfully!", {
        id: "minting",
        description: "Limited edition: 1 of 50",
      });
    } catch (error: any) {
      console.error("Minting error:", error);
      toast.error("Failed to mint NFT", {
        id: "minting",
        description: error.message || "Please try again",
      });
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary via-accent to-primary shadow-lg mb-4 animate-pulse">
            <Award className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            BitEdu Certificate NFT
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Mint your official BitEdu certificate as an NFT on Solana
            blockchain. Limited edition of 50.
          </p>
        </div>

        {/* Wallet Connection */}
        <div className="max-w-md mx-auto">
          <WalletConnect />
        </div>

        {/* Main Content */}
        {connected && !mintedNFT && (
          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-muted/20">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                  <img
                    src={bitEduLogo}
                    alt="BitEdu Logo"
                    className="w-64 h-auto mx-auto"
                  />
                </div>
                <CardTitle className="flex items-center gap-2 justify-center text-2xl">
                  <GraduationCap className="w-6 h-6 text-accent" />
                  Mint BitEdu Certificate
                </CardTitle>
                <CardDescription className="text-base">
                  Limited edition educational certificate NFT
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 p-6 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">NFT Name:</span>
                    <span className="text-sm">BitEdu Certificate</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Max Supply:</span>
                    <span className="text-sm font-bold text-accent">
                      50 NFTs
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Blockchain:</span>
                    <span className="text-sm">Solana (Devnet)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Estimated Cost:</span>
                    <span className="text-sm">~0.5 SOL + gas fees</span>
                  </div>
                </div>

                <Button
                  onClick={handleMint}
                  disabled={minting || !certificateImage}
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-lg py-6"
                  size="lg"
                >
                  {minting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Minting NFT...
                    </>
                  ) : (
                    <>
                      <Award className="w-5 h-5 mr-2" />
                      Mint Certificate NFT
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  This will create a real transaction on Solana devnet testnet
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Success State */}
        {mintedNFT && (
          <Card className="max-w-2xl mx-auto border-2 border-accent bg-gradient-to-br from-card to-accent/10">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-2">Congratulations!</h2>
                <p className="text-muted-foreground">
                  Your BitEdu Certificate NFT has been successfully minted (1 of
                  50)
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground">
                  NFT Mint Address
                </p>
                <p className="font-mono text-sm break-all">
                  {mintedNFT.mintAddress}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => window.open(mintedNFT.explorerUrl, "_blank")}
                  className="bg-gradient-to-r from-primary to-accent"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Explorer
                </Button>
                <Button onClick={() => setMintedNFT(null)} variant="outline">
                  Mint Another
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Cards */}
        {!connected && (
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mt-12">
            <Card className="text-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl">🎓</span>
              </div>
              <h3 className="font-semibold mb-2">Complete Course</h3>
              <p className="text-sm text-muted-foreground">
                Finish your course and pass the quiz
              </p>
            </Card>

            <Card className="text-center p-6 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-accent/10 flex items-center justify-center">
                <span className="text-2xl">👛</span>
              </div>
              <h3 className="font-semibold mb-2">Connect Wallet</h3>
              <p className="text-sm text-muted-foreground">
                Connect your Phantom wallet
              </p>
            </Card>

            <Card className="text-center p-6 bg-gradient-to-br from-primary/10 to-accent/5 border-accent/20">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <span className="text-2xl">🎖️</span>
              </div>
              <h3 className="font-semibold mb-2">Mint NFT</h3>
              <p className="text-sm text-muted-foreground">
                Mint your certificate as an NFT
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pages;
