import { memo, useEffect, useRef } from '../../../lib/teact/teact';

import type { Signal } from '../../../util/signals';

import { requestMutation } from '../../../lib/fasterdom/fasterdom';
import { formatMediaDuration } from '../../../util/dates/oldDateFormat';

type OwnProps = {
  duration: number;
  className?: string;
  getProgress: Signal<number>;
};

const PlayerTime = ({ duration, className, getProgress }: OwnProps) => {
  const ref = useRef<HTMLSpanElement>();

  useEffect(() => {
    const applyTime = () => {
      const element = ref.current;
      if (!element) return;

      const progress = Math.min(Math.max(getProgress(), 0), 1);
      const text = formatMediaDuration(duration * progress, duration);
      requestMutation(() => {
        element.textContent = text;
      });
    };

    applyTime();

    return getProgress.subscribe(applyTime);
  }, [duration, getProgress]);

  return <span className={className} ref={ref} />;
};

export default memo(PlayerTime);
