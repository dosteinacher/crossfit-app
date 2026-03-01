'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Card, Loading } from '@/components/ui';

const SECTIONS = [
  { id: 'team-guidelines', label: 'Allgemein & Team' },
  { id: 'programming', label: 'Programming' },
  { id: 'standard-workout', label: 'Standard Workout' },
  { id: 'long-workout', label: 'Long Workout' },
  { id: 'skill-workout', label: 'Skill Workout' },
  { id: 'double-workout', label: 'Double Workout' },
] as const;

export default function GuidelinesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      setLoading(false);
    } catch {
      router.push('/login');
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-pure-dark py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <h1 className="text-4xl font-bold text-pure-white mb-2">CrossFit Workout Formate</h1>
          <p className="text-gray-400 mb-8">Richtlinien zu Trainingsstruktur, Team-Regeln, Programming und Session-Formaten.</p>

          <div className="flex flex-col md:flex-row md:gap-8 md:items-start">
            <aside className="flex gap-2 mb-6 overflow-x-auto pb-2 md:overflow-visible md:flex-col md:mb-0 md:shrink-0 md:w-48 md:sticky md:top-24">
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={'#' + section.id}
                  className="shrink-0 px-4 py-2 rounded-lg border border-coastal-sky/50 text-pure-white hover:bg-coastal-sky/20 transition text-sm whitespace-nowrap md:whitespace-normal"
                >
                  {section.label}
                </a>
              ))}
            </aside>

            <div className="min-w-0 flex-1">
            <section id="team-guidelines" className="scroll-mt-24 mb-10">
              <Card className="bg-pure-gray border border-gray-700">
                <h2 className="text-2xl font-bold text-pure-green mb-4">Allgemeine Trainingsstruktur und Team-Richtlinien</h2>
                <p className="text-gray-300 mb-4">
                  Alle Trainingsformate können in verschiedenen Settings durchgeführt werden:
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Individual (1 Person allein)</li>
                  <li>Team of 2</li>
                  <li>Team of 3</li>
                  <li>Team of 4</li>
                  <li>Team of 5</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">General Team Rules</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Werden Wiederholungen zwischen Athleten aufgeteilt, muss die Gesamtzahl eine gleichmäßige Verteilung ermöglichen (gerade Zahl), damit die Arbeit fair verteilt werden kann.</li>
                  <li>In Team Workouts darf entweder nur EIN Athlet gleichzeitig pausieren oder niemand pausiert.</li>
                  <li>Die Work/Rest-Struktur muss immer klar definiert sein, um Fairness und den korrekten Trainingsreiz sicherzustellen.</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">Team of 2</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Wiederholungen können gleichmäßig aufgeteilt werden.</li>
                  <li>Wechsel im „You go / I go&quot;-Stil möglich.</li>
                  <li>Synchrone Bewegungen können ausgeführt werden.</li>
                  <li>Beide können gleichzeitig arbeiten oder sich abwechseln.</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">Team of 3</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Entweder arbeiten alle drei kontinuierlich (geteilte Wiederholungen), oder nur EIN Athlet pausiert gleichzeitig.</li>
                  <li>Zwei Athleten können synchron arbeiten, während der dritte auf dem Bike, Rower oder einer anderen Station ist.</li>
                  <li>Rotationen müssen eine ausgewogene Arbeitsverteilung sicherstellen.</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">Team of 4</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Alle vier können gemeinsam arbeiten (z. B. synchron oder mit geteilten Wiederholungen).</li>
                  <li>Nur EIN Athlet pausiert gleichzeitig, wenn Pausen vorgesehen sind.</li>
                  <li>Das Team kann auch als zwei Teams of 2 innerhalb desselben Workouts strukturiert werden.</li>
                  <li>Rotationssysteme müssen Fairness und gleichen Trainingsreiz sicherstellen.</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">Team of 5</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Möglich, aber wichtige Regel: nur EIN Athlet pausiert gleichzeitig oder niemand pausiert.</li>
                  <li>Rotationen müssen klar strukturiert sein, um übermäßige passive Pausen zu vermeiden.</li>
                  <li>Geteilte Wiederholungen müssen bei Bedarf weiterhin eine gleichmäßige Verteilung ermöglichen.</li>
                </ul>

                <p className="text-gray-300 mt-4">
                  Die gewählte Teamstruktur beeinflusst Intensität, Pacing-Strategie, Pausenverteilung und den Gesamtreiz des Workouts.
                </p>
              </Card>
            </section>

            <section id="programming" className="scroll-mt-24 mb-10">
              <Card className="bg-pure-gray border border-gray-700">
                <h2 className="text-2xl font-bold text-pure-green mb-4">Programming Guidelines (für Coaches und Session-Erstellung)</h2>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">1. Time Management</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Die exakte 60-Minuten-Struktur einhalten.</li>
                  <li>Reibungslose Übergänge zwischen den Abschnitten sicherstellen.</li>
                  <li>Strength- und Skill-Teile müssen realistisch in ihr Zeitfenster passen.</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">2. Movement Balance</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Push- und Pull-Bewegungen ausbalancieren.</li>
                  <li>Oberkörper und Unterkörper ausbalancieren.</li>
                  <li>Übermäßige Ermüdung einer Muskelgruppe vor anspruchsvollen Skills oder schweren Lifts vermeiden.</li>
                  <li>Balance zwischen posteriorer und anteriorer Kette berücksichtigen.</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">3. Energy System Planning</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Kurze Time Domains = anaerober Fokus.</li>
                  <li>Lange Time Domains = aerobe Kapazität im Fokus.</li>
                  <li>Double Workouts sollten verschiedene Stimuli kombinieren (z. B. Sprint + Ausdauer).</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">4. Safety &amp; Fatigue Management</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Unsichere Kombinationen vermeiden (z. B. schwere Deadlifts direkt gefolgt von vielen Box Jumps unter extremer Ermüdung).</li>
                  <li>Technische Lifts sollten nicht nach maximaler Erschöpfung folgen.</li>
                  <li>Skill Sessions priorisieren Qualität über Intensität.</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">5. Scaling &amp; Inclusivity</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Jede Session muss Scaling-Optionen bieten (Beginner / Intermediate / Advanced).</li>
                  <li>Last, Volumen und Bewegungskomplexität anpassen.</li>
                  <li>Den beabsichtigten Stimulus auf allen Niveaus erhalten.</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">6. Team Programming Standards</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Gleichmäßige Wiederholungsverteilung beim Teilen der Arbeit sicherstellen.</li>
                  <li>Klar definieren, wer wann pausiert.</li>
                  <li>Übermäßige Leerlaufzeiten für mehrere Athleten vermeiden.</li>
                  <li>Fairness und vergleichbare Arbeitsbelastung zwischen den Athleten gewährleisten.</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">7. Stimulus Clarity</h3>
                <p className="text-gray-300 mb-2">Jede Session sollte klar definieren:</p>
                <ul className="list-disc list-inside text-gray-300 space-y-1">
                  <li>Beabsichtigte Intensität (moderat / hoch / gleichmäßiges Tempo).</li>
                  <li>Pacing-Strategie (gleichmäßig, Negative Split, intervallbasiert).</li>
                  <li>Primäres Ziel (Kraftaufbau, aerobe Basis, Skill-Verfeinerung, Work Capacity).</li>
                </ul>
              </Card>
            </section>

            <section id="standard-workout" className="scroll-mt-24 mb-10">
              <Card className="bg-pure-gray border border-gray-700">
                <h2 className="text-2xl font-bold text-pure-green mb-4">1. Standard Workout (60 Minuten)</h2>
                <h3 className="text-lg font-semibold text-pure-white mb-2">Struktur</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>15 min Warm-up</li>
                  <li>15 min Strength</li>
                  <li>30 min Workout (WOD)</li>
                </ul>
                <h3 className="text-lg font-semibold text-pure-white mt-4 mb-2">Erklärung</h3>
                <p className="text-gray-300 mb-4">
                  Das Standard Workout ist das klassische CrossFit-Klassenformat. Es kombiniert Kraftentwicklung mit Conditioning in einer ausgewogenen Session. Die ersten 15 Minuten bereiten den Körper durch allgemeines Aufwärmen, Mobility und bewegungsspezifische Aktivierung vor.
                </p>
                <p className="text-gray-300 mb-4">
                  Der 15-minütige Strength-Teil konzentriert sich auf kontrollierte, progressive Arbeit wie Squats, Presses, Deadlifts oder Olympic Lifting-Variationen. Ziel ist der Aufbau absoluter Kraft, die Verbesserung der Technik unter Last und die Entwicklung von Explosivkraft.
                </p>
                <p className="text-gray-300 mb-4">
                  Die abschließenden 30 Minuten sind dem Workout of the Day (WOD) gewidmet – typischerweise einem Conditioning-Teil mit höherer Intensität. Dieser kann als AMRAP, For Time, EMOM oder Intervalle strukturiert sein. Dieses Format funktioniert einzeln oder in jeder oben beschriebenen Teamstruktur unter Einhaltung der Regeln zur gleichmäßigen Wiederholungsverteilung und strukturierten Pausenregelung.
                </p>
                <p className="text-gray-300 mb-1"><span className="font-semibold text-pure-white">Purpose:</span> Ausgewogene Entwicklung von Kraft und Conditioning in einer Session.</p>
                <p className="text-gray-300"><span className="font-semibold text-pure-white">Best suited for:</span> Allgemeine CrossFit-Klassen, gemischte Leistungsgruppen und Athleten, die ein vollständiges, abgerundetes Training wünschen.</p>
              </Card>
            </section>

            <section id="long-workout" className="scroll-mt-24 mb-10">
              <Card className="bg-pure-gray border border-gray-700">
                <h2 className="text-2xl font-bold text-pure-green mb-4">2. Long Workout (60 Minuten)</h2>
                <h3 className="text-lg font-semibold text-pure-white mb-2">Struktur</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>15 min Warm-up</li>
                  <li>45 min Workout (WOD)</li>
                </ul>
                <h3 className="text-lg font-semibold text-pure-white mt-4 mb-2">Erklärung</h3>
                <p className="text-gray-300 mb-4">
                  Das Long Workout Format priorisiert Conditioning und Ausdauer. Nach einem gründlichen 15-minütigen Warm-up ist der Großteil der Session einem ausgedehnten Workout gewidmet.
                </p>
                <p className="text-gray-300 mb-2">Der 45-minütige WOD kann sein:</p>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Ein langer AMRAP</li>
                  <li>Ein Chipper-Style Workout</li>
                  <li>Mehrere lange Intervalle</li>
                  <li>Eine volumenreiche, ausdauerorientierte Session</li>
                </ul>
                <p className="text-gray-300 mb-4">
                  Dieses Format fordert aerobe Kapazität, muskuläre Ausdauer, Pacing-Strategie und mentale Stärke. Die Intensität ist typischerweise moderat und nachhaltig – kein maximaler Sprint. In Team-Settings beinhalten längere Workouts häufig geteiltes Volumen, rotierende Stationen, synchrone Elemente oder Relay-Strukturen – stets unter Einhaltung der Regel, dass nur ein Athlet gleichzeitig pausiert (oder keiner).
                </p>
                <p className="text-gray-300 mb-1"><span className="font-semibold text-pure-white">Purpose:</span> Ausdauer, Stamina und die Fähigkeit entwickeln, über eine längere Time Domain konstant zu leisten.</p>
                <p className="text-gray-300"><span className="font-semibold text-pure-white">Best suited for:</span> Athleten, die sich auf Wettkämpfe vorbereiten, Ausdauerziele verfolgen oder einen Conditioning-fokussierten Tag wünschen.</p>
              </Card>
            </section>

            <section id="skill-workout" className="scroll-mt-24 mb-10">
              <Card className="bg-pure-gray border border-gray-700">
                <h2 className="text-2xl font-bold text-pure-green mb-4">3. Skill Workout (60 Minuten)</h2>
                <h3 className="text-lg font-semibold text-pure-white mb-2">Struktur</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>15 min Warm-up</li>
                  <li>30 min Skill Practice</li>
                  <li>15 min Workout (WOD)</li>
                </ul>
                <h3 className="text-lg font-semibold text-pure-white mt-4 mb-2">Erklärung</h3>
                <p className="text-gray-300 mb-4">
                  Das Skill Format legt den Schwerpunkt auf technische Entwicklung. Nach dem Warm-up sind 30 Minuten dem Üben und Verfeinern spezifischer Skills gewidmet, wie: Gymnastics (Handstands, Muscle-ups, Pull-ups), Olympic Lifting Technik, Advanced Barbell Cycling, Double-unders, komplexe Bewegungsmuster.
                </p>
                <p className="text-gray-300 mb-4">
                  Der Fokus liegt auf Qualität, Kontrolle und Wiederholung – nicht auf Intensität. Athleten arbeiten mit handhabbaren Lasten oder Progressionen, um die Bewegungseffizienz zu verbessern. Der abschließende 15-minütige WOD ist in der Regel kürzer und moderat in der Intensität, sodass Athleten den geübten Skill unter leichter Ermüdung anwenden können. Skill Sessions können auch im Team durchgeführt werden – besonders bei Gymnastics-Progressionen oder Barbell Drills, bei denen Partner Feedback geben, sichern, synchrone Drills ausführen oder strukturierte Rotationssysteme nutzen.
                </p>
                <p className="text-gray-300 mb-1"><span className="font-semibold text-pure-white">Purpose:</span> Technik, Bewegungseffizienz und langfristige athletische Entwicklung verbessern.</p>
                <p className="text-gray-300"><span className="font-semibold text-pure-white">Best suited for:</span> Anfänger, die Grundlagen aufbauen, fortgeschrittene Athleten, die anspruchsvolle Skills verfeinern, und alle, die technische Verbesserung benötigen.</p>
              </Card>
            </section>

            <section id="double-workout" className="scroll-mt-24 mb-10">
              <Card className="bg-pure-gray border border-gray-700">
                <h2 className="text-2xl font-bold text-pure-green mb-4">4. Double Workout (60 Minuten)</h2>
                <h3 className="text-lg font-semibold text-pure-white mb-2">Struktur</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>15 min Warm-up</li>
                  <li>Workout 1: 20 min</li>
                  <li>Workout 2: 25 min</li>
                </ul>
                <h3 className="text-lg font-semibold text-pure-white mt-4 mb-2">Erklärung</h3>
                <p className="text-gray-300 mb-4">
                  Das Double Workout Format beinhaltet zwei separate Conditioning-Teile innerhalb einer Session. Nach dem Warm-up absolvieren die Athleten ein strukturiertes Workout und führen anschließend ein zweites Workout mit einem anderen Fokus oder Stimulus durch.
                </p>
                <p className="text-gray-300 mb-2">Die zwei Workouts können variieren in:</p>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Intensität (z. B. kurz/hohe Intensität + längerer aerober Teil)</li>
                  <li>Bewegungsmustern (z. B. Barbell-fokussiert + Gymnastics-fokussiert)</li>
                  <li>Energiesystemen (anaerob + aerob)</li>
                </ul>
                <p className="text-gray-300 mb-4">
                  Dieses Format erzeugt hohe Trainingsdichte und fordert die Erholung zwischen den Einheiten heraus. Double Workouts sind besonders effektiv in Partner- oder Team-Settings, wo Rotationssysteme, synchrone Elemente und gleichmäßiges Rep-Sharing Fairness und korrekten Trainingsreiz sicherstellen.
                </p>
                <p className="text-gray-300 mb-1"><span className="font-semibold text-pure-white">Purpose:</span> Work Capacity, Anpassungsfähigkeit und die Fähigkeit entwickeln, mehrere Anstrengungen in einer Session zu leisten.</p>
                <p className="text-gray-300"><span className="font-semibold text-pure-white">Best suited for:</span> Fortgeschrittene Athleten, Wettkampfvorbereitung und High-Performance-Trainingsumgebungen.</p>
              </Card>
            </section>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
