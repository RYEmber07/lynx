export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border border-outline animate-spin flex items-center justify-center shrink-0">
        <div className="w-2 h-2 bg-primary" />
      </div>
    </div>
  );
}
