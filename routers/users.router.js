import express from 'express';
import { USERS } from '../db.js' 
import { bcrypt } from 'bcrypto';

export const UsersRouter = express();
 UsersRouter.post('/', async (req, res) => {
    const { body } = req;
  
    console.log(`body`, JSON.stringify(body));
  
    const isUserExist = USERS.some(el => el.login === body.login);
    if (isUserExist) {
      return res.status(400).send({ message: `user with login ${body.login} already exists` });
    }
  
    USERS.push(body);
  
    res.status(200).send({ message: 'User was created' });
   
  });

  
  UsersRouter.get('/', (req, res) => {
    const users = USERS.map(user => {
      const { password, ...other } = user;
      return other;
    });
    return res
      .status(200)
      .send(users);
  });
  

  UsersRouter.post('/login', (req, res) => {
    const { body } = req;
    const user = USERS
      .find(el => el.login === body.login && el.password === body.password);
  
    if (!user) {
      return res.status(400).send({ message: 'User was not found' });
    }
  
    const token = crypto.randomUUID();
  
    user.token = token;
    USERS.save(user.login, { token });
  
    return res.status(200).send({
      token,
      message: 'User was login'
    });
  });

//4a.
  UsersRouter.post('/register', async (req, res) => {
      const {login, password } = req.body;
      const hashedPassword = await bcrypto.hash(password, 10);

      const isUserExist = USER.some(user => user.login === login);
      if (isUserExist) {
        return res.status(400).send({message: `User woth login ${login} already exists`})
      }

      const newUser = {
        login,
        password: hashedPassword, 
        role: 'Customer'
      };
      USERS.push(newUser);
      res.status(201).send({message: 'Customer registered succesfully', user: newUser});
  });

//4b.
UsersRouter.post('/admin', async (req, res) =>{
  const { authorization } = req.headers //req.headers - це об'єкт, який містить усі заголовки HTTP, які були відправлені з клієнта до сервера
  const {login, password} = req.body

  if(authorization !== process.env.SUPER_PASSWORD) {
    return res.status(403).send({message: "Unauthorized"});
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    login,
    password: hashedPassword,
    role: 'Admin'
  };
  USERS.push(newUser);
  res.status(201).send({message: 'Admin created successfully', user: newUser});
});

//4c.
UsersRouter.post('/drivers', async (req, res) => {
  const {login, password} = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const isUserExist = USERS.some(user => user.login === login);
  if (isUserExist) {
    return res.status(400).send({message: `User with login ${login} already exists`});
  }
  
  const newUser = {
    login,
    password: hashedPassword,
    role: 'Driver'
  };
  USERS.push(newUser);
  res.status(201).send({message: 'Driver created successfuly', user: newUser});
})
