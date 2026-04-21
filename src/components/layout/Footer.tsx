export function Footer() {
  return (
    <footer
      className="h-7 shrink-0 border-t flex items-center justify-center px-4 gap-1.5 text-[11px]"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
        color: "var(--text-tertiary)",
      }}
    >
      <span>JSON Viewer · Free forever ·</span>
      <span>Built by</span>
      <a
        href="https://vishalchaubey.com"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium hover:underline"
        style={{ color: "var(--text-secondary)" }}
      >
        Vishal Chaubey
      </a>
    </footer>
  );
}
