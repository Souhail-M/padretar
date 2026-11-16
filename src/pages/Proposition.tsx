import { useEffect, useRef, useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowUpRight, RotateCcw, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import "./proposition.css";

/**
 * The proposal page is public: it is read by a shop owner before there is an
 * account, so it deliberately does not touch Convex or the session.
 *
 * Its imagery is the product itself. Every dark panel below marked data-ui is
 * a true-size fragment of Padretar, written with the app's own figures and
 * vocabulary — the same presence board, kiosk code, Telegram announcement and
 * Excel export the responsable sees after signing in.
 */

const CONTACT_EMAIL = "bonjour@padretar.fr";
const CONTACT_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  "Mise en service Padretar",
)}&body=${encodeURIComponent(
  "Bonjour,\n\nNous tenons une boutique et souhaitons mettre Padretar en service.\n\nNombre d'employés :\nAdresse de la boutique :\n\nMerci,",
)}`;

const NAV = [
  { href: "#application", label: "L'application" },
  { href: "#abonnement", label: "L'abonnement" },
  { href: "#questions", label: "Questions" },
];

const KIOSK_CODES = ["K7M2QP", "R4T9XD", "B8N3VK"];

type Person = {
  nom: string;
  poste: string;
  state: "in" | "out";
  since: string;
  detail: string;
};

const PEOPLE: Person[] = [
  { nom: "Yasmine", poste: "Vendeuse", state: "in", since: "09:02", detail: "5 h 30 sur place" },
  { nom: "Karim", poste: "Vendeur", state: "in", since: "09:15", detail: "5 h 17 sur place" },
  { nom: "Sofia", poste: "Vendeuse", state: "out", since: "12:40", detail: "sortie à 12:40" },
];

type TgMessage = {
  type: "in" | "out";
  who: string;
  time: string;
  count: number;
  people: { nom: string; since: string }[];
};

const TG_MESSAGES: TgMessage[] = [
  {
    type: "in",
    who: "Karim",
    time: "09:15",
    count: 2,
    people: [
      { nom: "Yasmine", since: "09:02" },
      { nom: "Karim", since: "09:15" },
    ],
  },
  {
    type: "out",
    who: "Sofia",
    time: "12:40",
    count: 2,
    people: [
      { nom: "Yasmine", since: "09:02" },
      { nom: "Karim", since: "09:15" },
    ],
  },
];

const INCLUDED = [
  { label: "Employés", value: "Illimités" },
  { label: "Pointages", value: "Illimités" },
  { label: "Historique", value: "Illimité, sans purge" },
  { label: "Export Excel", value: "Toutes les périodes" },
  { label: "Annonces Telegram", value: "Entrées, sorties, présence" },
  { label: "Écran kiosque", value: "QR tournant, code à six caractères" },
  { label: "Hébergement", value: "Local, sur votre serveur" },
  { label: "Mises à jour", value: "Incluses" },
  { label: "Mise en service", value: "Déploiement et formation" },
];

const ROADMAP = [
  {
    title: "Reconnaissance faciale",
    body: "Pointer sans téléphone : le visage est reconnu à l'écran du kiosque, et la journée s'ouvre comme aujourd'hui.",
    status: "À l'étude",
  },
  {
    title: "Planning et accès employé",
    body: "Chaque employé consulte ses horaires et ses prochains services depuis son compte, sans passer par le responsable.",
    status: "À l'étude",
  },
  {
    title: "Alertes de changement",
    body: "Retard, absence, sortie manquante : le responsable reçoit le changement sur Telegram au moment où il arrive.",
    status: "En préparation",
  },
  {
    title: "Application mobile native",
    body: "Une application iOS et Android pour pointer et consulter son relevé, sans ouvrir le navigateur.",
    status: "Prévu",
  },
];

const FAQ = [
  {
    q: "Faut-il acheter du matériel ?",
    a: "Non. Un écran pour le kiosque et les téléphones de l'équipe suffisent. L'écran peut être n'importe quel navigateur, y compris une tablette déjà présente en boutique.",
  },
  {
    q: "Et un employé sans smartphone ?",
    a: "Il tape le code à six caractères affiché sous le QR. C'est le même pointage, la même entrée ou sortie, sans caméra.",
  },
  {
    q: "Combien d'employés peut-on créer ?",
    a: "Autant que la boutique en compte. Il n'y a ni siège à acheter, ni palier à franchir, ni supplément à l'employé.",
  },
  {
    q: "Combien de temps garde-t-on l'historique ?",
    a: "Tout l'historique. Aucune purge n'est programmée sur votre instance : les pointages d'il y a trois ans restent lisibles et exportables.",
  },
  {
    q: "Où sont hébergées les données ?",
    a: "Sur le serveur de la boutique. L'application et la base vivent chez vous ; les pointages ne partent pas dans un cloud tiers. Seules les annonces Telegram que vous activez transitent par Telegram.",
  },
  {
    q: "Telegram est-il obligatoire ?",
    a: "Non. Sans bot configuré, l'application fonctionne exactement comme avant. Les annonces sont un confort en plus, jamais une dépendance.",
  },
  {
    q: "Que se passe-t-il si une sortie est oubliée ?",
    a: "La journée est marquée incomplète et signalée dans les totaux. Elle n'est jamais refermée à une heure inventée. Le responsable la corrige quand il connaît la vraie heure.",
  },
  {
    q: "Peut-on corriger un pointage ?",
    a: "Oui. Le responsable peut changer une heure, changer le type, ajouter un pointage ou en supprimer un. Le relevé et les totaux suivent immédiatement.",
  },
  {
    q: "L'export Excel est-il limité ?",
    a: "Non. Une semaine, un mois ou n'importe quelle plage de dates, pour un employé ou toute l'équipe, dans un seul fichier. Le sélecteur ne propose que des périodes qui contiennent des pointages.",
  },
  {
    q: "Peut-on équiper plusieurs boutiques ?",
    a: "Chaque boutique a sa propre instance et son propre abonnement. Une instance ne mélange jamais deux équipes, deux historiques ou deux responsables.",
  },
  {
    q: "Que se passe-t-il si la boutique ferme ?",
    a: "Vous exportez tout l'historique en Excel et les données restent sur votre serveur. Rien n'est retenu dans un compte que vous ne contrôlez pas.",
  },
  {
    q: "Y a-t-il un engagement ?",
    a: "L'abonnement couvre douze mois. La mise en service est réglée une fois, au démarrage. Le renouvellement se décide boutique par boutique.",
  },
];

function useKioskCode() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % KIOSK_CODES.length),
      7_000,
    );
    return () => window.clearInterval(timer);
  }, []);

  return KIOSK_CODES[index];
}

/** Reveals a block once, as it enters the viewport. Without the observer the
 *  content is shown immediately, and reduced motion never hides it. */
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("reveal", shown && "is-shown", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] leading-tight text-[#a3a3a3]">{label}</p>
      <p className="tnum mt-1 text-[14px] leading-tight text-[#fafafa]">{value}</p>
    </div>
  );
}

function PresenceBody({ punched = false }: { punched?: boolean }) {
  const people = punched
    ? [
        PEOPLE[0],
        PEOPLE[1],
        { ...PEOPLE[2], state: "in" as const, since: "14:32", detail: "0 h 00 sur place" },
      ]
    : PEOPLE;

  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] text-[#fafafa]">Présence</p>
        <p className="tnum text-[13px] text-[#a3a3a3]">
          {punched ? "3" : "2"} sur place
        </p>
      </div>

      <ul className="mt-3 space-y-1">
        {people.map((person) => (
          <li key={person.nom} className="flex items-center gap-3 py-2.5">
            <span
              aria-hidden
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                person.state === "in" ? "bg-[#5ec98a]" : "bg-[#e08a7a]",
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] text-[#fafafa]">{person.nom}</p>
              <p className="truncate text-[12px] text-[#a3a3a3]">{person.poste}</p>
            </div>
            <div className="shrink-0 text-right">
              <p
                className={cn(
                  "text-[11px] font-medium uppercase tracking-[0.12em]",
                  person.state === "in" ? "text-[#5ec98a]" : "text-[#a3a3a3]",
                )}
              >
                {person.state === "in" ? "Dedans" : "Dehors"}
              </p>
              <p className="tnum mt-0.5 text-[12px] text-[#a3a3a3]">{person.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <MiniStat label="Heures aujourd'hui" value="14 h 32" />
        <MiniStat label="Employés" value="3" />
        <MiniStat label="En attente" value="0" />
      </div>
    </>
  );
}

function TelegramMessage({ message }: { message: TgMessage }) {
  return (
    <div className="rounded-md bg-[#0a0a0a] p-4">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            message.type === "in" ? "bg-[#5ec98a]" : "bg-[#e08a7a]",
          )}
        />
        <p className="min-w-0 text-[14px] leading-snug text-[#fafafa]">
          <span className="font-medium">{message.who}</span> —{" "}
          {message.type === "in" ? "entrée" : "sortie"} à {message.time}
        </p>
      </div>
      <p className="mt-3 text-[13px] leading-[1.5] text-[#a3a3a3]">
        <span className="text-[#fafafa]">{message.count} personnes</span> en boutique :
      </p>
      <div className="mt-1 space-y-0.5">
        {message.people.map((person) => (
          <p key={person.nom} className="text-[13px] leading-snug text-[#a3a3a3]">
            {person.nom} <span className="text-[#8a8a8a]">depuis {person.since}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function TelegramHeader() {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-[15px] text-[#fafafa]">Telegram</p>
      <p className="text-[13px] text-[#a3a3a3]">#boutique</p>
    </div>
  );
}

function HeroTelegram() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setActive((current) => (current === 0 ? 1 : 0)),
      6_500,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <TelegramHeader />
      {/* The slow crossfade: the same chat, one arrival then one departure.
          Both layers stay in the DOM so the height never jumps. */}
      <div className="relative mt-4 min-h-[186px]">
        {TG_MESSAGES.map((message, index) => (
          <div
            key={`${message.who}-${message.time}`}
            aria-hidden={active !== index}
            className={cn(
              "tg-layer absolute inset-0",
              active === index && "is-visible",
            )}
          >
            <TelegramMessage message={message} />
          </div>
        ))}
      </div>
    </>
  );
}

function TelegramStatic() {
  return (
    <>
      <TelegramHeader />
      <div className="mt-4">
        <TelegramMessage message={TG_MESSAGES[0]} />
      </div>
    </>
  );
}

function TelegramLive({ punched }: { punched: boolean }) {
  return (
    <TelegramMessage
      message={
        punched
          ? {
              type: "in",
              who: "Sofia",
              time: "14:32",
              count: 3,
              people: [
                { nom: "Yasmine", since: "09:02" },
                { nom: "Karim", since: "09:15" },
                { nom: "Sofia", since: "14:32" },
              ],
            }
          : TG_MESSAGES[0]
      }
    />
  );
}

function KioskBody({
  code,
  qrSize = 124,
}: {
  code: string;
  qrSize?: number;
}) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-3 text-[#0a0a0a]">
        <p className="text-[15px]">Kiosque</p>
        <p className="text-[13px] text-[#525252]">Code tournant</p>
      </div>

      <div className="mt-4 flex flex-col items-start gap-4 lg:flex-row lg:items-center">
        <div
          className="shrink-0 rounded bg-white p-2 ring-1 ring-black/10"
          role="img"
          aria-label={`Code QR de pointage, code ${code}`}
        >
          <QRCodeSVG
            value={code}
            size={qrSize}
            level="M"
            bgColor="#ffffff"
            fgColor="#0a0a0a"
          />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] text-[#525252]">Saisissez le code</p>
          <p
            key={code}
            className="tnum animate-in fade-in duration-700 font-serif text-[clamp(1.6rem,2.4vw,2.4rem)] leading-none tracking-[0.14em] text-[#0a0a0a]"
          >
            {code}
          </p>
          <p className="mt-2 text-[13px] leading-snug text-[#525252]">
            Il change toutes les 30 secondes.
          </p>
        </div>
      </div>
    </>
  );
}

function ExportBody() {
  const rows = [
    { nom: "Yasmine", total: "92 h 15" },
    { nom: "Karim", total: "78 h 40" },
    { nom: "Sofia", total: "64 h 05" },
  ];

  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] text-[#fafafa]">Export Excel</p>
        <p className="tnum text-[13px] text-[#a3a3a3]">28 jours</p>
      </div>
      <p className="mt-1 text-[13px] text-[#a3a3a3]">
        3 août – 30 août 2026 · toute l'équipe
      </p>

      <ul className="mt-3 space-y-1">
        {rows.map((row) => (
          <li key={row.nom} className="flex items-baseline justify-between gap-3 py-2">
            <span className="truncate text-[14px] text-[#fafafa]">{row.nom}</span>
            <span className="tnum shrink-0 text-[13px] text-[#a3a3a3]">{row.total}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-[#a3a3a3]">Total</span>
        <span className="tnum text-[14px] text-[#fafafa]">235 h 00</span>
      </div>
      <p className="mt-2 text-[13px] text-[#a3a3a3]">pointages-2026-08.xlsx</p>
    </>
  );
}

function TimesheetBody() {
  const days = [
    { jour: "lundi", heures: "09:02 – 17:30", total: "8 h 28" },
    { jour: "mardi", heures: "08:58 – 17:35", total: "8 h 37" },
    { jour: "mercredi", heures: "09:05 – 17:40", total: "8 h 35" },
    { jour: "jeudi", heures: "09:01 – 13:41", total: "4 h 40" },
  ];

  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] text-[#fafafa]">Relevé — Yasmine</p>
        <p className="text-[13px] text-[#a3a3a3]">Semaine</p>
      </div>
      <p className="tnum mt-4 font-serif text-[clamp(2.4rem,4.5vw,3.4rem)] leading-none text-[#fafafa]">
        30 h 20
      </p>
      <p className="mt-1 text-[13px] text-[#a3a3a3]">travaillées cette semaine</p>

      <ul className="mt-4 space-y-1">
        {days.map((day) => (
          <li key={day.jour} className="flex items-baseline justify-between gap-3 py-2">
            <span className="min-w-0 truncate text-[13px] text-[#fafafa]">
              <span className="capitalize">{day.jour}</span>{" "}
              <span className="tnum text-[#a3a3a3]">{day.heures}</span>
            </span>
            <span className="tnum shrink-0 text-[13px] text-[#fafafa]">{day.total}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function HeroBoard({ code }: { code: string }) {
  return (
    <div className="grid gap-2 md:grid-cols-12">
      <div data-ui className="rounded-md bg-[#111] p-5 md:col-span-7">
        <PresenceBody />
      </div>
      <div data-ui className="rounded-md bg-[#111] p-5 md:col-span-5">
        <HeroTelegram />
      </div>
      <div data-ui className="overflow-hidden rounded-md bg-[#fafafa] p-5 md:col-span-5">
        <KioskBody code={code} qrSize={112} />
      </div>
      <div data-ui className="rounded-md bg-[#111] p-5 md:col-span-7">
        <ExportBody />
      </div>
    </div>
  );
}

function LiveDemo({ code }: { code: string }) {
  const [punched, setPunched] = useState(false);

  return (
    <div data-ui className="rounded-md bg-[#111] p-2 sm:p-3">
      <div className="overflow-hidden rounded-md bg-[#fafafa] p-5 text-[#0a0a0a]">
        <KioskBody code={code} qrSize={104} />
      </div>

      <div className="mt-2 rounded-md bg-[#0a0a0a] p-5">
        <PresenceBody punched={punched} />
      </div>

      <div className="mt-2 rounded-md bg-[#0a0a0a] p-5">
        <TelegramHeader />
        <div className="mt-3">
          <TelegramLive punched={punched} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 px-1 pb-1">
        <Button
          type="button"
          aria-pressed={punched}
          onClick={() => setPunched((current) => !current)}
          className="h-11 px-4 text-[14px]"
        >
          {punched ? <RotateCcw /> : <ScanLine />}
          {punched ? "Réinitialiser la démonstration" : "Simuler l'arrivée de Sofia"}
        </Button>
        <p className="text-[13px] text-[#a3a3a3]">
          Démonstration : aucune donnée n'est envoyée.
        </p>
      </div>

      <p aria-live="polite" className="sr-only">
        {punched
          ? "Sofia est entrée à 14 h 32. Trois personnes en boutique."
          : "Deux personnes en boutique."}
      </p>
    </div>
  );
}

export function Proposition() {
  const code = useKioskCode();

  return (
    <div className="proposition min-h-dvh bg-background text-foreground">
      <header className="relative z-10">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-6 py-5 md:px-10 md:py-6">
          <a href="#top" className="wordmark text-base">
            Padretar
          </a>

          <nav
            aria-label="Sommaire"
            className="hidden items-center gap-8 text-[14px] text-muted-foreground md:flex"
          >
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <Button asChild size="sm" className="h-9 px-4">
            <a href={CONTACT_HREF}>
              Nous écrire <ArrowUpRight />
            </a>
          </Button>
        </div>
      </header>

      <main id="top">
        {/* Hero — the title first, then the product's own board. The brand's
            axis at 42% keeps the notes to the left and the claim on the right. */}
        <section className="mx-auto max-w-[1200px] px-6 pb-20 pt-10 md:px-10 md:pb-28 md:pt-16">
          <div className="grid gap-12 md:grid-cols-12 md:gap-8">
            <div className="order-2 hidden md:order-1 md:col-span-4 md:block">
              <Card className="gap-0 rounded-md border-0 bg-[#fafafa] px-4 py-4 text-[#0a0a0a] shadow-none">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-serif text-[2rem] leading-none">∞</p>
                    <p className="mt-3 text-[13px] leading-tight text-[#525252]">
                      Employés, sans plafond
                    </p>
                  </div>
                  <div>
                    <p className="font-serif text-[2rem] leading-none">∞</p>
                    <p className="mt-3 text-[13px] leading-tight text-[#525252]">
                      Historique, sans purge
                    </p>
                  </div>
                </div>
              </Card>
              <p className="mt-6 text-[14px] text-muted-foreground">
                Proposition annuelle
              </p>
            </div>

            <div className="order-1 md:order-2 md:col-start-6 md:col-span-7">
              <h1 className="font-serif text-[clamp(2.7rem,7.5vw,6rem)] font-medium leading-[0.95] tracking-[-0.02em]">
                Le pointage de votre boutique.
              </h1>

              <p
                className="rise mt-7 max-w-[52ch] text-[17px] leading-[1.55]"
                style={{ animationDelay: "90ms" }}
              >
                Un QR à l'écran, un scan sur le téléphone. Padretar enregistre
                les entrées et les sorties, tient les totaux à jour et prévient
                l'équipe sur Telegram. Sans badge, sans tableur, sans limite.
              </p>

              <div
                className="rise mt-8 flex flex-wrap items-center gap-3"
                style={{ animationDelay: "170ms" }}
              >
                <Button asChild className="h-11 px-5 text-[15px]">
                  <a href={CONTACT_HREF}>
                    Demander la mise en service <ArrowUpRight />
                  </a>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="h-11 px-4 text-[15px] text-muted-foreground hover:text-foreground"
                >
                  <a href="#abonnement">Voir ce qui est compris</a>
                </Button>
              </div>

              <p
                className="rise mt-5 text-[14px] text-muted-foreground"
                style={{ animationDelay: "240ms" }}
              >
                150 à 200 € par an, tout compris. Mise en service : 80 € une fois.
              </p>
            </div>
          </div>

          <div className="rise mt-14 md:mt-20" style={{ animationDelay: "300ms" }}>
            <HeroBoard code={code} />
          </div>

          <div className="mt-8 md:hidden">
            <Card className="gap-0 rounded-md border-0 bg-[#fafafa] px-4 py-4 text-[#0a0a0a] shadow-none">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-serif text-[2rem] leading-none">∞</p>
                  <p className="mt-3 text-[13px] leading-tight text-[#525252]">
                    Employés, sans plafond
                  </p>
                </div>
                <div>
                  <p className="font-serif text-[2rem] leading-none">∞</p>
                  <p className="mt-3 text-[13px] leading-tight text-[#525252]">
                    Historique, sans purge
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Features — a mosaic of unlike tiles, not a row of cards. */}
        <section className="mx-auto max-w-[1200px] px-6 py-24 md:px-10 md:py-32">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-12 lg:auto-rows-[96px]">
            <Reveal className="flex flex-col justify-between p-6 sm:col-span-2 lg:col-span-6 lg:row-span-3">
              <h2
                id="application"
                className="scroll-mt-6 font-serif text-[clamp(2.2rem,4vw,3.5rem)] font-medium leading-[0.95] tracking-[-0.02em]"
              >
                Tout le pointage.
              </h2>
              <p className="max-w-[28ch] text-[17px] leading-[1.5] text-muted-foreground">
                Une journée de boutique, sans badge et sans tableur.
              </p>
            </Reveal>

            <Reveal className="sm:col-span-2 lg:col-span-6 lg:row-span-5" delay={70}>
              <div
                data-ui
                className="h-full overflow-hidden rounded-md bg-[#fafafa] p-6 text-[#0a0a0a]"
              >
                <KioskBody code={code} qrSize={140} />
              </div>
            </Reveal>

            <div className="grid grid-cols-2 gap-2 sm:contents">
              <Reveal className="bg-[#171717] p-5 sm:col-span-1 lg:col-span-3 lg:row-span-2">
                <p className="font-serif text-[3.5rem] leading-none">∞</p>
                <p className="mt-4 text-[13px] leading-snug text-muted-foreground">
                  employés, pointages, historique
                </p>
              </Reveal>

              <Reveal
                className="bg-[#111] p-5 sm:col-span-1 lg:col-span-3 lg:row-span-2"
                delay={70}
              >
                <p className="text-[13px] text-muted-foreground">Aussi</p>
                <ul className="mt-3 space-y-1.5 text-[16px] leading-[1.3]">
                  <li>Présence en direct</li>
                  <li>Validation des comptes</li>
                  <li>Corrections du responsable</li>
                  <li>Export Excel</li>
                </ul>
              </Reveal>
            </div>

            <Reveal className="sm:col-span-2 lg:col-span-6 lg:row-span-3" delay={100}>
              <div data-ui className="flex h-full flex-col rounded-md bg-[#111] p-6">
                <TelegramStatic />
                <p className="mt-auto pt-4 text-[13px] leading-snug text-[#a3a3a3]">
                  Le bot n'écrit que dans le salon choisi. Aucune donnée n'est
                  reçue de Telegram.
                </p>
              </div>
            </Reveal>

            <Reveal
              className="flex flex-col bg-[#fafafa] p-6 text-[#0a0a0a] sm:col-span-1 lg:col-span-3 lg:row-span-3"
              delay={130}
            >
              <p className="text-[2rem] leading-[1.2]">
                Code tournant : 30 secondes.
              </p>
              <p className="mt-4 text-[14px] leading-[1.5] text-[#525252]">
                Chaque scan est daté par le serveur. Une photo du QR ne vaut
                rien.
              </p>
              <p className="mt-auto pt-6 text-[13px] text-[#525252]">Kiosque</p>
            </Reveal>

            <Reveal
              className="flex flex-col bg-[#171717] p-6 sm:col-span-1 lg:col-span-3 lg:row-span-3"
              delay={160}
            >
              <p className="text-[2rem] leading-[1.2]">
                Vos données restent chez vous.
              </p>
              <p className="mt-4 text-[14px] leading-[1.5] text-muted-foreground">
                L'application et la base vivent sur votre serveur, pas dans un
                cloud tiers.
              </p>
              <p className="mt-auto pt-6 text-[13px] text-muted-foreground">
                Hébergement local
              </p>
            </Reveal>
          </div>
        </section>

        {/* The unlimited promise, as a typographic comparison. */}
        <section className="mx-auto max-w-[1200px] px-6 py-24 md:px-10 md:py-32">
          <div className="grid gap-8 md:grid-cols-12">
            <Reveal className="md:col-span-5">
              <h2 className="font-serif text-[clamp(2.2rem,4vw,3.5rem)] font-medium leading-tight">
                Aucun compteur.
              </h2>
            </Reveal>
            <Reveal className="md:col-start-7 md:col-span-6" delay={80}>
              <p className="max-w-[58ch] text-[17px] leading-[1.55]">
                Pas de sièges à acheter, pas d'historique à archiver, pas
                d'export à débloquer. Le forfait couvre la boutique entière,
                quel que soit le nombre d'employés et le nombre d'années de
                pointages.
              </p>
            </Reveal>
          </div>

          <Reveal className="mt-16 grid gap-12 md:mt-24 md:grid-cols-12 md:gap-0" delay={60}>
            <div className="md:col-span-6">
              <p className="font-serif text-[clamp(8rem,24vw,20rem)] leading-[0.8] tracking-[-0.04em]">
                0
              </p>
              <p className="mt-6 max-w-[30ch] text-[14px] leading-[1.5] text-muted-foreground">
                <span className="text-foreground">Plafond.</span> Employés,
                historique, exports : aucune limite d'usage.
              </p>
            </div>
            <div className="md:col-span-6">
              <p className="font-serif text-[clamp(8rem,24vw,20rem)] leading-[0.8] tracking-[-0.04em]">
                ∞
              </p>
              <p className="mt-6 max-w-[30ch] text-[14px] leading-[1.5] text-muted-foreground">
                <span className="text-foreground">Usage.</span> Un seul
                abonnement annuel, pour toute l'équipe.
              </p>
            </div>
          </Reveal>
        </section>

        {/* Daily flow, with a working punch demonstration. */}
        <section className="mx-auto max-w-[1200px] px-6 py-24 md:px-10 md:py-32">
          <div className="grid gap-12 md:grid-cols-12 md:gap-8">
            <div className="md:col-span-5">
              <Reveal>
                <h2 className="font-serif text-[clamp(2.2rem,4vw,3.5rem)] font-medium leading-[1.0] tracking-[-0.02em]">
                  Un scan, et la boutique le sait.
                </h2>
              </Reveal>

              <Reveal delay={70}>
                <p className="mt-6 max-w-[42ch] text-[17px] leading-[1.55]">
                  L'employé ne choisit jamais entrée ou sortie : le serveur le
                  déduit de son dernier pointage du jour. Une sortie oubliée
                  laisse la journée incomplète, jamais refermée à une heure
                  inventée.
                </p>
              </Reveal>

              <Reveal delay={140}>
                <ol className="mt-10 space-y-8">
                  <li>
                    <p className="text-[16px] font-medium">
                      Le kiosque affiche un code.
                    </p>
                    <p className="mt-1 text-[16px] leading-[1.55] text-muted-foreground">
                      Il tourne toutes les trente secondes. Une photo du QR ne
                      sert donc à rien.
                    </p>
                  </li>
                  <li>
                    <p className="text-[16px] font-medium">L'employé scanne.</p>
                    <p className="mt-1 text-[16px] leading-[1.55] text-muted-foreground">
                      Ou tape les six caractères. Même geste, même pointage,
                      même règle.
                    </p>
                  </li>
                  <li>
                    <p className="text-[16px] font-medium">
                      La boutique le sait déjà.
                    </p>
                    <p className="mt-1 text-[16px] leading-[1.55] text-muted-foreground">
                      Présence, totaux, Telegram : tout est à jour au moment où
                      le scan arrive.
                    </p>
                  </li>
                </ol>
              </Reveal>
            </div>

            <Reveal className="md:col-start-7 md:col-span-6" delay={100}>
              <LiveDemo code={code} />
            </Reveal>
          </div>
        </section>

        {/* Mise en service. */}
        <section className="mx-auto max-w-[1200px] px-6 py-24 md:px-10 md:py-32">
          <div className="grid gap-12 md:grid-cols-12 md:gap-8">
            <div className="md:col-span-5">
              <Reveal>
                <h2 className="font-serif text-[clamp(2.2rem,4vw,3.5rem)] font-medium leading-[1.0] tracking-[-0.02em]">
                  Nous installons, vous pointez.
                </h2>
              </Reveal>
              <Reveal delay={70}>
                <p className="mt-6 max-w-[42ch] text-[17px] leading-[1.55]">
                  La mise en service prend en charge le déploiement, l'écran de
                  la boutique, le bot Telegram et la formation du responsable.
                  Vous n'avez pas de compte à créer pour chaque employé : ils
                  arrivent en attente et vous les validez.
                </p>
              </Reveal>
            </div>

            <Reveal className="md:col-start-7 md:col-span-6" delay={100}>
              <ol className="list-decimal space-y-8 pl-5 marker:font-serif marker:text-muted-foreground">
                <li>
                  <h3 className="text-[17px] font-medium">
                    Nous préparons l'instance.
                  </h3>
                  <p className="mt-1 text-[16px] leading-[1.55] text-muted-foreground">
                    Déploiement sur votre serveur, historique sans purge, export
                    activé, Telegram branché si vous le souhaitez.
                  </p>
                </li>
                <li>
                  <h3 className="text-[17px] font-medium">
                    Nous installons le kiosque.
                  </h3>
                  <p className="mt-1 text-[16px] leading-[1.55] text-muted-foreground">
                    L'écran de la boutique, le QR tournant et le mot de passe qui
                    libère l'écran. Le kiosque se verrouille tout seul.
                  </p>
                </li>
                <li>
                  <h3 className="text-[17px] font-medium">
                    Nous formons le responsable.
                  </h3>
                  <p className="mt-1 text-[16px] leading-[1.55] text-muted-foreground">
                    Validation des comptes, corrections, lecture des totaux et
                    export de paie. Une séance, avec vos vrais employés.
                  </p>
                </li>
                <li>
                  <h3 className="text-[17px] font-medium">
                    Nous remettons les accès.
                  </h3>
                  <p className="mt-1 text-[16px] leading-[1.55] text-muted-foreground">
                    Un compte responsable, les comptes de l'équipe à valider, et
                    le premier pointage de la boutique.
                  </p>
                </li>
              </ol>

              <p className="mt-10 text-[16px] leading-[1.55] text-muted-foreground">
                La mise en service est facturée une fois. Aucun frais par
                employé, aucun frais par pointage.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Subscription — the page's paper field. */}
        <section id="abonnement" className="bg-[#fafafa] text-[#0a0a0a]">
          <div className="mx-auto max-w-[1200px] scroll-mt-6 px-6 py-24 md:px-10 md:py-32">
            <div className="grid gap-12 md:grid-cols-12 md:gap-8">
              <div className="flex flex-col md:col-span-5">
                <Reveal>
                  <h2 className="font-serif text-[clamp(2.2rem,4vw,3.5rem)] font-medium leading-[1.0] tracking-[-0.02em]">
                    L'abonnement.
                  </h2>
                </Reveal>

                <Reveal delay={70}>
                  <p className="mt-6 font-serif text-[2rem] leading-tight">
                    Padretar — Dar as Saada
                  </p>
                  <p className="mt-3 max-w-[26ch] text-[17px] leading-[1.55] text-[#525252]">
                    Une boutique, une équipe, un historique. Tout est compris.
                  </p>
                </Reveal>

                <Reveal className="mt-12 md:mt-auto md:pt-16" delay={120}>
                  <p className="font-serif text-[clamp(4rem,9vw,6rem)] leading-none tracking-[-0.03em]">
                    200 €
                    <span className="ml-2 align-baseline text-[17px] tracking-normal text-[#525252]">
                      par an
                    </span>
                  </p>
                  <p className="mt-4 text-[14px] text-[#525252]">
                    Tarif Dar as Saada, tout compris. Mise en service : 80 €,
                    une seule fois.
                  </p>
                  <p className="mt-1 text-[14px] text-[#525252]">
                    Année 1 : 280 €. Renouvellement : 200 € par an.
                  </p>
                  <p className="mt-1 text-[14px] text-[#525252]">
                    Autres boutiques : 150 à 200 € par an.
                  </p>

                  <Button
                    asChild
                    className="mt-8 h-11 bg-[#0a0a0a] px-5 text-[15px] text-[#fafafa] hover:bg-[#262626]"
                  >
                    <a href={CONTACT_HREF}>
                      Demander la mise en service <ArrowUpRight />
                    </a>
                  </Button>
                </Reveal>
              </div>

              <Reveal className="md:col-start-7 md:col-span-6" delay={100}>
                <h3 className="text-[16px] font-medium">Ce qui est compris</h3>

                <Table className="mt-4 text-[16px]">
                  <TableHeader>
                    <TableRow className="border-black/15 hover:bg-transparent">
                      <TableHead className="h-9 px-0 text-[13px] font-medium text-[#525252]">
                        Inclus
                      </TableHead>
                      <TableHead className="h-9 px-0 text-right text-[13px] font-medium text-[#525252]">
                        Détail
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {INCLUDED.map((row) => (
                      <TableRow
                        key={row.label}
                        className="border-black/10 hover:bg-black/[0.03]"
                      >
                        <TableCell className="whitespace-normal px-0 py-3.5 text-[16px]">
                          {row.label}
                        </TableCell>
                        <TableCell className="whitespace-normal px-0 py-3.5 text-right text-[16px] text-[#525252]">
                          {row.value}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <p className="mt-6 max-w-[52ch] text-[16px] leading-[1.55] text-[#525252]">
                  Les pointages restent sur votre serveur. Seules les annonces
                  Telegram que vous activez transitent par Telegram.
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Roadmap. */}
        <section className="mx-auto max-w-[1200px] px-6 py-24 md:px-10 md:py-32">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="hidden md:col-span-4 md:block">
              <Reveal>
                <p className="text-[14px] text-muted-foreground">
                  Pas encore disponible
                </p>
              </Reveal>
            </div>

            <div className="md:col-start-5 md:col-span-8">
              <Reveal>
                <h2 className="font-serif text-[clamp(2.2rem,4vw,3.5rem)] font-medium leading-[1.0] tracking-[-0.02em]">
                  Ce qui arrive ensuite.
                </h2>
              </Reveal>

              <Reveal delay={70}>
                <p className="mt-6 max-w-[50ch] text-[17px] leading-[1.55]">
                  Ces fonctions ne sont pas dans l'application aujourd'hui.
                  Elles arrivent dans l'ordre où elles servent le quotidien de
                  la boutique, pas dans l'ordre d'une liste de courses.
                </p>
              </Reveal>

              <div className="mt-14 grid gap-x-16 gap-y-12 md:grid-cols-2">
                {ROADMAP.map((item, index) => (
                  <Reveal key={item.title} delay={index * 70}>
                    <h3 className="font-serif text-[2rem] leading-tight">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[16px] leading-[1.55] text-muted-foreground">
                      {item.body}{" "}
                      <span className="text-foreground">{item.status}.</span>
                    </p>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ — reading text, not an accordion. */}
        <section className="mx-auto max-w-[1200px] px-6 py-24 md:px-10 md:py-32">
          <div className="grid gap-10 md:grid-cols-12">
            <Reveal className="md:col-span-3">
              <h2
                id="questions"
                className="scroll-mt-6 font-serif text-[clamp(2.2rem,4vw,3.5rem)] font-medium leading-tight"
              >
                Questions.
              </h2>
            </Reveal>

            <div className="md:col-start-5 md:col-span-8">
              <div className="faq-columns">
                {FAQ.map((item) => (
                  <p key={item.q} className="text-[16px] leading-[1.55]">
                    <strong className="font-medium text-foreground">{item.q}</strong>{" "}
                    <span>{item.a}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Three crops of the product, then the closing field. */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-3">
            <div className="col-span-2 h-[30svh] overflow-hidden md:col-span-1 md:h-[38svh]">
              <div data-ui className="h-full bg-[#fafafa] p-6 md:p-8">
                <KioskBody code={code} qrSize={96} />
              </div>
            </div>
            <div className="h-[24svh] overflow-hidden md:h-[38svh]">
              <div data-ui className="h-full bg-[#111] p-6 md:p-8">
                <TelegramStatic />
              </div>
            </div>
            <div className="h-[24svh] overflow-hidden md:h-[38svh]">
              <div data-ui className="h-full bg-[#171717] p-6 md:p-8">
                <TimesheetBody />
              </div>
            </div>
          </div>

          <div className="bg-[#fafafa] text-[#0a0a0a]">
            <div className="mx-auto max-w-[1200px] px-6 py-24 md:px-10 md:py-32">
              <div className="grid gap-12 md:grid-cols-12">
                <Reveal className="md:col-span-7">
                  <p className="font-serif text-[clamp(2rem,3.4vw,3rem)] leading-[1.05]">
                    Mettons votre boutique en service.
                  </p>
                  <p className="mt-8 text-[17px] leading-[1.55] text-[#525252]">
                    Une réponse par email, puis une date de mise en service.
                  </p>
                  <p className="mt-2 text-[17px] leading-[1.55] text-[#525252]">
                    80 € une fois, puis 200 € par an.
                  </p>
                  <a
                    href={CONTACT_HREF}
                    className="mt-8 inline-block text-[17px] font-medium underline decoration-[4px] underline-offset-8 transition-opacity hover:opacity-70"
                  >
                    Demander la mise en service
                  </a>
                </Reveal>

                <Reveal
                  className="self-end md:col-start-10 md:col-span-3"
                  delay={80}
                >
                  <p className="text-[14px] leading-[1.7] text-[#525252]">
                    Sans badge.
                    <br />
                    Sans limite.
                    <br />
                    Chez vous.
                  </p>
                </Reveal>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex min-h-[70svh] flex-col justify-between px-6 py-12 md:px-10 md:py-16">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-start justify-between gap-8">
          <a href="#top" className="wordmark text-base">
            Padretar
          </a>
          <div className="flex flex-wrap gap-x-10 gap-y-2 text-[14px] text-muted-foreground">
            <span>Pointage de boutique</span>
            <span>Édition 2026</span>
            <a href="#top" className="transition-colors hover:text-foreground">
              Retour en haut
            </a>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1200px] pt-24">
          <a
            href={CONTACT_HREF}
            className="mt-4 block break-words font-serif text-[clamp(1.9rem,7.5vw,6rem)] leading-[0.95] tracking-[-0.02em] transition-opacity hover:opacity-70"
          >
            {CONTACT_EMAIL}
          </a>

          <div className="mt-16 flex flex-col gap-4 text-[13px] text-muted-foreground sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="transition-colors hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
              <a href="/" className="transition-colors hover:text-foreground">
                Se connecter
              </a>
            </div>
            <p>Pointage, présence, paie. Pour une boutique de proximité.</p>
            <p>2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
