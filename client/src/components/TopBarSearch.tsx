/**
 * Top Bar inline search — opens the GlobalMenuSearch dialog on click/focus.
 * This is intentionally a dumb "trigger" component with zero state,
 * so it can never cause re-render / focus-stealing issues.
 */
import { useEffect, useRef } from "react";
import { Search } from "lucide-react";

function TopBarSearchInner() {
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+K or Cmd+K → open the global search dialog
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        // Dispatch a custom event that GlobalMenuSearch listens to
        window.dispatchEvent(new CustomEvent("open-global-search"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("open-global-search"));
  };

  return (
    <div className="relative w-80">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <button
          type="button"
          ref={inputRef as any}
          onClick={handleClick}
          className="pl-8 pr-16 h-8 w-full rounded-md border border-transparent bg-muted/50 text-sm text-muted-foreground text-left outline-none hover:border-border hover:bg-background transition-colors cursor-text"
        >
          搜索菜单页面...
        </button>
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] text-muted-foreground pointer-events-none">
          ⌘K
        </kbd>
      </div>
    </div>
  );
}

export const TopBarSearch = TopBarSearchInner;
export default TopBarSearch;
