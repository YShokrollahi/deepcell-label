import quickselect from 'quickselect';
import { assign, Machine, sendParent } from 'xstate';

function fetchRaw(context) {
  const { projectId, channel, loadingFrame: frame } = context;
  return fetch(`/api/raw/${projectId}/${channel}/${frame}`).then((res) => res.json());
}

const createChannelMachine = (projectId, channel, numFrames) =>
  Machine(
    {
      id: `channel${channel}`,
      context: {
        projectId,
        channel,
        numFrames,
        frame: 0,
        loadingFrame: null,
        frames: {},
        rawArray: null,
        // layer settings for grayscale mode
        invert: false,
        range: [0, 255],
        brightness: 0,
        contrast: 0,
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            PRELOAD: {
              cond: 'canPreload',
              target: 'loading',
              actions: 'loadNextFrame',
            },
          },
        },
        checkLoaded: {
          always: [
            { cond: 'loadedFrame', target: 'idle', actions: 'sendRawLoaded' },
            { target: 'loading' },
          ],
        },
        loading: {
          invoke: {
            src: fetchRaw,
            onDone: { target: 'idle', actions: ['saveFrame', 'sendRawLoaded'] },
            onError: {
              target: 'idle',
              actions: (context, event) => console.log(event),
            },
          },
        },
      },
      on: {
        // fetching
        LOAD_FRAME: {
          target: 'checkLoaded',
          actions: assign({ loadingFrame: (_, { frame }) => frame }),
        },
        FRAME: { actions: 'useFrame' },
        TOGGLE_INVERT: { actions: 'toggleInvert' },
        SET_RANGE: { actions: 'setRange' },
        SET_BRIGHTNESS: { actions: 'setBrightness' },
        SET_CONTRAST: { actions: 'setContrast' },
        RESET: { actions: 'reset' },
      },
    },
    {
      guards: {
        loadedFrame: ({ frames, loadingFrame }) => loadingFrame in frames,
        canPreload: ({ frames, numFrames }) => Object.keys(frames).length !== numFrames,
      },
      actions: {
        // fetching
        sendRawLoaded: sendParent(({ loadingFrame, channel }) => ({
          type: 'CHANNEL_LOADED',
          frame: loadingFrame,
          channel,
        })),
        saveFrame: assign({
          frames: ({ frames, loadingFrame }, { data }) => ({
            ...frames,
            [loadingFrame]: data,
          }),
        }),
        useFrame: assign({
          frame: (_, { frame }) => frame,
          rawArray: ({ frames }, { frame }) => frames[frame],
        }),
        loadNextFrame: assign({
          loadingFrame: ({ numFrames, frame, frames }) => {
            const allFrames = [...Array(numFrames).keys()];
            return (
              allFrames
                // remove loaded frames
                .filter((frame) => !(frame in frames))
                // load the closest unloaded frame to the current frame
                .reduce((prev, curr) =>
                  Math.abs(curr - frame) < Math.abs(prev - frame) ? curr : prev
                )
            );
          },
        }),
        toggleInvert: assign({ invert: ({ invert }) => !invert }),
        setRange: assign({
          range: (_, { range }) => [
            Math.max(0, Math.min(255, range[0])),
            Math.max(0, Math.min(255, range[1])),
          ],
        }),
        setBrightness: assign({
          brightness: (_, { brightness }) => Math.max(-1, Math.min(1, brightness)),
        }),
        setContrast: assign({
          contrast: (_, { contrast }) => Math.max(-1, Math.min(1, contrast)),
        }),
        reset: assign({
          range: [0, 255],
          brightness: 0,
          contrast: 0,
        }),
        setAutoRange: assign({
          range: ({ rawArray }) => {
            // modified from https://github.com/hms-dbmi/viv
            if (rawArray === null) return [0, 255];
            // ignore the background
            const array = rawArray.filter((v) => v > 0);
            const cutoffPercentile = 0.01;
            const topCutoffLocation = Math.floor(array.length * (1 - cutoffPercentile));
            const bottomCutoffLocation = Math.floor(array.length * cutoffPercentile);
            quickselect(array, topCutoffLocation);
            quickselect(array, bottomCutoffLocation, 0, topCutoffLocation);
            return [array[bottomCutoffLocation] || 0, array[topCutoffLocation] || 255];
          },
        }),
      },
    }
  );

export default createChannelMachine;
