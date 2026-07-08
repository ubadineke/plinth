"use client";

import { Component, type ReactNode } from "react";
import Image from "next/image";

export function BridgeFallback() {
  return (
    <Image
      src="/lagos-bridge.png"
      alt=""
      aria-hidden
      fill
      priority
      sizes="100vw"
      className="object-cover"
    />
  );
}

type Props = { children: ReactNode };
type State = { failed: boolean };

// react-three-fiber can throw during render if WebGL context creation fails
// or the GPU driver crashes mid-scene — a function component can't catch
// that, so this stays a class boundary. Falls back to a static bridge photo
// rather than leaving a black/broken canvas.
export class BridgeSceneBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("3D hero scene failed, falling back to a static image:", error);
  }

  render() {
    if (this.state.failed) return <BridgeFallback />;
    return this.props.children;
  }
}
