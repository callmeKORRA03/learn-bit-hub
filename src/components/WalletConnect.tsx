import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, LogOut, RefreshCw } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { requestAirdrop } from "@/lib/solana";
import { toast } from "sonner";
import { useState } from "react";

export const WalletConnect = () => {
  const {
    connected,
    publicKey,
    balance,
    connecting,
    connect,
    disconnect,
    refreshBalance,
  } = useWallet();
  const [requesting, setRequesting] = useState(false);

  const handleAirdrop = async () => {
    if (!publicKey) return;

    setRequesting(true);
    try {
      toast.loading("Requesting airdrop...", { id: "airdrop" });
      await requestAirdrop(publicKey);
      await refreshBalance();
      toast.success("Airdrop successful!", {
        id: "airdrop",
        description: "Received 1 SOL on devnet",
      });
    } catch (error: any) {
      toast.error("Airdrop failed", {
        id: "airdrop",
        description: error.message || "Please try again later",
      });
    } finally {
      setRequesting(false);
    }
  };

  if (!connected) {
    return (
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-muted/30">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <Wallet className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Connect Your Wallet
              </h3>
              <p className="text-sm text-muted-foreground">
                Connect your Phantom wallet to mint your certificate NFT
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-accent/30 bg-gradient-to-br from-card to-accent/5">
      <CardContent className="p-6">
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
            <Button
              onClick={disconnect}
              variant="outline"
              size="sm"
              className="hover:bg-destructive hover:text-destructive-foreground"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Balance (Devnet)</p>
              <p className="text-lg font-bold">{balance.toFixed(4)} SOL</p>
            </div>
            <Button
              onClick={handleAirdrop}
              disabled={requesting}
              size="sm"
              variant="outline"
              className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
            >
              {requesting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                "Request Airdrop"
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Using Solana Devnet • Testnet funds only
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
