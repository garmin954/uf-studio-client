export default function Splash() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background uf-font-regular text-foreground select-none">
      <div className="text-2xl font-semibold">UFACTORY Studio</div>
      <div className="mt-4 text-sm text-muted-foreground">正在启动，请稍候…</div>
    </div>
  );
}

