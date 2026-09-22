import { memo } from '../../lib/teact/teact';
import { getActions } from '../../global';

import type { ApiAudio } from '../../api/types';
import type { ThemeKey } from '../../types';

import { getMediaFormat, getMediaHash } from '../../global/helpers';
import { getPlaybackCapabilities } from '../../global/selectors/audioPlayer';
import { makeInstantViewTrackKey } from '../../util/audioPlayback/mediaPool';
import { prepareTrackSwitch } from '../../util/audioPlayback/playbackController';

import useLastCallback from '../../hooks/useLastCallback';
import useMedia from '../../hooks/useMedia';

import TrackRow from '../common/TrackRow';

type OwnProps = {
  audio: ApiAudio;
  webPageId: string;
  theme: ThemeKey;
  className?: string;
};

const IV_CAPABILITIES = getPlaybackCapabilities('instantView');

const InstantViewAudio = ({
  audio, webPageId, theme, className,
}: OwnProps) => {
  const { openAudioPlayer, setAudioPlaybackSource, downloadMedia } = getActions();

  const trackKey = makeInstantViewTrackKey(webPageId, audio.id);
  const mediaData = useMedia(getMediaHash(audio, 'inline'), false, getMediaFormat(audio, 'inline'));

  const handleBeforePlay = useLastCallback(() => {
    prepareTrackSwitch(trackKey);
    setAudioPlaybackSource({ source: { type: 'single' } });
    openAudioPlayer({ item: { type: 'instantView', webPageId, documentId: audio.id } });
  });

  const handleDownloadClick = useLastCallback(() => {
    downloadMedia({ media: audio });
  });

  return (
    <TrackRow
      theme={theme}
      variant="inline"
      className={className}
      audio={audio}
      trackKey={trackKey}
      mediaType="audio"
      capabilities={IV_CAPABILITIES}
      src={mediaData}
      originalDuration={audio.duration}
      canDownload
      onBeforePlay={handleBeforePlay}
      onDownloadClick={handleDownloadClick}
    />
  );
};

export default memo(InstantViewAudio);
