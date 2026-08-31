import * as ffmpeg from 'fluent-ffmpeg';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegPath = require('ffmpeg-static') as string;

// Fija el binario de ffmpeg (Nixpacks no trae ffmpeg; usamos el de ffmpeg-static).
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

export { ffmpeg };
