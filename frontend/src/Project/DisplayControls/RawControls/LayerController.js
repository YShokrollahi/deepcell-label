/** Modified from https://github.com/hms-dbmi/viv */
import { MenuItem, TextField } from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import Slider from '@mui/material/Slider';
import { useSelector } from '@xstate/react';
import { useMousetrapRef, useRaw } from '../../ProjectContext';
import LayerOptions from './LayerOptions';

function LayerSelector({ layer }) {
  const channel = useSelector(layer, (state) => state.context.channel);

  const raw = useRaw();
  const names = useSelector(raw, (state) => state.context.channelNames);

  const onChange = (e) => {
    layer.send({ type: 'SET_CHANNEL', channel: Number(e.target.value) });
  };

  return (
    <TextField select size='small' value={channel} onChange={onChange}>
      {names.map((opt, index) => (
        <MenuItem key={index} value={index}>
          {opt}
        </MenuItem>
      ))}
    </TextField>
  );
}

function LayerCheckbox({ layer }) {
  const color = useSelector(layer, (state) => {
    const { color } = state.context;
    return color === '#FFFFFF' ? '#000000' : color;
  });
  const isOn = useSelector(layer, (state) => state.context.on);

  return (
    <Checkbox
      onChange={() => layer.send('TOGGLE_ON')}
      checked={isOn}
      sx={{
        color: color,
        '&.Mui-checked': {
          color: color,
        },
        p: 0,
      }}
    />
  );
}

function LayerSlider({ layer }) {
  const range = useSelector(layer, (state) => state.context.range);
  const color = useSelector(layer, (state) => {
    const { color } = state.context;
    return color === '#FFFFFF' ? '#000000' : color;
  });
  const inputRef = useMousetrapRef();

  const onChange = (_, value) => layer.send({ type: 'SET_RANGE', range: value });
  const onDoubleClick = () => layer.send({ type: 'SET_RANGE', range: [0, 255] });

  return (
    <Slider
      value={range}
      onChange={onChange}
      onDoubleClick={onDoubleClick}
      valueLabelDisplay='off'
      min={0}
      max={255}
      step={1}
      orientation='horizontal'
      sx={{ color: color, p: 0 }}
      componentsProps={{ input: { ref: inputRef } }}
    />
  );
}

function LayerController({ layer }) {
  const raw = useRaw();
  const numChannels = useSelector(raw, (state) => state.context.numChannels);

  return (
    <Grid container direction='column' justifyContent='center'>
      {numChannels > 1 && (
        <>
          <Grid container direction='row'>
            <Grid item xs={12}>
              {numChannels > 1 && <LayerSelector layer={layer} />}
            </Grid>
          </Grid>
        </>
      )}
      <Grid container direction='row' alignItems='center'>
        <Grid item xs={3}>
          <LayerCheckbox layer={layer} />
        </Grid>
        <Grid container item xs={6} alignItems='center'>
          <LayerSlider layer={layer} />
        </Grid>
        <Grid container item xs={3} justifyContent='right'>
          <LayerOptions layer={layer} />
        </Grid>
      </Grid>
    </Grid>
  );
}

export default LayerController;