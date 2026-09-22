import { memo, useMemo } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { ApiAudio } from '../../api/types';
import type { ThemeKey } from '../../types';
import type { MenuItemContextAction } from '../ui/ListItem';
import { ApiMediaFormat } from '../../api/types';

import { getIsDownloading, getMediaFormat, getMediaHash } from '../../global/helpers';
import { selectActiveDownloads, selectTheme } from '../../global/selectors';
import { getPlaybackCapabilities } from '../../global/selectors/audioPlayer';
import { makeSavedMusicTrackKey } from '../../util/audioPlayback/mediaPool';
import * as playbackController from '../../util/audioPlayback/playbackController';

import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';
import useMedia from '../../hooks/useMedia';
import useMediaWithLoadProgress from '../../hooks/useMediaWithLoadProgress';

import TrackRow from './TrackRow';

type OwnProps = {
  audio: ApiAudio;
  peerId: string;
  className?: string;
  noProgress?: boolean;
  withPlayingRing?: boolean;
};

type StateProps = {
  theme: ThemeKey;
  isDownloading: boolean;
  isSaved?: boolean;
  isSavedMusicLoading?: boolean;
};

const SAVED_MUSIC_CAPABILITIES = getPlaybackCapabilities('savedMusic');

const ProfileMusic = ({
  audio,
  peerId,
  className,
  noProgress,
  withPlayingRing,
  theme,
  isDownloading,
  isSaved,
  isSavedMusicLoading,
}: OwnProps & StateProps) => {
  const {
    cancelMediaDownload, downloadMedia, toggleMusicInProfile, openAudioPlayer, openForwardMenu,
  } = getActions();

  const lang = useLang();

  const trackKey = makeSavedMusicTrackKey(peerId, audio.id);

  const coverBlobUrl = useMedia(getMediaHash(audio, 'pictogram'), false, ApiMediaFormat.BlobUrl);
  const mediaData = useMedia(getMediaHash(audio, 'inline'), false, getMediaFormat(audio, 'inline'));

  const { loadProgress: downloadProgress } = useMediaWithLoadProgress(
    getMediaHash(audio, 'download'),
    !isDownloading,
    getMediaFormat(audio, 'download'),
  );

  const handleBeforePlay = useLastCallback(() => {
    playbackController.prepareTrackSwitch(trackKey);
    openAudioPlayer({
      item: { type: 'savedMusic', peerId, audioId: audio.id },
      source: { type: 'savedMusic', peerId },
    });
  });

  const handleToggleInProfile = useLastCallback(() => {
    toggleMusicInProfile({ audio });
  });

  const handleDownloadClick = useLastCallback(() => {
    if (isDownloading) {
      cancelMediaDownload({ media: audio });
    } else {
      downloadMedia({ media: audio });
    }
  });

  const handleForward = useLastCallback(() => {
    openForwardMenu({ fromChatId: peerId, savedMusic: { peerId, audioId: audio.id } });
  });

  const contextActions = useMemo((): MenuItemContextAction[] => [{
    title: lang('Forward'),
    icon: 'forward',
    handler: handleForward,
  }, {
    title: isDownloading ? lang('ContextCancelDownload') : lang('MediaDownload'),
    icon: isDownloading ? 'stop' : 'download',
    handler: handleDownloadClick,
  }, {
    isSeparator: true,
  }, {
    title: lang(isSaved ? 'AudioRemoveFromProfile' : 'AudioAddToProfile'),
    icon: isSaved ? 'remove-music' : 'add-music',
    destructive: isSaved,
    handler: isSavedMusicLoading ? undefined : handleToggleInProfile,
  }], [lang, isDownloading, isSaved, isSavedMusicLoading]);

  return (
    <TrackRow
      theme={theme}
      variant="sharedMedia"
      className={className}
      audio={audio}
      trackKey={trackKey}
      mediaType="audio"
      capabilities={SAVED_MUSIC_CAPABILITIES}
      src={mediaData}
      originalDuration={audio.duration}
      coverBlobUrl={coverBlobUrl}
      noProgress={noProgress}
      withPlayingRing={withPlayingRing}
      isDownloading={isDownloading}
      canDownload
      downloadProgress={downloadProgress}
      contextActions={contextActions}
      onBeforePlay={handleBeforePlay}
      onDownloadClick={handleDownloadClick}
    />
  );
};

export default memo(withGlobal<OwnProps>(
  (global, { audio }): Complete<StateProps> => {
    return {
      theme: selectTheme(global),
      isDownloading: getIsDownloading(selectActiveDownloads(global), audio),
      isSaved: global.users.savedMusicById?.[audio.id],
      isSavedMusicLoading: global.users.isSavedMusicLoading,
    };
  },
)(ProfileMusic));
