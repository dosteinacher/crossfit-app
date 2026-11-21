/**
 * Casts a workout's board to a TV via the Presentation API (Chromecast-style
 * "cast" devices), falling back to opening the board in a new tab for
 * AirPlay / Screen Mirroring when no presentation display is available.
 */
export async function castToTv(workoutId: number): Promise<'presented' | 'opened'> {
  const boardUrl = new URL(`/workouts/${workoutId}/board?tv=1`, window.location.origin).toString();
  type PresentationRequestLike = { start: () => Promise<unknown> };
  type PresentationRequestFactory = new (urls: string[]) => PresentationRequestLike;
  const PresentationRequest = (window as Window & {
    PresentationRequest?: PresentationRequestFactory;
  }).PresentationRequest;

  if (PresentationRequest) {
    try {
      await new PresentationRequest([boardUrl]).start();
      return 'presented';
    } catch (error) {
      console.warn('Could not start TV presentation:', error);
    }
  }

  window.open(boardUrl, '_blank', 'noopener,noreferrer');
  return 'opened';
}
