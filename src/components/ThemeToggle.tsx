import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme, type Theme } from "./ThemeProvider";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export default function ThemeToggle() {
  const { theme, resolved, setTheme } = useTheme();
  const Icon = resolved === "dark" ? Moon : Sun;

  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Toggle theme"
          className="p-2 rounded-xl bg-surface/80 border border-border text-text-s hover:text-foreground hover:border-accent/40 transition"
        >
          <Icon size={16} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-40 p-1 bg-surface/95 backdrop-blur-xl border border-border rounded-xl shadow-xl z-50"
      >
        {options.map(({ value, label, icon: I }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition ${
              theme === value
                ? "bg-accent/10 text-accent"
                : "text-text-s hover:text-foreground hover:bg-surface"
            }`}
          >
            <I size={14} />
            {label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
