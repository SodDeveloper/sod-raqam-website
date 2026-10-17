"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Loader2, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

export type LightboxItem = { src: string; alt: string; caption: string };

type Transform = { scale: number; x: number; y: number };
type Gesture = Transform & { index: number };
type Point = { x: number; y: number };
type Drag = {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  time: number;
  moved: boolean;
};
type Pinch = {
  startDist: number;
  originX: number;
  originY: number;
  startScale: number;
};

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const BUTTON_ZOOM = 1.5;
const DOUBLE_TAP_SCALE = 2.5;
const SWIPE_X = 60;
const SWIPE_Y = 100;
const SWIPE_MS = 450;
const BASE: Transform = { scale: 1, x: 0, y: 0 };

function subscribe() {
  return () => {};
}
function clientSnapshot() {
  return true;
}
function serverSnapshot() {
  return false;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function wrap(index: number, delta: number, length: number) {
  return ((index + delta) % length + length) % length;
}

function readTransform(stored: Gesture, index: number): Transform {
  if (stored.index !== index) return BASE;
  return stored;
}

function stagePoint(stage: HTMLElement, clientX: number, clientY: number) {
  const rect = stage.getBoundingClientRect();
  return {
    rect,
    x: clientX - rect.left - rect.width / 2,
    y: clientY - rect.top - rect.height / 2,
  };
}

function clampTransform(next: Transform, stage: HTMLElement, img: HTMLElement | null): Transform {
  const scale = clamp(next.scale, MIN_SCALE, MAX_SCALE);
  const rect = stage.getBoundingClientRect();
  const imgW = img?.offsetWidth ?? 0;
  const imgH = img?.offsetHeight ?? 0;
  const maxX = Math.max(0, (imgW * scale - rect.width) / 2);
  const maxY = Math.max(0, (imgH * scale - rect.height) / 2);
  return {
    scale,
    x: clamp(next.x, -maxX, maxX),
    y: clamp(next.y, -maxY, maxY),
  };
}

function zoomToward(current: Transform, cx: number, cy: number, nextScale: number): Transform {
  const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
  const safe = current.scale || 1;
  const localX = (cx - current.x) / safe;
  const localY = (cy - current.y) / safe;
  return { scale, x: cx - localX * scale, y: cy - localY * scale };
}

function ControlButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-brand",
        className,
      )}
    >
      {children}
    </button>
  );
}

function LightboxSession({
  dialogRef,
  items,
  index,
  item,
  onClose,
  onIndexChange,
}: {
  dialogRef: RefObject<HTMLDivElement | null>;
  items: LightboxItem[];
  index: number;
  item: LightboxItem;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const t = useTranslations("lightbox");
  const rtl = useLocale() === "ar";
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const transformRef = useRef<Gesture>({ index: -1, ...BASE });
  const pointers = useRef<Map<number, Point>>(new Map());
  const dragRef = useRef<Drag | null>(null);
  const pinchRef = useRef<Pinch | null>(null);
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);
  const lastToggleRef = useRef(0);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  const transform = gesture !== null && gesture.index === index ? gesture : BASE;
  const loaded = loadedSrc === item.src;

  const markLoaded = useCallback((src: string) => {
    setLoadedSrc((current) => (current === src ? current : src));
  }, []);

  // Cached images can be complete before onLoad is attached, which leaves the spinner up.
  const onImgRef = useCallback((node: HTMLImageElement | null) => {
    imgRef.current = node;
    if (!node || node.getAttribute("src") !== item.src || !node.complete) return;
    markLoaded(item.src);
  }, [item.src, markLoaded]);

  const commit = useCallback(
    (next: Transform) => {
      const stage = stageRef.current;
      const clamped = stage ? clampTransform(next, stage, imgRef.current) : { ...next, scale: clamp(next.scale, MIN_SCALE, MAX_SCALE) };
      const prev = transformRef.current;
      if (prev.index === index && prev.scale === clamped.scale && prev.x === clamped.x && prev.y === clamped.y) return;
      const stored: Gesture = { index, ...clamped };
      transformRef.current = stored;
      setGesture(stored);
    },
    [index],
  );

  const zoomAt = useCallback(
    (clientX: number, clientY: number, nextScale: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const point = stagePoint(stage, clientX, clientY);
      const current = readTransform(transformRef.current, index);
      commit(zoomToward(current, point.x, point.y, nextScale));
    },
    [commit, index],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const current = readTransform(transformRef.current, index);
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, current.scale * factor);
    },
    [index, zoomAt],
  );

  const reset = useCallback(() => commit(BASE), [commit]);

  const step = useCallback(
    (delta: number) => {
      if (items.length === 0) return;
      onIndexChange(wrap(index, delta, items.length));
    },
    [index, items.length, onIndexChange],
  );

  const toggleAt = useCallback(
    (clientX: number, clientY: number) => {
      const now = performance.now();
      if (now - lastToggleRef.current < 350) return;
      lastToggleRef.current = now;
      const current = readTransform(transformRef.current, index);
      if (current.scale > 1.02) reset();
      else zoomAt(clientX, clientY, DOUBLE_TAP_SCALE);
    },
    [index, reset, zoomAt],
  );

  useEffect(() => {
    const previous = document.activeElement;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPosition = body.style.position;
    const prevTop = body.style.top;
    const prevLeft = body.style.left;
    const prevRight = body.style.right;
    const prevWidth = body.style.width;
    const scrollY = window.scrollY;
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    dialogRef.current?.focus();
    return () => {
      body.style.overflow = prevOverflow;
      body.style.position = prevPosition;
      body.style.top = prevTop;
      body.style.left = prevLeft;
      body.style.right = prevRight;
      body.style.width = prevWidth;
      window.scrollTo(0, scrollY);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [dialogRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const root = dialogRef.current;
      if (e.key === "Tab") {
        if (!root) return;
        const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
        if (buttons.length === 0) {
          e.preventDefault();
          root.focus();
          return;
        }
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        const active = document.activeElement;
        const inside = active instanceof Node && root.contains(active);
        if (!inside) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        } else if (e.shiftKey && (active === first || active === root)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        step(rtl ? -1 : 1);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(rtl ? 1 : -1);
        return;
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomBy(BUTTON_ZOOM);
        return;
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomBy(1 / BUTTON_ZOOM);
        return;
      }
      if (e.key === "0") {
        e.preventDefault();
        reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogRef, onClose, reset, rtl, step, zoomBy]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const current = readTransform(transformRef.current, index);
      const pixelDelta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * stage.clientHeight : e.deltaY;
      zoomAt(e.clientX, e.clientY, current.scale * Math.exp(-pixelDelta * 0.0025));
    };
    const blockTouch = (e: TouchEvent) => e.preventDefault();
    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("touchmove", blockTouch, { passive: false });
    return () => {
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("touchmove", blockTouch);
    };
  }, [index, zoomAt]);

  useEffect(() => {
    const len = items.length;
    if (len < 2) return;
    const ahead = new Image();
    ahead.src = items[wrap(index, 1, len)].src;
    const behind = new Image();
    behind.src = items[wrap(index, -1, len)].src;
  }, [index, items]);

  useEffect(() => {
    pointers.current.clear();
    dragRef.current = null;
    pinchRef.current = null;
  }, [index]);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Pointer can end before capture is attached.
    }
    if (pointers.current.size >= 2) {
      const pts = Array.from(pointers.current.values());
      const stage = stageRef.current;
      const current = readTransform(transformRef.current, index);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const point = stage ? stagePoint(stage, mid.x, mid.y) : { rect: new DOMRect(), x: 0, y: 0 };
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchRef.current = {
        startDist: Math.max(dist, 1),
        startScale: current.scale,
        originX: (point.x - current.x) / (current.scale || 1),
        originY: (point.y - current.y) / (current.scale || 1),
      };
      dragRef.current = null;
      return;
    }
    const current = readTransform(transformRef.current, index);
    dragRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      tx: current.x,
      ty: current.y,
      time: performance.now(),
      moved: false,
    };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pinch = pinchRef.current;
    const stage = stageRef.current;
    if (pinch && pointers.current.size >= 2 && stage) {
      const pts = Array.from(pointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const point = stagePoint(stage, mid.x, mid.y);
      const scale = clamp(pinch.startScale * (dist / pinch.startDist), MIN_SCALE, MAX_SCALE);
      commit({ scale, x: point.x - pinch.originX * scale, y: point.y - pinch.originY * scale });
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) > 8) drag.moved = true;
    const current = readTransform(transformRef.current, index);
    if (current.scale > 1) commit({ scale: current.scale, x: drag.tx + dx, y: drag.ty + dy });
  }

  function finishPointer(e: ReactPointerEvent<HTMLDivElement>, allowSwipe: boolean) {
    const drag = dragRef.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchRef.current = null;
    if (drag && drag.id === e.pointerId) {
      dragRef.current = null;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      const dt = performance.now() - drag.time;
      const scale = readTransform(transformRef.current, index).scale;
      if (allowSwipe && scale <= 1.02 && dt <= SWIPE_MS) {
        // Pull toward the start edge to advance: left in LTR, right in RTL.
        if (Math.abs(dx) > SWIPE_X && Math.abs(dx) > Math.abs(dy)) {
          const forward = rtl ? dx > 0 : dx < 0;
          step(forward ? 1 : -1);
          return;
        }
        if (dy > SWIPE_Y && dy > Math.abs(dx)) {
          onClose();
          return;
        }
      }
      if (allowSwipe && e.pointerType !== "mouse" && !drag.moved && dt < 300) {
        const now = performance.now();
        const last = lastTapRef.current;
        if (last && now - last.t < 300 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 28) {
          lastTapRef.current = null;
          toggleAt(e.clientX, e.clientY);
        } else {
          lastTapRef.current = { t: now, x: e.clientX, y: e.clientY };
        }
      }
    }
    if (pointers.current.size === 1) {
      const entry = Array.from(pointers.current.entries())[0];
      if (entry) {
        const [id, pos] = entry;
        const current = readTransform(transformRef.current, index);
        dragRef.current = {
          id,
          x: pos.x,
          y: pos.y,
          tx: current.x,
          ty: current.y,
          time: performance.now(),
          moved: true,
        };
      }
    }
  }

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <p dir="ltr" className="text-sm font-medium tabular-nums text-white/90" aria-live="polite">
          {t("counter", { current: index + 1, total: items.length })}
        </p>
        <div className="flex items-center">
          <ControlButton label={t("zoomOut")} onClick={() => zoomBy(1 / BUTTON_ZOOM)}>
            <ZoomOut className="h-5 w-5" aria-hidden="true" />
          </ControlButton>
          <span className="w-12 text-center text-xs tabular-nums text-white/80">{Math.round(transform.scale * 100)}%</span>
          <ControlButton label={t("zoomIn")} onClick={() => zoomBy(BUTTON_ZOOM)}>
            <ZoomIn className="h-5 w-5" aria-hidden="true" />
          </ControlButton>
          <ControlButton label={t("reset")} onClick={reset}>
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
          </ControlButton>
          <ControlButton label={t("close")} onClick={onClose} className="ms-1">
            <X className="h-5 w-5" aria-hidden="true" />
          </ControlButton>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={stageRef}
          className={cn(
            "absolute inset-0 grid place-items-center overflow-hidden touch-none",
            transform.scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => finishPointer(e, true)}
          onPointerCancel={(e) => finishPointer(e, false)}
          onDoubleClick={(e) => {
            e.preventDefault();
            toggleAt(e.clientX, e.clientY);
          }}
        >
          {!loaded && (
            <Loader2 className="pointer-events-none absolute h-10 w-10 animate-spin text-white/80" aria-hidden="true" />
          )}
          {/* Plain img so pan/zoom can transform the bitmap directly. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={onImgRef}
            src={item.src}
            alt={item.alt}
            width={2071}
            height={1362}
            draggable={false}
            decoding="async"
            onLoad={() => markLoaded(item.src)}
            onError={() => markLoaded(item.src)}
            onDragStart={(e) => e.preventDefault()}
            className={cn(
              "max-h-full max-w-full min-h-0 min-w-0 object-contain select-none",
              loaded ? "opacity-100" : "opacity-0",
            )}
            style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
          />
        </div>
        <ControlButton
          label={t("prev")}
          onClick={() => step(-1)}
          className="absolute top-1/2 start-3 z-10 -translate-y-1/2 bg-midnight/75 shadow-lg hover:bg-midnight"
        >
          <ChevronLeft className="h-6 w-6 rtl:rotate-180" aria-hidden="true" />
        </ControlButton>
        <ControlButton
          label={t("next")}
          onClick={() => step(1)}
          className="absolute top-1/2 end-3 z-10 -translate-y-1/2 bg-midnight/75 shadow-lg hover:bg-midnight"
        >
          <ChevronRight className="h-6 w-6 rtl:rotate-180" aria-hidden="true" />
        </ControlButton>
      </div>

      <div className="shrink-0 px-4 pt-3 text-center">
        <p className="text-sm font-medium text-white/90 sm:text-base">{item.caption}</p>
        <p className="mt-1 hidden text-xs text-white/50 sm:block">{t("hint")}</p>
      </div>
    </>
  );
}

export function Lightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: LightboxItem[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const dialogRef = useRef<HTMLDivElement>(null);
  const item = index !== null ? items[index] : undefined;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {item && index !== null ? (
        <motion.div
          key="lightbox"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={item.caption}
          tabIndex={-1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex flex-col bg-midnight/95 text-white outline-none select-none pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))]"
        >
          <LightboxSession
            dialogRef={dialogRef}
            items={items}
            index={index}
            item={item}
            onClose={onClose}
            onIndexChange={onIndexChange}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
