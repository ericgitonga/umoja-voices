/**
 * Common shape a caller needs to coordinate playback (#41) and drive Play
 * All / Loop's auto-advance sequence (#84) across native <audio>/<video>
 * elements and iframe-embedded players (YouTube/SoundCloud, #86) alike.
 * HTMLMediaElement already has play()/pause(), so it satisfies this
 * structurally with no wrapping needed.
 */
export interface Pausable {
  pause(): void;
}

export interface PlayableHandle extends Pausable {
  play(): void;
}
