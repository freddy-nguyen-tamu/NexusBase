"use client";

import { useEffect, useRef, useState } from "react";

export function FlipNumber({ value }: { value: string }) {
  const [state, setState] = useState<"show" | "exit" | "enter">("show");
  const [oldVal, setOldVal] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (value !== prev.current) {
      setOldVal(prev.current);
      setState("exit");
      const t1 = setTimeout(() => setState("enter"), 200);
      const t2 = setTimeout(() => {
        setState("show");
        prev.current = value;
      }, 500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [value]);

  if (state === "show") {
    return <span>{value}</span>;
  }

  return (
    <span className="grid grid-cols-1" style={{ perspective: "200px" }}>
      <style>{`
        @keyframes flip-exit {
          0%   { transform: rotateX(0deg); opacity: 1; }
          100% { transform: rotateX(-90deg); opacity: 0; }
        }
        @keyframes flip-enter {
          0%   { transform: rotateX(90deg); opacity: 0; }
          100% { transform: rotateX(0deg); opacity: 1; }
        }
      `}</style>
      <span
        className="col-start-1 row-start-1"
        style={{
          animation: "flip-exit 0.2s ease-in forwards",
          transformOrigin: "bottom center",
        }}
      >
        {oldVal}
      </span>
      <span
        className="col-start-1 row-start-1"
        style={{
          animation: "flip-enter 0.3s ease-out 0.2s forwards",
          transformOrigin: "top center",
        }}
      >
        {value}
      </span>
      <span className="col-start-1 row-start-1 invisible">{value}</span>
    </span>
  );
}
