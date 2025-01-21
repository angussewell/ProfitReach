import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SearchableSelectProps {
  options: string[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  emptyMessage = "No results found."
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    return options.filter(option => 
      option.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="w-full border rounded-md bg-popover">
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-2 py-1 border-b bg-transparent focus:outline-none"
              autoComplete="off"
            />
            <div className="max-h-60 overflow-auto">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm">{emptyMessage}</div>
              ) : (
                filteredOptions.map(option => (
                  <div
                    key={option}
                    onClick={() => {
                      onChange(option);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "flex items-center px-2 py-1.5 cursor-pointer hover:bg-accent",
                      value === option && "bg-accent"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option}
                  </div>
                ))
              )}
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
} 