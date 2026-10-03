export interface AssetManifest {
  cards: Record<string, string>;
  towers: Record<string, string>;
}

export const ASSET_MANIFEST: AssetManifest = {
  cards: {},
  towers: {},
};
