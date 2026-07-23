"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  RemoveFormatting,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link2,
  Minus,
  Palette,
  Quote,
  Code,
} from "lucide-react";

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColors, setShowColors] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Predefined beautiful text colors matching the UI
  const colors = [
    { label: "Default", value: "inherit" },
    { label: "Red", value: "#ef4444" },
    { label: "Orange", value: "#f97316" },
    { label: "Green", value: "#10b981" },
    { label: "Blue", value: "#3b82f6" },
    { label: "Violet", value: "#8b5cf6" },
    { label: "Gray", value: "#6b7280" },
  ];

  // Sync value to editor once on mount
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, []);

  // Handle click outside color picker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColors(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, arg: string = "") => {
    document.execCommand(command, false, arg);
    handleInput();
  };

  const handleBlockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      execCommand("formatBlock", value);
      // Reset select
      e.target.value = "";
    }
  };

  const insertLink = () => {
    const url = prompt("Enter the URL:", "https://");
    if (url) {
      execCommand("createLink", url);
    } else if (url === "") {
      execCommand("unlink");
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-1.5 select-none">
        
        {/* Undo / Redo */}
        <button
          type="button"
          onClick={() => execCommand("undo")}
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          title="Undo"
        >
          <Undo2 className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("redo")}
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          title="Redo"
        >
          <Redo2 className="size-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Text Style Dropdown */}
        <select
          onChange={handleBlockChange}
          defaultValue=""
          className="h-7 text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2 py-0 focus:outline-none text-zinc-700 dark:text-zinc-300 max-w-[110px]"
          title="Text Block Style"
        >
          <option value="" disabled>Style...</option>
          <option value="p">Paragraph</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="blockquote">Quote block</option>
          <option value="pre">Code block</option>
        </select>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Basic formatting */}
        <button
          type="button"
          onClick={() => execCommand("bold")}
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors font-bold"
          title="Bold"
        >
          <Bold className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("italic")}
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          title="Italic"
        >
          <Italic className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("underline")}
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          title="Underline"
        >
          <Underline className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("strikeThrough")}
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          title="Strikethrough"
        >
          <Strikethrough className="size-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Color picker */}
        <div className="relative" ref={colorPickerRef}>
          <button
            type="button"
            onClick={() => setShowColors(!showColors)}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1"
            title="Text Color"
          >
            <Palette className="size-3.5" />
          </button>
          {showColors && (
            <div className="absolute left-0 mt-1 z-50 p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-md grid grid-cols-4 gap-1.5 min-w-[120px]">
              {colors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    execCommand("foreColor", c.value);
                    setShowColors(false);
                  }}
                  className="size-5 rounded-full border border-zinc-300 dark:border-zinc-700 relative hover:scale-110 transition-transform cursor-pointer"
                  style={{ backgroundColor: c.value === "inherit" ? "#000000" : c.value }}
                  title={c.label}
                >
                  {c.value === "inherit" && (
                    <div className="absolute inset-0 flex items-center justify-center text-[8px] text-white font-bold">D</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Alignment */}
        <button
          type="button"
          onClick={() => execCommand("justifyLeft")}
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          title="Align Left"
        >
          <AlignLeft className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("justifyCenter")}
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          title="Align Center"
        >
          <AlignCenter className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("justifyRight")}
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          title="Align Right"
        >
          <AlignRight className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("justifyFull")}
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          title="Justify"
        >
          <AlignJustify className="size-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => execCommand("insertUnorderedList")}
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          title="Unordered List"
        >
          <List className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("insertOrderedList")}
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          title="Ordered List"
        >
          <ListOrdered className="size-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Inserts */}
        <button
          type="button"
          onClick={insertLink}
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          title="Insert Link"
        >
          <Link2 className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("insertHorizontalRule")}
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          title="Insert Divider (HR)"
        >
          <Minus className="size-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Clean up */}
        <button
          type="button"
          onClick={() => execCommand("removeFormat")}
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-750 dark:text-zinc-250 transition-colors"
          title="Clear Formatting"
        >
          <RemoveFormatting className="size-3.5" />
        </button>
      </div>

      {/* Editor Content Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="p-3 min-h-[160px] focus:outline-none text-xs leading-relaxed max-w-none text-zinc-800 dark:text-zinc-200 rules-rich-editor"
        placeholder={placeholder}
      />
    </div>
  );
}
