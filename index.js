import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import rewardsRouter from './routes/rewards.js';
import codesRouter from './routes/codes.js';
import redeemRouter from './routes/redeem.js';

const app = express();
app.use(cors());
app.use(express.json());
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/rewards', rewardsRouter);
app.use('/', codesRouter);
app.use('/redeem', redeemRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
