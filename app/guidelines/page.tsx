'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Card, Loading } from '@/components/ui';

const SECTIONS = [
  { id: 'team-guidelines', label: 'General & team' },
  { id: 'programming', label: 'Programming' },
  { id: 'standard-workout', label: 'Standard workout' },
  { id: 'long-workout', label: 'Long workout' },
  { id: 'skill-workout', label: 'Skill workout' },
  { id: 'double-workout', label: 'Double workout' },
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
    <>
      <Navbar />
      <div className="min-h-screen bg-pure-dark py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <h1 className="text-4xl font-bold text-pure-white mb-2">CrossFit Workout Formats</h1>
          <p className="text-gray-400 mb-8">Guidelines for training structure, team rules, programming, and session formats.</p>

          {/* Sub-navigation: horizontal scroll on mobile, sticky sidebar on desktop */}
          <div className="flex flex-col md:flex-row md:gap-8 md:items-start">
            <aside className="flex gap-2 mb-6 overflow-x-auto pb-2 md:overflow-visible md:flex-col md:mb-0 md:shrink-0 md:w-48 md:sticky md:top-24">
              {SECTIONS.map(({ id, label }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="shrink-0 px-4 py-2 rounded-lg border border-coastal-sky/50 text-pure-white hover:bg-coastal-sky/20 transition text-sm whitespace-nowrap md:whitespace-normal"
                >
                  {label}
                </a>
              ))}
            </aside>

            <div className="min-w-0 flex-1">
            {/* General & team guidelines */}
            <section id="team-guidelines" className="scroll-mt-24 mb-10">
              <Card className="bg-pure-gray border border-gray-700">
                <h2 className="text-2xl font-bold text-pure-green mb-4">General training structure & team guidelines</h2>
                <p className="text-gray-300 mb-4">
                  All workout formats can be performed in different training settings:
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Individual (1 person working alone)</li>
                  <li>Team of 2</li>
                  <li>Team of 3</li>
                  <li>Team of 4</li>
                  <li>Team of 5</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">General team rules</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>If reps are shared between athletes, the total number of repetitions must allow equal distribution (even number) so work can be divided fairly.</li>
                  <li>In team workouts, either only ONE athlete is resting at a time or no one is resting.</li>
                  <li>Work/rest structure must always be clearly defined to ensure fairness and correct stimulus.</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">Team of 2</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Can split reps evenly.</li>
                  <li>Can alternate in &ldquo;You go / I go&rdquo; style.</li>
                  <li>Can perform synchronized movements.</li>
                  <li>Both can work at the same time or alternate effort.</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">Team of 3</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Either all three work continuously (shared reps), or only ONE athlete rests at a time.</li>
                  <li>Two athletes may perform synchronized work while the third is on a bike, rower, or another station.</li>
                  <li>Rotations must ensure balanced workload distribution.</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">Team of 4</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>All four can work together (e.g. synchronized or shared reps).</li>
                  <li>Only ONE athlete rests at a time if rest is included.</li>
                  <li>The team can also be structured as two teams of two within the same workout.</li>
                  <li>Rotational systems must ensure fairness and equal stimulus.</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">Team of 5</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Only ONE athlete rests at a time or no one rests.</li>
                  <li>Rotations must be clearly structured to avoid excessive passive rest.</li>
                  <li>Shared reps must still allow equal distribution when required.</li>
                </ul>

                <p className="text-gray-300 mt-4">
                  The chosen team structure changes intensity, pacing strategy, rest distribution, and overall stimulus of the workout.
                </p>
              </Card>
            </section>

            {/* Programming guidelines */}
            <section id="programming" className="scroll-mt-24 mb-10">
              <Card className="bg-pure-gray border border-gray-700">
                <h2 className="text-2xl font-bold text-pure-green mb-4">Programming guidelines (for coaches & session creation)</h2>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">1. Time management</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Respect the exact 60-minute structure.</li>
                  <li>Ensure smooth transitions between segments.</li>
                  <li>Strength and skill parts must fit realistically into their time window.</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">2. Movement balance</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Balance push and pull movements.</li>
                  <li>Balance upper and lower body.</li>
                  <li>Avoid excessive fatigue of one muscle group before high-skill or heavy lifts.</li>
                  <li>Consider posterior/anterior chain balance.</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">3. Energy system planning</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Short time domains = anaerobic focus.</li>
                  <li>Long time domains = aerobic capacity focus.</li>
                  <li>Double workouts should combine different stimuli (e.g. sprint + endurance).</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">4. Safety & fatigue management</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Avoid unsafe combinations (e.g. heavy deadlifts directly into high-rep box jumps under extreme fatigue).</li>
                  <li>Technical lifts should not follow maximal exhaustion.</li>
                  <li>Skill sessions prioritize quality over intensity.</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">5. Scaling & inclusivity</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Every session must provide scaling options (Beginner / Intermediate / Advanced).</li>
                  <li>Adjust load, volume, and movement complexity.</li>
                  <li>Maintain intended stimulus across all levels.</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">6. Team programming standards</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Ensure equal rep distribution when sharing work.</li>
                  <li>Define clearly who rests and when.</li>
                  <li>Avoid excessive idle time for multiple athletes.</li>
                  <li>Maintain fairness and comparable workload between athletes.</li>
                </ul>

                <h3 className="text-lg font-semibold text-pure-white mt-6 mb-2">7. Stimulus clarity</h3>
                <p className="text-gray-300 mb-2">Each session should clearly define:</p>
                <ul className="list-disc list-inside text-gray-300 space-y-1">
                  <li>Intended intensity (moderate / high / sustained pace).</li>
                  <li>Pacing strategy (steady, negative split, interval-based).</li>
                  <li>Primary goal (strength gain, aerobic base, skill refinement, work capacity).</li>
                </ul>
              </Card>
            </section>

            {/* Standard workout */}
            <section id="standard-workout" className="scroll-mt-24 mb-10">
              <Card className="bg-pure-gray border border-gray-700">
                <h2 className="text-2xl font-bold text-pure-green mb-4">1. Standard workout (60 minutes)</h2>
                <h3 className="text-lg font-semibold text-pure-white mb-2">Structure</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>15 min Warm-up</li>
                  <li>15 min Strength</li>
                  <li>30 min Workout (WOD)</li>
                </ul>
                <h3 className="text-lg font-semibold text-pure-white mt-4 mb-2">Explanation</h3>
                <p className="text-gray-300 mb-4">
                  The Standard workout is the classic CrossFit class format. It combines strength development with conditioning in a balanced session. The first 15 minutes prepare the body through general warm-up, mobility, and movement-specific activation.
                </p>
                <p className="text-gray-300 mb-4">
                  The 15-minute strength portion focuses on controlled, progressive work such as squats, presses, deadlifts, or Olympic lifting variations. The goal is to build absolute strength, improve technique under load, and develop power.
                </p>
                <p className="text-gray-300 mb-4">
                  The final 30 minutes are dedicated to the Workout of the Day (WOD), typically a higher-intensity conditioning piece. This can be structured as AMRAP, For Time, EMOM, or intervals. This format works individually or in any team structure described above, respecting equal rep distribution and structured rest rules.
                </p>
                <p className="text-gray-300 mb-1"><span className="font-semibold text-pure-white">Purpose:</span> Balanced development of strength and conditioning in one session.</p>
                <p className="text-gray-300"><span className="font-semibold text-pure-white">Best suited for:</span> General CrossFit classes, mixed-level groups, and athletes who want complete, well-rounded training.</p>
              </Card>
            </section>

            {/* Long workout */}
            <section id="long-workout" className="scroll-mt-24 mb-10">
              <Card className="bg-pure-gray border border-gray-700">
                <h2 className="text-2xl font-bold text-pure-green mb-4">2. Long workout (60 minutes)</h2>
                <h3 className="text-lg font-semibold text-pure-white mb-2">Structure</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>15 min Warm-up</li>
                  <li>45 min Workout (WOD)</li>
                </ul>
                <h3 className="text-lg font-semibold text-pure-white mt-4 mb-2">Explanation</h3>
                <p className="text-gray-300 mb-4">
                  The Long Workout format prioritizes conditioning and endurance. After a thorough 15-minute warm-up, the majority of the session is dedicated to an extended workout.
                </p>
                <p className="text-gray-300 mb-2">The 45-minute WOD can be:</p>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>A long AMRAP</li>
                  <li>A chipper-style workout</li>
                  <li>Multiple long intervals</li>
                  <li>A high-volume endurance-focused session</li>
                </ul>
                <p className="text-gray-300 mb-4">
                  This format challenges aerobic capacity, muscular endurance, pacing strategy, and mental toughness. Intensity is typically moderate and sustainable rather than maximal sprint intensity. In team settings, longer workouts often include shared volume, rotating stations, synchronized elements, or relay-style structures while respecting the rule that only one athlete rests at a time (or none).
                </p>
                <p className="text-gray-300 mb-1"><span className="font-semibold text-pure-white">Purpose:</span> Develop endurance, stamina, and the ability to sustain effort over a longer time domain.</p>
                <p className="text-gray-300"><span className="font-semibold text-pure-white">Best suited for:</span> Athletes training for competitions, endurance goals, or those wanting a conditioning-focused day.</p>
              </Card>
            </section>

            {/* Skill workout */}
            <section id="skill-workout" className="scroll-mt-24 mb-10">
              <Card className="bg-pure-gray border border-gray-700">
                <h2 className="text-2xl font-bold text-pure-green mb-4">3. Skill workout (60 minutes)</h2>
                <h3 className="text-lg font-semibold text-pure-white mb-2">Structure</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>15 min Warm-up</li>
                  <li>30 min Skill practice</li>
                  <li>15 min Workout (WOD)</li>
                </ul>
                <h3 className="text-lg font-semibold text-pure-white mt-4 mb-2">Explanation</h3>
                <p className="text-gray-300 mb-4">
                  The Skill format emphasizes technical development. After warming up, 30 minutes are dedicated to practicing and refining specific skills such as: gymnastics (handstands, muscle-ups, pull-ups), Olympic lifting technique, advanced barbell cycling, double-unders, and complex movement patterns.
                </p>
                <p className="text-gray-300 mb-4">
                  The focus is on quality, control, and repetition rather than intensity. Athletes work at manageable loads or progressions to improve movement efficiency. The final 15-minute WOD is usually shorter and moderate in intensity, allowing athletes to apply the practiced skill under light fatigue. Skill sessions can also be performed in teams, especially for gymnastics progressions or barbell drills where partners provide feedback, spotting, synchronized drills, or structured rotation systems.
                </p>
                <p className="text-gray-300 mb-1"><span className="font-semibold text-pure-white">Purpose:</span> Improve technique, movement efficiency, and long-term athletic development.</p>
                <p className="text-gray-300"><span className="font-semibold text-pure-white">Best suited for:</span> Beginners building foundations, advanced athletes refining high-skill movements, and anyone needing technical improvement.</p>
              </Card>
            </section>

            {/* Double workout */}
            <section id="double-workout" className="scroll-mt-24 mb-10">
              <Card className="bg-pure-gray border border-gray-700">
                <h2 className="text-2xl font-bold text-pure-green mb-4">4. Double workout (60 minutes)</h2>
                <h3 className="text-lg font-semibold text-pure-white mb-2">Structure</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>15 min Warm-up</li>
                  <li>Workout 1: 20 min</li>
                  <li>Workout 2: 25 min</li>
                </ul>
                <h3 className="text-lg font-semibold text-pure-white mt-4 mb-2">Explanation</h3>
                <p className="text-gray-300 mb-4">
                  The Double Workout format includes two separate conditioning pieces within one session. After warming up, athletes complete one structured workout and then perform a second workout with a different focus or stimulus.
                </p>
                <p className="text-gray-300 mb-2">The two workouts can vary in:</p>
                <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                  <li>Intensity (e.g. short/high intensity + longer aerobic piece)</li>
                  <li>Movement patterns (e.g. barbell-focused + gymnastics-focused)</li>
                  <li>Energy systems (anaerobic + aerobic)</li>
                </ul>
                <p className="text-gray-300 mb-4">
                  This format creates high training density and challenges recovery between efforts. Double workouts are particularly effective in partner or team settings, where rotation systems, synchronized elements, and equal rep sharing ensure fairness and correct training stimulus.
                </p>
                <p className="text-gray-300 mb-1"><span className="font-semibold text-pure-white">Purpose:</span> Develop work capacity, adaptability, and the ability to perform multiple efforts in one session.</p>
                <p className="text-gray-300"><span className="font-semibold text-pure-white">Best suited for:</span> Intermediate to advanced athletes, competition preparation, and high-performance training environments.</p>
              </Card>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
