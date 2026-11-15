import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <div role="alert" className="flex h-full flex-col items-start gap-3 bg-background p-4 text-sm">
      <strong>Arcside hit an error</strong>
      <p className="text-xs break-words text-muted-foreground">{this.state.error.message}</p>
      <Button size="sm" onClick={() => location.reload()}>Reload</Button>
    </div>;
  }
}
