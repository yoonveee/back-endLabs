import express from 'express';
import bodyParser from 'body-parser';
import { OrdersRouter, UsersRouter } from './routers/index.js';

const app = express();

app.use(bodyParser.json());
app.use('/orders', OrdersRouter);
app.use('/users', UsersRouter);
app.listen(8080, () => console.log('Server was started'));