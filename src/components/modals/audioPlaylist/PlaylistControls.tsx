import { memo } from '../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../global';

import type { ApiAudio, ApiMessage, ApiPeer } from '../../../api/types';
import type { OrderMode, RepeatMode, ThreadId,
} from '../../../types';
import { ApiMediaFormat } from '../../../api/types';

import {
  getIsDownloading, getMediaHash, getMessageContent, isMessageLocal,
} from '../../../global/helpers';
import { getPeerTitle } from '../../../global/helpers/peers';
import {
  selectActiveDownloads, selectChatMessage, selectIsChatProtected, selectSender, selectTabState,
} from '../../../global/selectors';
import {
  selectCanGoNext, selectCanGoPrev, selectCurrentSavedMusicAudio, selectPlaybackSource,
} from '../../../global/selectors/audioPlayer';
import { getProgressSignal } from '../../../util/audioPlayback/playbackController';
import buildClassName from '../../../util/buildClassName';
import { formatMediaDuration } from '../../../util/dates/oldDateFormat';
import { getOrderButtonIcon, ORDER_BUTTON_ICONS } from '../../common/helpers/playbackOrder';
import renderText from '../../common/helpers/renderText';

import useLang from '../../../hooks/useLang';
import useLastCallback from '../../../hooks/useLastCallback';
import useMedia from '../../../hooks/useMedia';
import useOldLang from '../../../hooks/useOldLang';

import Icon from '../../common/icons/Icon';
import PlayPauseIcon from '../../common/PlayPauseIcon';
import Island from '../../gili/layout/Island';
import PlayerSeekLine from '../../middle/panes/PlayerSeekLine';
import PlayerTime from '../../middle/panes/PlayerTime';
import Button from '../../ui/Button';
import DropdownMenu from '../../ui/DropdownMenu';
import MenuItem from '../../ui/MenuItem';
import MenuSeparator from '../../ui/MenuSeparator';
import Transition from '../../ui/Transition';

import styles from './AudioPlaylistModal.module.scss';

type OwnProps = {
  isPlaying: boolean;
  duration: number;
  onPlayPause: NoneToVoidFunction;
  onSeek: (time: number) => void;
};

type StateProps = {
  message?: ApiMessage;
  audio?: ApiAudio;
  sender?: ApiPeer;
  repeatMode: RepeatMode;
  orderMode: OrderMode;
  canGoNext: boolean;
  canGoPrev: boolean;
  savedMusicById?: Record<string, true>;
  isSavedMusicLoading?: boolean;
  isDownloading?: boolean;
  isChatProtected?: boolean;
  savedMusicPeerId?: string;
  threadId?: ThreadId;
};

const PlaylistControls = ({
  isPlaying,
  duration,
  message,
  audio,
  sender,
  repeatMode,
  orderMode,
  canGoNext,
  canGoPrev,
  savedMusicById,
  isSavedMusicLoading,
  isDownloading,
  isChatProtected,
  savedMusicPeerId,
  threadId,
  onPlayPause,
  onSeek,
}: OwnProps & StateProps) => {
  const {
    playNextTrack,
    playPreviousTrack,
    setAudioPlayerRepeatMode,
    setAudioPlayerOrderMode,
    toggleMusicInProfile,
    focusMessage,
    openForwardMenu,
    downloadMedia,
    cancelMediaDownload,
    closeAudioPlaylistModal,
  } = getActions();

  const lang = useLang();
  const oldLang = useOldLang();

  const { voice, video } = message ? getMessageContent(message) : {};
  const coverBlobUrl = useMedia(audio && getMediaHash(audio, 'pictogram'), false, ApiMediaFormat.BlobUrl);

  const isMusicSaved = Boolean(audio && savedMusicById?.[audio.id]);
  const canSaveToProfile = Boolean(audio && (!message || !isMessageLocal(message)) && savedMusicById);
  const canShareTrack = Boolean(
    audio && message && !isMessageLocal(message) && !isChatProtected && !message.isProtected,
  );
  const canDownload = Boolean(audio) && (!message || canShareTrack);
  const canForward = canShareTrack || Boolean(savedMusicPeerId && audio);

  const title = audio ? (audio.title || audio.fileName) : (sender && getPeerTitle(oldLang, sender));
  const subtitle = audio?.performer;

  const orderIcon = getOrderButtonIcon(orderMode, repeatMode);
  const totalDuration = duration || audio?.duration || 0;

  const handlePlayNext = useLastCallback(() => playNextTrack({}));
  const handlePlayPrevious = useLastCallback(() => playPreviousTrack());

  const handleRepeatListClick = useLastCallback(() => {
    setAudioPlayerRepeatMode({ repeatMode: repeatMode === 'all' ? 'none' : 'all' });
  });

  const handleRepeatSongClick = useLastCallback(() => {
    setAudioPlayerRepeatMode({ repeatMode: repeatMode === 'one' ? 'none' : 'one' });
  });

  const handleShowInChat = useLastCallback(() => {
    closeAudioPlaylistModal();
    focusMessage({ chatId: message!.chatId, threadId, messageId: message!.id });
  });

  const handleForward = useLastCallback(() => {
    closeAudioPlaylistModal();
    if (message) {
      openForwardMenu({ fromChatId: message.chatId, messageIds: [message.id] });
      return;
    }

    openForwardMenu({
      fromChatId: savedMusicPeerId!,
      savedMusic: { peerId: savedMusicPeerId!, audioId: audio!.id },
    });
  });

  const handleDownload = useLastCallback(() => {
    if (isDownloading) {
      cancelMediaDownload({ media: audio! });
    } else {
      downloadMedia({ media: audio!, originMessage: message });
    }
  });

  const handleShuffleClick = useLastCallback(() => {
    setAudioPlayerOrderMode({ orderMode: orderMode === 'shuffle' ? 'default' : 'shuffle' });
  });

  const handleReverseClick = useLastCallback(() => {
    setAudioPlayerOrderMode({ orderMode: orderMode === 'reverse' ? 'default' : 'reverse' });
  });

  const handleToggleMusicInProfile = useLastCallback(() => {
    toggleMusicInProfile({ audio: audio! });
  });

  const OrderButton = useLastCallback(({ onTrigger, isOpen }: { onTrigger: () => void; isOpen?: boolean }) => (
    <Button
      round
      color="translucent"
      className={buildClassName(
        styles.sideButton,
        (orderMode !== 'default' || repeatMode !== 'none' || isOpen) && styles.sideButtonActive,
      )}
      ariaLabel={lang('AudioPlaybackOrder')}
      onClick={onTrigger}
    >
      <Transition
        name="fade"
        activeKey={ORDER_BUTTON_ICONS.indexOf(orderIcon)}
        slideClassName={styles.orderIconSlide}
        shouldCleanup
      >
        <Icon name={orderIcon} />
      </Transition>
    </Button>
  ));

  const MoreButton = useLastCallback(({ onTrigger, isOpen }: { onTrigger: () => void; isOpen?: boolean }) => (
    <Button
      round
      color="translucent"
      className={buildClassName(styles.sideButton, isOpen && styles.sideButtonActive)}
      ariaLabel={lang('AccDescrMoreOptions')}
      iconName="more"
      onClick={onTrigger}
    />
  ));

  if (!(audio || voice || video)) {
    return undefined;
  }

  return (
    <>
      <Island className={styles.controls}>
        <div className={styles.nowPlaying}>
          <div className={styles.nowPlayingCover}>
            {coverBlobUrl ? (
              <img src={coverBlobUrl} alt="" className={styles.trackCoverImage} draggable={false} />
            ) : (
              <Icon name="music-note" className={styles.trackCoverIcon} />
            )}
          </div>
          <div className={styles.nowPlayingInfo}>
            <div className={styles.nowPlayingTitle} dir="auto">{renderText(title || lang('AttachAudio'))}</div>
            {subtitle && <div className={styles.nowPlayingSubtitle} dir="auto">{renderText(subtitle)}</div>}
          </div>
        </div>

        <div className={styles.seekWrapper}>
          <PlayerSeekLine
            duration={totalDuration}
            withThumb
            isCentered
            getProgress={getProgressSignal()}
            onSeek={onSeek}
          />
        </div>

        <div className={styles.times}>
          <PlayerTime duration={totalDuration} getProgress={getProgressSignal()} />
          <span>{formatMediaDuration(totalDuration)}</span>
        </div>

        <div className={styles.buttonsRow}>
          <DropdownMenu
            className={buildClassName(styles.orderMenu, 'with-menu-transitions')}
            positionX="left"
            positionY="bottom"
            trigger={OrderButton}
          >
            <MenuItem
              icon="shuffle"
              className={orderMode === 'shuffle' ? styles.menuItemSelected : undefined}
              onClick={handleShuffleClick}
            >
              {lang('AudioShuffleList')}
            </MenuItem>
            <MenuItem
              icon="order"
              className={orderMode === 'reverse' ? styles.menuItemSelected : undefined}
              onClick={handleReverseClick}
            >
              {lang('AudioReverseOrder')}
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              icon="repeat"
              className={repeatMode === 'all' ? styles.menuItemSelected : undefined}
              onClick={handleRepeatListClick}
            >
              {lang('AudioRepeatList')}
            </MenuItem>
            <MenuItem
              icon="repeat-one"
              className={repeatMode === 'one' ? styles.menuItemSelected : undefined}
              onClick={handleRepeatSongClick}
            >
              {lang('AudioRepeatSong')}
            </MenuItem>
          </DropdownMenu>

          <Button
            round
            color="translucent"
            className={styles.transportButton}
            disabled={!canGoPrev}
            onClick={handlePlayPrevious}
            ariaLabel={lang('AudioPlayerPrevious')}
            iconName="skip-previous"
          />
          <Button
            round
            color="translucent"
            className={buildClassName(styles.transportButton, styles.playButton)}
            onClick={onPlayPause}
            ariaLabel={lang(isPlaying ? 'AudioPause' : 'AudioPlay')}
          >
            <PlayPauseIcon isPlaying={isPlaying} />
          </Button>
          <Button
            round
            color="translucent"
            className={styles.transportButton}
            disabled={!canGoNext}
            onClick={handlePlayNext}
            ariaLabel={lang('AudioPlayerNext')}
            iconName="skip-next"
          />

          <DropdownMenu
            className={buildClassName(styles.orderMenu, 'with-menu-transitions')}
            positionX="right"
            positionY="bottom"
            trigger={MoreButton}
          >
            {message && (
              <MenuItem icon="eye-outline" onClick={handleShowInChat}>
                {lang('AudioShowInChat')}
              </MenuItem>
            )}
            {canForward && (
              <MenuItem icon="forward" onClick={handleForward}>
                {lang('Forward')}
              </MenuItem>
            )}
            {canDownload && (
              <MenuItem icon="download" onClick={handleDownload}>
                {lang(isDownloading ? 'ContextCancelDownload' : 'MediaDownload')}
              </MenuItem>
            )}
          </DropdownMenu>
        </div>

      </Island>
      {canSaveToProfile && (
        <Button
          className={styles.profileButton}
          disabled={isSavedMusicLoading}
          onClick={handleToggleMusicInProfile}
        >
          <Transition
            name="fade"
            activeKey={isMusicSaved ? 1 : 0}
            slideClassName={styles.profileButtonSlide}
            shouldCleanup
          >
            {!isMusicSaved && <Icon name="profile-music" className={styles.profileButtonIcon} />}
            {lang(isMusicSaved ? 'AudioRemoveFromProfile' : 'AudioAddToProfile')}
          </Transition>
        </Button>
      )}
    </>
  );
};

export default memo(withGlobal<OwnProps>(
  (global): Complete<StateProps> => {
    const { activeItem } = selectTabState(global).audioPlayer;
    const message = activeItem?.type === 'message'
      ? selectChatMessage(global, activeItem.chatId, activeItem.messageId) : undefined;
    const audio = message ? getMessageContent(message).audio : selectCurrentSavedMusicAudio(global);
    const source = selectPlaybackSource(global);

    return {
      message,
      audio,
      sender: message && selectSender(global, message),
      repeatMode: global.audioPlayer.repeatMode,
      orderMode: global.audioPlayer.orderMode,
      canGoNext: selectCanGoNext(global),
      canGoPrev: selectCanGoPrev(global),
      savedMusicById: global.users.savedMusicById,
      isSavedMusicLoading: global.users.isSavedMusicLoading,
      isDownloading: audio && getIsDownloading(selectActiveDownloads(global), audio),
      isChatProtected: message && selectIsChatProtected(global, message.chatId),
      savedMusicPeerId: source?.type === 'savedMusic' ? source.peerId : undefined,
      threadId: source?.type === 'chat' ? source.threadId : undefined,
    };
  },
)(PlaylistControls));
