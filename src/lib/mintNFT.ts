import { getMetaplex } from './solana';
import { PublicKey } from '@solana/web3.js';
import { toMetaplexFile } from '@metaplex-foundation/js';

export interface MintNFTParams {
  wallet: any;
  name: string;
  description: string;
  imageDataUrl: string;
  attributes?: Array<{ trait_type: string; value: string }>;
}

export interface MintResult {
  mintAddress: string;
  metadataUri: string;
  explorerUrl: string;
}

// Convert data URL to Uint8Array
const dataURLtoBuffer = (dataUrl: string): Uint8Array => {
  const arr = dataUrl.split(',');
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return u8arr;
};

export const mintCertificateNFT = async ({
  wallet,
  name,
  description,
  imageDataUrl,
  attributes = [],
}: MintNFTParams): Promise<MintResult> => {
  try {
    // Initialize Metaplex
    const metaplex = getMetaplex(wallet);

    // Convert image data URL to buffer
    const imageBuffer = dataURLtoBuffer(imageDataUrl);
    
    // Create MetaplexFile
    const metaplexFile = toMetaplexFile(imageBuffer, 'bitedu-certificate.png');
    
    // Upload image to storage
    console.log('Uploading image...');
    const imageUri = await metaplex.storage().upload(metaplexFile);
    console.log('Image uploaded:', imageUri);

    // Create metadata
    const metadata = {
      name,
      description,
      image: imageUri,
      attributes,
      properties: {
        category: 'image',
        files: [
          {
            uri: imageUri,
            type: 'image/png',
          },
        ],
      },
      symbol: 'CERT',
      seller_fee_basis_points: 0,
      external_url: '',
      collection: {
        name: 'Course Certificates',
        family: 'Certificates',
      },
    };

    // Upload metadata to Arweave via Bundlr
    console.log('Uploading metadata to Arweave...');
    const { uri: metadataUri } = await metaplex.nfts().uploadMetadata(metadata);
    console.log('Metadata uploaded:', metadataUri);

    // Create the NFT with limited supply
    console.log('Creating NFT with limited supply of 50...');
    const { nft } = await metaplex.nfts().create({
      uri: metadataUri,
      name,
      sellerFeeBasisPoints: 0,
      symbol: 'BITEDU',
      maxSupply: 50,
      creators: [
        {
          address: wallet.publicKey,
          share: 100,
        },
      ],
      isMutable: false,
    });

    console.log('NFT created successfully!');

    // Get explorer URL (devnet)
    const explorerUrl = `https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`;

    return {
      mintAddress: nft.address.toString(),
      metadataUri,
      explorerUrl,
    };
  } catch (error: any) {
    console.error('Error minting NFT:', error);
    throw new Error(error.message || 'Failed to mint NFT');
  }
};
