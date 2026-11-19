import { AssetLoader } from "./asset-loader";

/** One loading treatment for page, asset and action states. */
export function AppLoader({ inline = false, iconOnly = false, size, className = "" }: {
  inline?: boolean;
  iconOnly?: boolean;
  size?: number;
  className?: string;
}) {
  return <div className={`app-loader ${inline ? "app-loader-inline" : ""} ${className}`} role="status" aria-label="Memuat">
    <div aria-hidden="true"><AssetLoader size={size ?? (inline ? 18 : 28)} /></div>
    <span className={iconOnly ? "sr-only" : undefined}>Memuat</span>
  </div>;
}
