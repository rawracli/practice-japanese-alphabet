/**
 * List of premium and standard Japanese fonts supported by the application.
 */
export const JAPANESE_FONTS = [
  {
    id: "noto-sans-jp",
    name: "Noto Sans Japanese",
    className: "font-noto-sans",
    description: "Modern, clean sans-serif (Default)",
    previewText: "あ"
  },
  {
    id: "noto-serif-jp",
    name: "Noto Serif / Han Serif",
    className: "font-noto-serif",
    description: "Elegant traditional brushed serif",
    previewText: "あ"
  },
  {
    id: "klee-one",
    name: "Klee One (Textbook)",
    className: "font-klee-one",
    description: "Handwritten brush strokes (Highly Recommended)",
    previewText: "あ"
  },
  {
    id: "kaisei",
    name: "Kaisei Tokumin",
    className: "font-kaisei",
    description: "Vintage retro calligraphic styling",
    previewText: "あ"
  },
  {
    id: "yu-gothic",
    name: "Yu Gothic",
    className: "font-yu-gothic",
    description: "Standard Windows/macOS sans-serif",
    previewText: "あ"
  },
  {
    id: "yu-mincho",
    name: "Yu Mincho",
    className: "font-yu-mincho",
    description: "Standard Windows/macOS serif",
    previewText: "あ"
  },
  {
    id: "hiragino",
    name: "Hiragino Sans",
    className: "font-hiragino",
    description: "Mac/iOS high-legibility sans-serif",
    previewText: "あ"
  }
];

/**
 * Returns the matching CSS class name for a given font ID.
 */
export function getFontClassName(fontId) {
  const font = JAPANESE_FONTS.find(f => f.id === fontId);
  return font ? font.className : "font-noto-sans";
}
