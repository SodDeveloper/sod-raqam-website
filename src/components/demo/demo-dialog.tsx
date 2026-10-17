"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  PlayCircle,
  X,
} from "lucide-react";
import { buttonVariants, type ButtonProps } from "@/components/ui/button";
import { LEAD_ENDPOINT, RAQAM_APP_URL, type Locale } from "@/lib/site";
import { cn } from "@/lib/utils";

const FIELD_CLASS =
  "w-full rounded-xl border border-indigo-brand/15 bg-white px-4 py-3 text-sm text-midnight placeholder:text-midnight/40 focus:border-violet-brand focus:outline-none focus:ring-2 focus:ring-violet-brand/25";

const PHONE_RE = /^\+?[0-9][0-9 ()\-]{6,19}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;
const LEAD_STORAGE_KEY = "sodraqam-demo-lead";
const PRODUCT = "SOD Raqam";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type LeadDraft = { name: string; phone: string; email: string };
type DemoCreds = { url: string; username: string; password: string };
type Step = "form" | "thanks" | "success";
type FieldName = keyof LeadDraft;
type FieldErrors = Partial<Record<FieldName, string>>;
type CopiedField = "username" | "password";
type DemoContextValue = { openDemo: () => void };

const EMPTY_LEAD: LeadDraft = { name: "", phone: "", email: "" };

const DemoContext = createContext<DemoContextValue | null>(null);

function readStoredLead(): LeadDraft {
  try {
    const raw = localStorage.getItem(LEAD_STORAGE_KEY);
    if (!raw) return EMPTY_LEAD;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY_LEAD;
    const record = parsed as Record<string, unknown>;
    return {
      name: typeof record.name === "string" ? record.name : "",
      phone: typeof record.phone === "string" ? record.phone : "",
      email: typeof record.email === "string" ? record.email : "",
    };
  } catch {
    return EMPTY_LEAD;
  }
}

function rememberLead(draft: LeadDraft) {
  try {
    localStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Private mode or a full quota should not block the success step.
  }
}

function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => {
    if (element.tabIndex < 0) return false;
    if (element.closest("[aria-hidden='true']")) return false;
    return element.getClientRects().length > 0;
  });
}

async function writeClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the textarea fallback.
  }
  try {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.focus();
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

function readDemo(value: unknown): DemoCreds | null {
  if (!value || typeof value !== "object" || !("demo" in value)) return null;
  const demo = (value as { demo?: unknown }).demo;
  if (!demo || typeof demo !== "object") return null;
  const record = demo as Record<string, unknown>;
  if (typeof record.username !== "string" || typeof record.password !== "string") return null;
  return {
    url: typeof record.url === "string" ? record.url : "",
    username: record.username,
    password: record.password,
  };
}

function toLeadLocale(value: string): Locale {
  return value === "ar" ? "ar" : "en";
}

export function useDemo(): DemoContextValue {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used within DemoProvider");
  return context;
}

type DemoButtonProps = Pick<ButtonProps, "variant" | "size" | "className" | "children">;

export function DemoButton({ variant, size, className, children }: DemoButtonProps) {
  const { openDemo } = useDemo();
  return (
    <button type="button" className={cn(buttonVariants({ variant, size }), className)} onClick={openDemo}>
      {children}
    </button>
  );
}

export function DemoLink({ className, children }: { className?: string; children: ReactNode }) {
  const { openDemo } = useDemo();
  return (
    <button type="button" className={className} onClick={openDemo}>
      {children}
    </button>
  );
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [creds, setCreds] = useState<DemoCreds | null>(null);
  const [formKey, setFormKey] = useState(0);
  const credsRef = useRef<DemoCreds | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(false);

  const close = useCallback(() => {
    openRef.current = false;
    setOpen(false);
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener && document.contains(opener)) {
      window.requestAnimationFrame(() => opener.focus());
    }
  }, []);

  const openDemo = useCallback(() => {
    const active = document.activeElement;
    openerRef.current = active instanceof HTMLElement ? active : null;
    if (credsRef.current) {
      setStep("success");
    } else if (!openRef.current) {
      setStep("form");
      setFormKey((key) => key + 1);
    }
    openRef.current = true;
    setOpen(true);
  }, []);

  const handleSuccess = useCallback((next: DemoCreds, draft: LeadDraft) => {
    credsRef.current = next;
    rememberLead(draft);
    setCreds(next);
    setStep("success");
  }, []);

  const handleThanks = useCallback(() => setStep("thanks"), []);

  const value = useMemo(() => ({ openDemo }), [openDemo]);

  return (
    <DemoContext.Provider value={value}>
      {children}
      <DemoPortal>
        <DemoDialog
          open={open}
          step={step}
          creds={creds}
          formKey={formKey}
          onClose={close}
          onSuccess={handleSuccess}
          onThanks={handleThanks}
        />
      </DemoPortal>
    </DemoContext.Provider>
  );
}

function subscribeToNothing() {
  return () => {};
}

function clientMounted() {
  return true;
}

function serverMounted() {
  return false;
}

function DemoPortal({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribeToNothing, clientMounted, serverMounted);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

function DemoDialog({
  open,
  step,
  creds,
  formKey,
  onClose,
  onSuccess,
  onThanks,
}: {
  open: boolean;
  step: Step;
  creds: DemoCreds | null;
  formKey: number;
  onClose: () => void;
  onSuccess: (creds: DemoCreds, draft: LeadDraft) => void;
  onThanks: () => void;
}) {
  const t = useTranslations("demo");
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = focusableElements(panel);
      if (items.length === 0) return;
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey) {
        if (index <= 0) {
          event.preventDefault();
          items[items.length - 1].focus();
        }
      } else if (index === -1 || index === items.length - 1) {
        event.preventDefault();
        items[0].focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      if (step === "form") {
        panel.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
        return;
      }
      panel.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, step]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="demo-overlay"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-midnight/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl bg-white p-6 card-shadow outline-none sm:p-8"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close")}
              className="absolute top-4 end-4 flex h-9 w-9 items-center justify-center rounded-full text-midnight/50 transition-colors hover:bg-lavender hover:text-midnight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-brand/60"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>

            {step === "success" && creds ? (
              <SuccessStep titleId={titleId} creds={creds} onClose={onClose} />
            ) : step === "thanks" ? (
              <ThanksStep titleId={titleId} onClose={onClose} />
            ) : (
              <DemoForm key={formKey} titleId={titleId} onSuccess={onSuccess} onThanks={onThanks} />
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function DemoForm({
  titleId,
  onSuccess,
  onThanks,
}: {
  titleId: string;
  onSuccess: (creds: DemoCreds, draft: LeadDraft) => void;
  onThanks: () => void;
}) {
  const t = useTranslations("demo");
  const locale = toLeadLocale(useLocale());
  const nameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const nameErrId = useId();
  const phoneErrId = useId();
  const emailErrId = useId();
  const [fields, setFields] = useState<LeadDraft>(readStoredLead);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  function updateField(name: FieldName, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setServerError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft: LeadDraft = {
      name: fields.name.trim(),
      phone: fields.phone.trim(),
      email: fields.email.trim(),
    };
    const nextErrors: FieldErrors = {};
    if (draft.name.length < 2) nextErrors.name = t("errName");
    if (!PHONE_RE.test(draft.phone)) nextErrors.phone = t("errPhone");
    if (!EMAIL_RE.test(draft.email)) nextErrors.email = t("errEmail");
    setErrors(nextErrors);
    const firstInvalid = (Object.keys(nextErrors) as FieldName[]).find((key) => nextErrors[key]);
    if (firstInvalid) {
      event.currentTarget.querySelector<HTMLInputElement>(`input[name="${firstInvalid}"]`)?.focus();
      return;
    }

    setSending(true);
    setServerError(null);
    try {
      const response = await fetch(LEAD_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          type: "demo",
          product: PRODUCT,
          name: draft.name,
          phone: draft.phone,
          email: draft.email,
          website,
          locale,
        }),
      });
      if (response.status === 429) {
        if (activeRef.current) setServerError(t("errRate"));
        return;
      }
      if (!response.ok) {
        if (activeRef.current) setServerError(t("errGeneric"));
        return;
      }
      const demo = readDemo(await readJson(response));
      if (demo) onSuccess(demo, draft);
      else if (activeRef.current) onThanks();
    } catch {
      if (activeRef.current) setServerError(t("errGeneric"));
    } finally {
      if (activeRef.current) setSending(false);
    }
  }

  return (
    <>
      <div className="flex items-start gap-3 pe-10">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl brand-gradient text-white"
        >
          <PlayCircle className="h-5 w-5" />
        </span>
        <div>
          <h2 id={titleId} className="text-xl font-bold text-midnight">
            {t("title")}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-midnight/65">{t("subtitle")}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <div aria-hidden="true" tabIndex={-1} className="sr-only">
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor={nameId} className="mb-1.5 block text-sm font-medium text-midnight">
            {t("name")}
          </label>
          <input
            id={nameId}
            name="name"
            value={fields.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder={t("namePh")}
            autoComplete="name"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? nameErrId : undefined}
            className={FIELD_CLASS}
          />
          {errors.name ? (
            <p id={nameErrId} className="mt-1.5 text-xs text-red-600">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={phoneId} className="mb-1.5 block text-sm font-medium text-midnight">
            {t("phone")}
          </label>
          <input
            id={phoneId}
            name="phone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            value={fields.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="+974 5555 1234"
            autoComplete="tel"
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? phoneErrId : undefined}
            className={FIELD_CLASS}
          />
          {errors.phone ? (
            <p id={phoneErrId} className="mt-1.5 text-xs text-red-600">
              {errors.phone}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={emailId} className="mb-1.5 block text-sm font-medium text-midnight">
            {t("email")}
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            inputMode="email"
            dir="ltr"
            value={fields.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder={t("emailPh")}
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? emailErrId : undefined}
            className={FIELD_CLASS}
          />
          {errors.email ? (
            <p id={emailErrId} className="mt-1.5 text-xs text-red-600">
              {errors.email}
            </p>
          ) : null}
        </div>

        {serverError ? (
          <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{serverError}</span>
          </div>
        ) : null}

        <button type="submit" disabled={sending} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          {sending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              {t("submitting")}
            </>
          ) : (
            t("submit")
          )}
        </button>
        <p className="text-center text-xs text-midnight/50">{t("note")}</p>
      </form>
    </>
  );
}

function ThanksStep({ titleId, onClose }: { titleId: string; onClose: () => void }) {
  const t = useTranslations("demo");
  return (
    <div className="px-8 py-4 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" aria-hidden />
      <h2 id={titleId} className="mt-4 text-xl font-bold text-midnight">
        {t("thanksTitle")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-midnight/65">{t("thanksBody")}</p>
      <button type="button" onClick={onClose} className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full")}>
        {t("close")}
      </button>
    </div>
  );
}

function SuccessStep({
  titleId,
  creds,
  onClose,
}: {
  titleId: string;
  creds: DemoCreds;
  onClose: () => void;
}) {
  const t = useTranslations("demo");
  const [copied, setCopied] = useState<CopiedField | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  async function copyValue(value: string, field: CopiedField, button: HTMLButtonElement) {
    const ok = await writeClipboard(value);
    button.focus();
    if (!ok) return;
    setCopied(field);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setCopied((current) => (current === field ? null : current));
    }, 1500);
  }

  return (
    <div>
      <div className="px-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" aria-hidden />
        <h2 id={titleId} className="mt-4 text-xl font-bold text-midnight">
          {t("successTitle")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-midnight/65">{t("successBody")}</p>
      </div>

      <div className="mt-5 space-y-3 rounded-2xl bg-lavender p-4">
        <CredentialRow
          label={t("username")}
          value={creds.username}
          copied={copied === "username"}
          copyLabel={t("copy")}
          copiedLabel={t("copied")}
          onCopy={(button) => void copyValue(creds.username, "username", button)}
        />
        <CredentialRow
          label={t("password")}
          value={creds.password}
          copied={copied === "password"}
          copyLabel={t("copy")}
          copiedLabel={t("copied")}
          onCopy={(button) => void copyValue(creds.password, "password", button)}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <a
          href={creds.url || RAQAM_APP_URL}
          target="_blank"
          rel="noopener"
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          {t("openApp")}
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
        <button
          type="button"
          onClick={onClose}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
        >
          {t("close")}
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-midnight/50">{t("demoNote")}</p>
    </div>
  );
}

function CredentialRow({
  label,
  value,
  copied,
  copyLabel,
  copiedLabel,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  copyLabel: string;
  copiedLabel: string;
  onCopy: (button: HTMLButtonElement) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-midnight/50">{label}</p>
        <code dir="ltr" data-cred="" className="mt-0.5 block font-semibold break-all text-midnight">
          {value}
        </code>
      </div>
      <button
        type="button"
        onClick={(event) => onCopy(event.currentTarget)}
        aria-label={copied ? copiedLabel : copyLabel}
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-indigo-brand hover:bg-white"
      >
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {copied ? <span>{copiedLabel}</span> : null}
      </button>
    </div>
  );
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
