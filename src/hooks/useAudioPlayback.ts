import { useEffect, useState } from '../lib/teact/teact';

import type { PlaybackCapabilities, PlaybackMediaType } from '../types';
import type { TrackKey } from '../util/audioPlayback/mediaPool';

import {
  acquire, onElementDestroy, peek, release,
} from '../util/audioPlayback/mediaPool';
import * as playbackController from '../util/audioPlayback/playbackController';
import { isSafariPatchInProgress } from '../util/patchSafariProgressiveAudio';
import useEffectWithPrevDeps from './useEffectWithPrevDeps';
import useLastCallback from './useLastCallback';

type OwnArgs = {
  trackKey?: TrackKey;
  mediaType: PlaybackMediaType;
  capabilities: PlaybackCapabilities;
  src?: string;
  originalDuration: number;
  metadata?: MediaMetadata;
  shouldPlay?: boolean;
  noProgressUpdates?: boolean;
  onTrackChange?: NoneToVoidFunction;
  onPause?: NoneToVoidFunction;
};

const EVENTS = ['play', 'pause', 'timeupdate', 'seeking', 'seeked', 'loadedmetadata', 'ended'] as const;

export default function useAudioPlayback({
  trackKey,
  mediaType,
  capabilities,
  src,
  originalDuration,
  metadata,
  shouldPlay,
  noProgressUpdates,
  onTrackChange,
  onPause,
}: OwnArgs) {
  const [isPlaying, setIsPlaying] = useState(() => (
    Boolean(trackKey) && playbackController.isTrackAudiblyPlaying(trackKey)
  ));
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | undefined>(() => (
    trackKey ? peek(trackKey) : undefined
  ));
  const [playProgress, setPlayProgress] = useState(0);
  const [elementDuration, setElementDuration] = useState(0);
  const [isCurrent, setIsCurrent] = useState(() => (
    Boolean(trackKey) && playbackController.getState().trackKey === trackKey
  ));

  useEffect(() => {
    if (!trackKey) return undefined;

    setIsCurrent(playbackController.getState().trackKey === trackKey);
    return playbackController.subscribe((state) => {
      setIsCurrent(state.trackKey === trackKey);
    });
  }, [trackKey]);

  const duration = elementDuration || originalDuration;

  const handleElementEvent = useLastCallback((e: Event) => {
    const element = e.currentTarget as HTMLAudioElement;
    if (isSafariPatchInProgress(element)) return;

    switch (e.type) {
      case 'play':
        setIsPlaying(true);
        break;
      case 'pause':
        setIsPlaying(false);
        onPause?.();
        break;
      case 'loadedmetadata':
        setElementDuration(Number.isFinite(element.duration) ? element.duration : 0);
        break;
      case 'ended':
        setIsPlaying(false);
        break;
      case 'timeupdate':
      default: {
        if (noProgressUpdates) break;
        const currentDuration = Number.isFinite(element.duration) ? element.duration : originalDuration;
        if (currentDuration) setPlayProgress(element.currentTime / currentDuration);
        break;
      }
    }
  });

  useEffect(() => {
    if (!trackKey) return undefined;

    let element = acquire(trackKey);

    const attachToElement = () => {
      setAudioElement(element);
      setIsPlaying(!element.paused);
      setElementDuration(Number.isFinite(element.duration) ? element.duration : 0);
      EVENTS.forEach((event) => element.addEventListener(event, handleElementEvent));
    };
    const detachFromElement = () => {
      EVENTS.forEach((event) => element.removeEventListener(event, handleElementEvent));
    };

    attachToElement();

    const unsubscribeDestroy = onElementDestroy((destroyed) => {
      if (destroyed !== element) return;

      detachFromElement();
      const successor = peek(trackKey);
      if (!successor) return;

      element = successor;
      attachToElement();
    });

    return () => {
      unsubscribeDestroy();
      detachFromElement();
      release(trackKey);
    };
  }, [trackKey, handleElementEvent]);

  useEffectWithPrevDeps(([prevTrackKey]) => {
    if (prevTrackKey && prevTrackKey !== trackKey) {
      setPlayProgress(0);
      onTrackChange?.();
    }
  }, [trackKey, onTrackChange]);

  const play = useLastCallback(() => {
    if (!trackKey || !src) return;

    playbackController.playTrack(trackKey, src, {
      mediaType,
      duration: originalDuration,
      metadata,
      capabilities,
    });
  });

  const pause = useLastCallback(() => {
    if (!trackKey) return;

    if (playbackController.getState().trackKey === trackKey) {
      playbackController.pause();
    } else {
      peek(trackKey)?.pause();
    }
  });

  const playPause = useLastCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  });

  const setCurrentTime = useLastCallback((time: number) => {
    const element = trackKey ? peek(trackKey) : undefined;
    if (!element) return;

    if (element.fastSeek) {
      element.fastSeek(time);
    } else {
      element.currentTime = time;
    }

    if (duration) setPlayProgress(element.currentTime / duration);
  });

  useEffectWithPrevDeps(([prevShouldPlay, prevSrc, prevTrackKey]) => {
    if (prevShouldPlay === shouldPlay && prevSrc === src && prevTrackKey === trackKey) return;
    if (!shouldPlay || !src || !trackKey) return;

    if (playbackController.isTrackAudiblyPlaying(trackKey)) return;

    const element = peek(trackKey);
    if (prevTrackKey === undefined && element?.src && element.paused) return;

    play();
  }, [shouldPlay, src, trackKey]);

  useEffect(() => {
    if (isPlaying && metadata) playbackController.refreshMediaSessionMetadata(metadata);
  }, [isPlaying, metadata]);

  return {
    isPlaying,
    isCurrent,
    playProgress,
    duration,
    audioElement,
    playPause,
    setCurrentTime,
    setVolume: playbackController.setVolume,
    toggleMuted: playbackController.toggleMuted,
    setPlaybackRate: playbackController.setPlaybackRate,
  };
}
