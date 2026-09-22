import type {
  ApiAudio, ApiInstantViewPage, ApiPageBlock,
} from '../../api/types';

export function buildPageAudioById(page: ApiInstantViewPage): Record<string, ApiAudio> | undefined {
  let audioById: Record<string, ApiAudio> | undefined;

  const visit = (blocks: ApiPageBlock[]) => {
    blocks.forEach((block) => {
      if (block.type === 'audio') {
        audioById ??= {};
        audioById[block.audio.id] = block.audio;
      }
      if (block.type === 'cover') {
        visit([block.cover]);
      }
      if ('blocks' in block && Array.isArray(block.blocks)) {
        visit(block.blocks);
      }
      if (block.type === 'list' || block.type === 'orderedList') {
        block.items.forEach((item) => {
          if (item.type === 'blocks') visit(item.blocks);
        });
      }
    });
  };

  visit(page.blocks);

  return audioById;
}
