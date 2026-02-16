export function TenantFooter() {
  return (
    <footer className="border-t border-border-glass py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-xs text-text-muted">
          Potenciado por{" "}
          <a
            href="https://redbot.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-blue hover:text-accent-blue/80 transition-colors"
          >
            Redbot
          </a>
          {" "}— Tu agente inmobiliario AI
        </p>
      </div>
    </footer>
  );
}
