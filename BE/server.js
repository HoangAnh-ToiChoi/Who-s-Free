import app from './src/app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 ClubSync Backend đang chạy tại http://localhost:${PORT}`);
});