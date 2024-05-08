import { Router } from 'express';
import { authorizationMiddleware } from '../middlewares.js';
import { ADDRESSES, ORDERS } from '../db.js';
// const geolib = require('geolib');
import geolib from 'geolib'

export const OrdersRouter = Router();



const convertToDate = (date) => {

 /***
  * ^ -- початок рядка
  * \d -- перевірка на цифру
  * {N} -- N - разів повторень
  */
 // if (/^\d\d-(01|02|03|....|10|11|12)-\d{4}$/.test(query.createdAt)) { }
 if (!/^\d\d-\d\d-\d{4}$/.test(date)) {
  // return res.status(400).send({ message: `parameter createdAt has wrong format` });
  throw new Error(`parameter createdAt has wrong format`);
 }

 // const res = query.createdAt.split('-');
 // const month = res[1];
 const [day, month, year] = date.split('-');

 const mothsInt = parseInt(month);
 if (mothsInt < 1 || mothsInt > 12) {
  // return res.status(400).send({ message: `parameter createdAt has wrong month value` });

  throw new Error(`parameter createdAt has wrong month value`);
 }

 const result = new Date();
 result.setHours(2);
 result.setMinutes(0);
 result.setMilliseconds(0);
 result.setSeconds(0);
 result.setMonth(mothsInt - 1);
 result.setDate(day);
 result.setFullYear(year);

 return result;
};

const convertToDateMiddleware = (fieldName) => (req, res, next) => {
  const valueString = req.query[fieldName];
  if (!valueString) {
    return next();
  }
  try {
    const value = convertToDate(valueString);
    req.query[fieldName] = value;
    next();
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
};

OrdersRouter.post('/orders', authorizationMiddleware, async (req, res) => {
  const { from, to, type } = req.body;
  const fromExist = ADDRESSES.find(el => el.name === from);
  const toExist = ADDRESSES.find(el => el.name === to);

  if (!fromExist || !toExist) {
    return res.status(400).send({ message: 'One or both address names are not found in the addresses list' });
  }

  const fromCoords = { latitude: fromExist.location.latitude, longitude: fromExist.location.longitude };
  const toCoords = { latitude: toExist.location.latitude, longitude: toExist.location.longitude };
  const distanceInMeters = geolib.getDistance(fromCoords, toCoords);
  const distanceInKilometers = distanceInMeters / 1000;

  let price;
  switch (type) {
    case 'standard':
      price = distanceInKilometers * 2.5;
      break;
    case 'lite':
      price = distanceInKilometers * 1.5;
      break;
    case 'universal':
      price = distanceInKilometers * 3;
      break;
    default:
      return res.status(400).send({ message: `Invalid type provided: ${type}` });
  }

  const order = {
    ...req.body,
    login: req.user.login,
    createdAt: new Date(),
    status: 'Active',
    id: crypto.randomUUID(),
    distance: distanceInKilometers,
    price: price
  };

  ORDERS.push(order);
  res.status(200).send({ message: 'Order was created', order });
});


//5
OrdersRouter.get('/orders', authorizationMiddleware, convertToDateMiddleware('createdAt'), convertToDateMiddleware('createdFrom'), convertToDateMiddleware('createdTo'), (req, res) => {
  const { user } = req;
  let orders = ORDERS.filter(order => order.login === user.login);
  if (user.role === 'Driver') {
    orders = ORDERS.filter(order => order.status === 'Active');
  } else if (user.role === 'Admin') {
    orders = ORDERS; 
  }
  res.status(200).send(orders);
});



OrdersRouter.patch('/orders/:orderId', authorizationMiddleware, (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const order = ORDERS.find(el => el.id === orderId);

  if (!order) {
    return res.status(404).send({ message: `Order with id ${orderId} was not found` });
  }


  if (order.status === 'Done') {
    return res.status(400).send({ message: 'Changing the status from "Done" to any other is prohibited' });
  }

  const { role } = req.user;

  try {
    switch (role) {
      case 'Customer':
      
        if (order.status === 'Active' && status === 'Rejected') {
          order.status = status;
        } else {
          return res.status(403).send({ message: 'Status change not allowed for Customer role' });
        }
        break;

      case 'Driver':
        
        if ((order.status === 'Active' && status === 'In progress') ||
            (order.status === 'In progress' && status === 'Done')) {
          order.status = status;
        } else {
          return res.status(403).send({ message: 'Status change not allowed for Driver role' });
        }
        break;

      case 'Admin':
        
        if ((order.status === 'Active' && (status === 'Rejected' || status === 'In progress')) ||
            (order.status === 'In progress' && status === 'Done')) {
          order.status = status;
          
        } else {
          return res.status(403).send({ message: 'Status change not allowed for Admin role' });
        }
        break;

      default:

        return res.status(403).send({ message: 'Unauthorized role' });
    }


    res.status(200).send(order);
  } catch (error) {
    console.error('Error updating order status', error);
    res.status(500).send({ message: 'Internal server error' });
  }
});