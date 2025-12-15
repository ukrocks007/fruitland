export type PublicUiConfig = {
  showStockOnProductPages: boolean;
};

export const DEFAULT_PUBLIC_UI_CONFIG: PublicUiConfig = {
  showStockOnProductPages: true,
};

export async function fetchPublicUiConfig(): Promise<PublicUiConfig> {
  try {
    const response = await fetch('/api/config/public');
    if (!response.ok) return DEFAULT_PUBLIC_UI_CONFIG;

    const data = (await response.json()) as Partial<PublicUiConfig>;

    return {
      showStockOnProductPages: data.showStockOnProductPages !== false,
    };
  } catch {
    return DEFAULT_PUBLIC_UI_CONFIG;
  }
}
