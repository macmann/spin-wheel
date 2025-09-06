import express from 'express';
import cors from 'cors';
import rewardsRouter from './routes/rewards.js';
import codesRouter from './routes/codes.js';
import redeemRouter from './routes/redeem.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/rewards', rewardsRouter);
app.use('/', codesRouter);
app.use('/redeem', redeemRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
